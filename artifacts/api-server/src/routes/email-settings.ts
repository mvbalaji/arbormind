import { Router } from "express";
import { db, emailSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runEmailSync, startEmailPoller, stopEmailPoller } from "../email-sync";
import { previewAutoReply } from "../auto-reply";

const router = Router();

function getSessionUser(req: any) {
  return req.session?.user ?? req.user ?? null;
}

function requireAdmin(req: any, res: any): boolean {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if (user.role !== "admin") { res.status(403).json({ error: "Forbidden — Admin only" }); return false; }
  return true;
}

// GET /api/admin/email-settings
router.get("/admin/email-settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const orgId = req.orgId as number;
    // email_settings is now per-org (one row per org, unique on org_id) rather
    // than a single global row.
    const rows = await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.orgId, orgId)).limit(1);
    let row = rows[0];
    if (!row) {
      const [created] = await db.insert(emailSettingsTable).values({ orgId }).returning();
      row = created;
    }
    // Mask password in response
    const safe = { ...row, imapPassword: row.imapPassword ? "••••••••" : "", smtpPassword: row.smtpPassword ? "••••••••" : "" };
    res.json({ settings: safe });
  } catch (err) {
    console.error("Get email-settings error:", err);
    res.status(500).json({ error: "Failed to fetch email settings" });
  }
});

// POST /api/admin/email-settings
router.post("/admin/email-settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const orgId = req.orgId as number;
    const {
      imapHost, imapPort, imapUser, imapPassword,
      imapSecure, smtpHost, smtpPort, smtpUser,
      smtpPassword, smtpSecure, smtpFromName,
      syncEnabled, syncIntervalMinutes,
    } = req.body as Record<string, any>;

    const rows = await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.orgId, orgId)).limit(1);
    const existing = rows[0];

    const update: Record<string, any> = {
      imapHost: imapHost ?? undefined,
      imapPort: imapPort ? Number(imapPort) : undefined,
      imapUser: imapUser ?? undefined,
      imapSecure: typeof imapSecure === "boolean" ? imapSecure : undefined,
      smtpHost: smtpHost ?? undefined,
      smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpUser: smtpUser ?? undefined,
      smtpSecure: typeof smtpSecure === "boolean" ? smtpSecure : undefined,
      smtpFromName: smtpFromName ?? undefined,
      syncEnabled: typeof syncEnabled === "boolean" ? syncEnabled : undefined,
      syncIntervalMinutes: syncIntervalMinutes ? Number(syncIntervalMinutes) : undefined,
      updatedAt: new Date(),
    };

    // Only update password if a new value (not masked) is supplied
    if (imapPassword && imapPassword !== "••••••••") update.imapPassword = imapPassword;
    if (smtpPassword && smtpPassword !== "••••••••") update.smtpPassword = smtpPassword;

    // Remove undefined keys
    Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

    let row;
    if (existing) {
      [row] = await db.update(emailSettingsTable).set(update).where(eq(emailSettingsTable.id, existing.id)).returning();
    } else {
      [row] = await db.insert(emailSettingsTable).values({ ...update, orgId }).returning();
    }

    // Restart/stop the poller based on new settings
    if (row?.syncEnabled) {
      await startEmailPoller();
    } else {
      stopEmailPoller();
    }

    res.json({ success: true, settings: { ...row, imapPassword: row?.imapPassword ? "••••••••" : "", smtpPassword: row?.smtpPassword ? "••••••••" : "" } });
  } catch (err) {
    console.error("Save email-settings error:", err);
    res.status(500).json({ error: "Failed to save email settings" });
  }
});

// POST /api/admin/email-settings/test
router.post("/admin/email-settings/test", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const orgId = req.orgId as number;
    const rows = await db.select().from(emailSettingsTable).where(eq(emailSettingsTable.orgId, orgId)).limit(1);
    const settings = rows[0];
    if (!settings?.imapUser || !settings?.imapPassword) {
      return res.status(400).json({ success: false, error: "IMAP credentials not configured" });
    }

    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: settings.imapHost,
      port: settings.imapPort,
      secure: settings.imapSecure,
      auth: { user: settings.imapUser, pass: settings.imapPassword },
      logger: false,
    });

    await client.connect();
    const status = await client.status("INBOX", { messages: true, unseen: true });
    await client.logout();

    res.json({ success: true, messages: status.messages, unseen: status.unseen });
  } catch (err: any) {
    res.json({ success: false, error: err?.message ?? "Connection failed" });
  }
});

// POST /api/admin/email-sync
router.post("/admin/email-sync", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await runEmailSync();
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, processed: result.processed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Sync failed" });
  }
});

// POST /api/admin/auto-reply-preview
// Diagnostic: returns what the AI would compose for a sample customer email,
// without sending anything. Useful for verifying PDF loading + reply formatting.
router.post("/admin/auto-reply-preview", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { fromName, subject, body } = req.body ?? {};
  if (!subject || !body) {
    return res.status(400).json({ error: "subject and body are required" });
  }
  try {
    const result = await previewAutoReply({
      fromName: fromName ?? "Test User",
      subject: String(subject),
      body: String(body),
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Preview failed" });
  }
});

export default router;
