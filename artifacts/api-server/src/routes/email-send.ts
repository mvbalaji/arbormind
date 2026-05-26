import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { activitiesTable, emailTrackingTable } from "@workspace/db";
import { eq, sql, and, ilike } from "drizzle-orm";

const router: IRouter = Router();

// 1x1 transparent PNG (43 bytes)
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

interface AttachmentInput {
  filename?: string;
  contentType?: string;
  content?: string; // base64
}

interface SendBody {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  leadId?: number;
  contactId?: number;
  opportunityId?: number;
  accountId?: number;
  attachments?: AttachmentInput[];
}

// Decoded-size cap. Base64 in JSON expands by ~33%, so 18MB decoded ≈ 24MB on the wire,
// staying safely under the express.json({ limit: "25mb" }) cap in app.ts.
const MAX_ATTACH_TOTAL_BYTES = 18 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const BASE64_RE = /^[A-Za-z0-9+/]+=*$/;

interface SessionUser { id: number; email?: string; name?: string }

function getSessionUser(req: Request): SessionUser | null {
  const sess = req.session as unknown as { user?: SessionUser };
  return sess?.user ?? null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/* ============================================================
 * POST /api/email/send
 * Actually sends email via SMTP, logs activity, creates tracking row
 * ========================================================== */
router.post("/email/send", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { to, cc, subject, body, leadId, contactId, opportunityId, accountId, attachments } = req.body as SendBody;
  if (!to || !subject || !body) {
    res.status(400).json({ error: "to, subject, and body are required" });
    return;
  }

  // Validate + decode attachments (base64). Reject early on size/count to keep SMTP happy.
  const decodedAttachments: { filename: string; content: Buffer; contentType?: string }[] = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    if (attachments.length > MAX_ATTACHMENTS) {
      res.status(400).json({ error: `Too many attachments (max ${MAX_ATTACHMENTS}).` });
      return;
    }
    let total = 0;
    for (const a of attachments) {
      const filename = (a.filename || "").trim();
      const b64 = (a.content || "").trim();
      if (!filename || !b64) {
        res.status(400).json({ error: "Each attachment requires filename and content." });
        return;
      }
      // Strict base64 validation (Buffer.from(..,"base64") silently accepts garbage).
      const stripped = b64.replace(/\s+/g, "");
      if (!BASE64_RE.test(stripped) || stripped.length % 4 !== 0) {
        res.status(400).json({ error: `Invalid base64 content for ${filename}.` });
        return;
      }
      const buf = Buffer.from(stripped, "base64");
      if (buf.length === 0) {
        res.status(400).json({ error: `Empty attachment: ${filename}.` });
        return;
      }
      total += buf.length;
      if (total > MAX_ATTACH_TOTAL_BYTES) {
        res.status(413).json({ error: `Attachments exceed ${Math.round(MAX_ATTACH_TOTAL_BYTES / 1024 / 1024)}MB total.` });
        return;
      }
      decodedAttachments.push({
        filename,
        content: buf,
        contentType: typeof a.contentType === "string" && a.contentType ? a.contentType : undefined,
      });
    }
  }

  const host = process.env.SMTP_HOST || process.env.IMAP_HOST || "mail.spacemail.com";
  const port = Number(process.env.SMTP_PORT ?? 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromName = process.env.SMTP_FROM_NAME || "ArborMind CRM";

  if (!smtpUser || !smtpPass) {
    res.status(503).json({ error: "SMTP not configured (SMTP_USER / SMTP_PASS missing)" });
    return;
  }

  // Insert activity as "pending" first (so tracking can link to it), then only mark
  // "completed" after SMTP succeeds. On failure, mark "failed" so audit history is honest.
  const [activity] = await db.insert(activitiesTable).values({
    type: "email",
    subject,
    status: "pending",
    description: `To: ${to}${cc ? `\nCc: ${cc}` : ""}\n\n${body}`,
    leadId: leadId ?? null,
    contactId: contactId ?? null,
    opportunityId: opportunityId ?? null,
    accountId: accountId ?? null,
    assignedTo: user.id,
  }).returning();

  const token = crypto.randomBytes(16).toString("hex");
  await db.insert(emailTrackingTable).values({
    activityId: activity.id,
    token,
    toEmail: to,
    subject,
  });

  try {
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    const host_hdr = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    const trackingUrl = `${proto}://${host_hdr}/api/track/open/${token}.png`;
    const htmlBody =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">` +
      escapeHtml(body).replace(/\n/g, "<br>") +
      `</div>` +
      `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const info = await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to,
      cc: cc || undefined,
      subject,
      text: body,
      html: htmlBody,
      attachments: decodedAttachments.length > 0 ? decodedAttachments : undefined,
    });

    // Persist the RFC 5322 Message-ID so inbound replies (whose In-Reply-To header points
    // back to this value) can be threaded to the same activity instead of spawning a new
    // lead/opportunity. Strip angle brackets and lowercase the domain so the stored form
    // matches the canonical form produced by normalizeMessageId() on inbound, regardless
    // of whether the remote MTA wraps the ID in <> or not.
    const rawId = (info as { messageId?: string }).messageId ?? null;
    if (rawId) {
      const stripped = rawId.trim().replace(/^<+|>+$/g, "").trim();
      const at = stripped.lastIndexOf("@");
      const canonical = at === -1 ? stripped : stripped.slice(0, at + 1) + stripped.slice(at + 1).toLowerCase();
      if (canonical) {
        await db.update(emailTrackingTable)
          .set({ messageId: canonical })
          .where(eq(emailTrackingTable.token, token));
      }
    }

    await db.update(activitiesTable)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(activitiesTable.id, activity.id));

    // Close out any open "Reply to: …" follow-up tasks on the same record
    // whose subject matches this outbound — the rep has now actually replied,
    // so the SLA task should flip to completed automatically. Match is on the
    // normalised subject (strip Re:/Reply:/Email:/Fwd: prefixes) so an outbound
    // "Re: Quick intro" closes the task created for inbound "Reply: Quick intro".
    try {
      const coreSubject = subject.replace(/^\s*(re|reply|email|fwd|fw)\s*:\s*/i, "").trim();
      if (coreSubject) {
        const recordCond = leadId
          ? eq(activitiesTable.leadId, leadId)
          : opportunityId
            ? eq(activitiesTable.opportunityId, opportunityId)
            : contactId
              ? eq(activitiesTable.contactId, contactId)
              : accountId
                ? eq(activitiesTable.accountId, accountId)
                : null;
        if (recordCond) {
          await db.update(activitiesTable)
            .set({ status: "completed", completedAt: new Date() })
            .where(and(
              eq(activitiesTable.type, "task"),
              eq(activitiesTable.status, "pending"),
              recordCond,
              ilike(activitiesTable.subject, `Reply to:%${coreSubject}%`),
            ));
        }
      }
    } catch (closeErr) {
      console.warn("[email-send] failed to auto-close reply task:", closeErr);
    }

    // Auto-create a paired task so the sales rep's task list mirrors their
    // outbound email activity. Marked completed because the action (sending)
    // is already done — this leaves an audit trail without adding to the
    // rep's open-task count. Assigned to the sender on the same record
    // (lead / contact / opportunity / account) as the email.
    let taskId: number | null = null;
    try {
      const [task] = await db.insert(activitiesTable).values({
        type: "task",
        subject: `Sent email: ${subject}`,
        description: `Email sent to ${to}${cc ? ` (cc: ${cc})` : ""}`,
        status: "completed",
        completedAt: new Date(),
        leadId: leadId ?? null,
        contactId: contactId ?? null,
        opportunityId: opportunityId ?? null,
        accountId: accountId ?? null,
        assignedTo: user.id,
      }).returning({ id: activitiesTable.id });
      taskId = task?.id ?? null;
    } catch (taskErr) {
      // Task creation is non-critical — log and continue so the user still
      // sees the email succeed even if the bookkeeping insert hiccups.
      console.warn("[email-send] paired-task insert failed:", taskErr);
    }

    res.status(201).json({
      ok: true,
      activityId: activity.id,
      taskId,
      token,
      attachmentCount: decodedAttachments.length,
    });
  } catch (err) {
    req.log.error(err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    try {
      await db.update(activitiesTable)
        .set({ status: "failed", description: `[SEND FAILED: ${message}]\n\nTo: ${to}${cc ? `\nCc: ${cc}` : ""}\n\n${body}` })
        .where(eq(activitiesTable.id, activity.id));
    } catch (updErr) {
      req.log.error(updErr, "failed to mark activity as failed");
    }
    res.status(500).json({ error: message });
  }
});

/* ============================================================
 * GET /api/track/open/:token.png
 * Returns 1x1 PNG, records open. NO AUTH (called by email clients).
 * ========================================================== */
router.get("/track/open/:filename", async (req: Request, res: Response) => {
  const filename = req.params.filename;
  const token = filename.replace(/\.png$/i, "");

  // Always return the pixel — never break the email
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Content-Length", String(PIXEL_PNG.length));

  try {
    if (token && /^[a-f0-9]{16,64}$/i.test(token)) {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
      const ua = (req.headers["user-agent"] as string | undefined) || null;
      await db.update(emailTrackingTable)
        .set({
          openCount: sql`${emailTrackingTable.openCount} + 1`,
          openedAt: sql`coalesce(${emailTrackingTable.openedAt}, now())`,
          lastOpenedAt: new Date(),
          lastIp: ip,
          lastUserAgent: ua,
        })
        .where(eq(emailTrackingTable.token, token));
    }
  } catch (err) {
    req.log.error(err, "tracking pixel update failed");
  }
  res.end(PIXEL_PNG);
});

export default router;
