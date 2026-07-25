import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { activitiesTable, emailTrackingTable, emailAttachmentsTable } from "@workspace/db";
import { eq, sql, and, ilike } from "drizzle-orm";
import { generateEmailTaskTitle } from "../lib/ai-task-title";
import { getEmailSettingsRow, resolveSmtpConfig } from "../lib/smtp-config";

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

interface SessionUser { id: number; email?: string; name?: string; orgId?: number }

function getSessionUser(req: Request): SessionUser | null {
  const sess = req.session as unknown as { user?: SessionUser };
  if (sess?.user) return sess.user;
  // Dev bypass: when Google OAuth is not configured, return a synthetic admin user
  if (!process.env.GOOGLE_CLIENT_ID) {
    return { id: 0, email: "dev@crmai.local", name: "Dev Admin", role: "admin", orgId: 1 } as SessionUser;
  }
  return null;
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

  // Dry-run mode: compose the email and report what would be sent, without touching
  // SMTP or writing any activity/tracking rows. Lets admins sanity-check a send
  // (recipients, attachments) without needing SMTP configured or risking a real send.
  const dryRun = req.query.dryRun === "true" || (req.body as { dryRun?: boolean }).dryRun === true;

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

  if (dryRun) {
    res.json({
      ok: true,
      dryRun: true,
      to,
      cc: cc || null,
      subject,
      text: body,
      attachmentCount: decodedAttachments.length,
      attachments: decodedAttachments.map((a) => ({
        filename: a.filename,
        contentType: a.contentType ?? null,
        sizeBytes: a.content.length,
      })),
    });
    return;
  }

  // Prefer admin-configured DB credentials (Email Settings page), fall back to env vars.
  const emailSettings = await getEmailSettingsRow();
  const smtp = resolveSmtpConfig(emailSettings, { defaultFromName: "ArborMind CRM" });

  if (!smtp) {
    res.status(503).json({ error: "SMTP not configured. Go to Admin → Email Settings to add your SMTP credentials." });
    return;
  }

  // Insert activity as "pending" first (so tracking can link to it), then only mark
  // "completed" after SMTP succeeds. On failure, mark "failed" so audit history is honest.
  // Use raw SQL so org_id (added via migration, not in Drizzle schema) is always included.
  const orgId = user.orgId ?? 1;
  let activity: typeof activitiesTable.$inferSelect;
  try {
    const actResult = await db.execute(sql`
      INSERT INTO activities (type, subject, status, description, lead_id, contact_id, opportunity_id, account_id, assigned_to, org_id)
      VALUES ('email', ${subject}, 'pending', ${`To: ${to}${cc ? `\nCc: ${cc}` : ""}\n\n${body}`},
              ${leadId ?? null}, ${contactId ?? null}, ${opportunityId ?? null}, ${accountId ?? null}, null, ${orgId})
      RETURNING *
    `);
    activity = actResult.rows[0] as typeof activitiesTable.$inferSelect;
  } catch (insertErr) {
    req.log.error(insertErr, "[email-send] activity insert failed");
    res.status(500).json({ error: "Failed to log email activity" });
    return;
  }

  const token = crypto.randomBytes(16).toString("hex");
  const [tracking] = await db.insert(emailTrackingTable).values({
    activityId: activity.id,
    token,
    toEmail: to,
    subject,
  }).returning({ id: emailTrackingTable.id });

  // Persist each attachment with its own tracking token, so the "View online"
  // link we inject below can record per-file opens. The real file is still
  // sent as a normal MIME attachment (familiar UX) — the tracked link is a
  // best-effort signal that under-reports any customer who opens the local
  // copy instead of clicking through.
  const trackedAttachments: { filename: string; token: string }[] = [];
  if (decodedAttachments.length > 0 && tracking) {
    for (const a of decodedAttachments) {
      const aToken = crypto.randomBytes(16).toString("hex");
      await db.insert(emailAttachmentsTable).values({
        trackingId: tracking.id,
        token: aToken,
        filename: a.filename,
        contentType: a.contentType ?? null,
        sizeBytes: a.content.length,
        content: a.content,
      });
      trackedAttachments.push({ filename: a.filename, token: aToken });
    }
  }

  try {
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    const host_hdr = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    // Use APP_URL env var if set (required when server is behind NAT/localhost and emails
    // are sent to real recipients — without it the tracking pixel URL won't be reachable).
    const appBase = process.env.APP_URL?.replace(/\/+$/, "") || `${proto}://${host_hdr}`;
    const trackingUrl = `${appBase}/api/track/open/${token}.png`;
    const attachmentLinksHtml = trackedAttachments.length > 0
      ? `<div style="margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#374151;">` +
          `<div style="font-weight:600;margin-bottom:6px;color:#111827;">Attachments</div>` +
          trackedAttachments.map((a) =>
            `<div style="margin:4px 0;">📎 ${escapeHtml(a.filename)} &middot; ` +
              `<a href="${appBase}/api/track/attachment/${a.token}" ` +
              `style="color:#2563eb;text-decoration:underline;">View online</a></div>`,
          ).join("") +
        `</div>`
      : "";
    const htmlBody =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">` +
      escapeHtml(body).replace(/\n/g, "<br>") +
      `</div>` +
      attachmentLinksHtml +
      `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;

    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtp.host, port: smtp.port, secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    const info = await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.user}>`,
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

    // Close out any open follow-up tasks on the same record whose source email
    // subject matches this outbound — the rep has now actually replied, so the
    // SLA task should flip to completed automatically. Inbound tasks now have
    // AI-generated subjects, so we match on the original subject we stash in
    // the description (`Subject: <subject>`) using the normalised core subject
    // (Re:/Reply:/Email:/Fwd: prefixes stripped) for thread-aware matching.
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
              ilike(activitiesTable.description, `%Subject: %${coreSubject}%`),
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
      const aiTitle = await generateEmailTaskTitle({
        direction: "outbound",
        subject,
        body,
        counterpartEmail: to,
      });
      const taskResult = await db.execute(sql`
        INSERT INTO activities (type, subject, description, status, completed_at, lead_id, contact_id, opportunity_id, account_id, assigned_to, org_id)
        VALUES ('task', ${aiTitle}, ${`Email sent to ${to}${cc ? ` (cc: ${cc})` : ""}\n\nSubject: ${subject}`},
                'completed', now(), ${leadId ?? null}, ${contactId ?? null}, ${opportunityId ?? null}, ${accountId ?? null}, null, ${orgId})
        RETURNING id
      `);
      const task = taskResult.rows[0] as { id: number } | undefined;
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

/* ============================================================
 * GET /api/track/attachment/:token
 * Records an attachment open and streams the file inline. NO AUTH
 * (called directly from the recipient's email client).
 *
 * We use `Content-Disposition: inline` with a sensible filename so the
 * browser preview the file (PDFs, images) instead of forcing a download.
 * Customer can still hit save from the preview to get a local copy.
 * ========================================================== */
router.get("/track/attachment/:token", async (req: Request, res: Response) => {
  const token = req.params.token;
  if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) {
    res.status(404).send("Not found");
    return;
  }

  try {
    const [att] = await db
      .select()
      .from(emailAttachmentsTable)
      .where(eq(emailAttachmentsTable.token, token))
      .limit(1);
    if (!att) {
      res.status(404).send("Not found");
      return;
    }

    // Record the open (best-effort; do not block the file delivery on a write failure).
    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
      const ua = (req.headers["user-agent"] as string | undefined) || null;
      await db.update(emailAttachmentsTable)
        .set({
          openCount: sql`${emailAttachmentsTable.openCount} + 1`,
          openedAt: sql`coalesce(${emailAttachmentsTable.openedAt}, now())`,
          lastOpenedAt: new Date(),
          lastIp: ip,
          lastUserAgent: ua,
        })
        .where(eq(emailAttachmentsTable.token, token));
    } catch (updErr) {
      req.log.error(updErr, "attachment open tracking update failed");
    }

    // Safe ASCII fallback + RFC 5987 UTF-8 form so unicode filenames preview correctly.
    const safeAscii = att.filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const utf8 = encodeURIComponent(att.filename);
    res.setHeader("Content-Type", att.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${safeAscii}"; filename*=UTF-8''${utf8}`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Content-Length", String(att.content.length));
    res.end(att.content);
  } catch (err) {
    req.log.error(err, "attachment fetch failed");
    res.status(500).send("Internal error");
  }
});

/* ============================================================
 * POST /api/email/mark-opened/:activityId
 * Dev/admin helper: simulate the tracking pixel being loaded for a specific
 * outbound email activity. Useful when SMTP is configured but localhost
 * is not publicly reachable so the pixel URL never fires.
 * ========================================================== */
router.post("/email/mark-opened/:activityId", async (req: Request, res: Response) => {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const activityId = parseInt(req.params.activityId, 10);
  if (isNaN(activityId)) { res.status(400).json({ error: "Invalid activityId" }); return; }

  try {
    const [row] = await db.update(emailTrackingTable)
      .set({
        openCount: sql`${emailTrackingTable.openCount} + 1`,
        openedAt: sql`coalesce(${emailTrackingTable.openedAt}, now())`,
        lastOpenedAt: new Date(),
        lastUserAgent: "Manual/Admin",
      })
      .where(eq(emailTrackingTable.activityId, activityId))
      .returning({ openCount: emailTrackingTable.openCount });

    if (!row) { res.status(404).json({ error: "No tracking record for this activity" }); return; }
    res.json({ ok: true, openCount: row.openCount });
  } catch (err) {
    req.log.error(err, "mark-opened failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
