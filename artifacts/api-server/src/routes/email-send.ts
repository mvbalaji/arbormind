import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { activitiesTable, emailTrackingTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

// 1x1 transparent PNG (43 bytes)
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

interface SendBody {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  leadId?: number;
  contactId?: number;
  opportunityId?: number;
  accountId?: number;
}

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

  const { to, cc, subject, body, leadId, contactId, opportunityId, accountId } = req.body as SendBody;
  if (!to || !subject || !body) {
    res.status(400).json({ error: "to, subject, and body are required" });
    return;
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

  try {
    // 1. Create activity row first so we can link tracking to it
    const [activity] = await db.insert(activitiesTable).values({
      type: "email",
      subject,
      status: "completed",
      completedAt: new Date(),
      description: `To: ${to}${cc ? `\nCc: ${cc}` : ""}\n\n${body}`,
      leadId: leadId ?? null,
      contactId: contactId ?? null,
      opportunityId: opportunityId ?? null,
      accountId: accountId ?? null,
      assignedTo: user.id,
    }).returning();

    // 2. Generate unique tracking token + row
    const token = crypto.randomBytes(16).toString("hex");
    await db.insert(emailTrackingTable).values({
      activityId: activity.id,
      token,
      toEmail: to,
      subject,
    });

    // 3. Build HTML body with tracking pixel
    const proto = (req.headers["x-forwarded-proto"] as string) || (req.secure ? "https" : "http");
    const host_hdr = (req.headers["x-forwarded-host"] as string) || (req.headers.host as string);
    const trackingUrl = `${proto}://${host_hdr}/api/track/open/${token}.png`;
    const htmlBody =
      `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">` +
      escapeHtml(body).replace(/\n/g, "<br>") +
      `</div>` +
      `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;

    // 4. Send via SMTP
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host, port, secure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    await transporter.sendMail({
      from: `"${fromName}" <${smtpUser}>`,
      to,
      cc: cc || undefined,
      subject,
      text: body,
      html: htmlBody,
    });

    res.status(201).json({ ok: true, activityId: activity.id, token });
  } catch (err) {
    req.log.error(err);
    const message = err instanceof Error ? err.message : "Failed to send email";
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
