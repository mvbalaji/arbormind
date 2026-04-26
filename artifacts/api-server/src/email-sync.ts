import { db, emailSettingsTable, emailsTable, leadsTable, opportunitiesTable, contactsTable, activitiesTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";
import { simpleParser } from "mailparser";

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// IMAP defaults: prefer environment variables, then fall back to admin-configured DB row.
// The hardcoded fallback exists so the support@arbormind.in mailbox keeps working out of the
// box; rotate the password and move it to IMAP_USER / IMAP_PASSWORD secrets for production.
const DEFAULT_IMAP = {
  host: process.env.IMAP_HOST ?? "mail.spacemail.com",
  port: Number(process.env.IMAP_PORT ?? 993),
  secure: (process.env.IMAP_SECURE ?? "true") !== "false",
  user: process.env.IMAP_USER ?? "support@arbormind.in",
  password: process.env.IMAP_PASSWORD ?? "February2026#",
};

async function getSettings() {
  const rows = await db.select().from(emailSettingsTable).limit(1);
  return rows[0] ?? null;
}

async function getImapConfig(settings: Record<string, unknown> | null) {
  if (settings?.imapUser && settings?.imapPassword) {
    return {
      host: settings.imapHost,
      port: settings.imapPort,
      secure: settings.imapSecure,
      user: settings.imapUser,
      pass: settings.imapPassword,
    };
  }
  return {
    host: DEFAULT_IMAP.host,
    port: DEFAULT_IMAP.port,
    secure: DEFAULT_IMAP.secure,
    user: DEFAULT_IMAP.user,
    pass: DEFAULT_IMAP.password,
  };
}

async function checkIfKnownCustomer(email: string) {
  const [contact] = await db
    .select({ id: contactsTable.id, accountId: contactsTable.accountId })
    .from(contactsTable)
    .where(ilike(contactsTable.email, email));
  return contact ?? null;
}

async function processEmail(
  messageUid: string,
  fromEmail: string,
  fromName: string,
  subject: string,
  body: string,
  bodyHtml: string | null,
) {
  const contact = await checkIfKnownCustomer(fromEmail);

  let relatedLeadId: number | undefined;
  let relatedOpportunityId: number | undefined;
  let relatedContactId: number | undefined;
  let relatedAccountId: number | undefined;
  let notes: string;

  if (contact) {
    relatedContactId = contact.id;
    relatedAccountId = contact.accountId ?? undefined;
    const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const [opp] = await db
      .insert(opportunitiesTable)
      .values({
        name: `Inquiry: ${subject}`,
        description: body,
        stage: "prospecting",
        probability: 30,
        amount: 0,
        closeDate,
        accountId: contact.accountId ?? undefined,
      })
      .returning();
    relatedOpportunityId = opp?.id;
    notes = "Auto-created Opportunity from inbound email";
  } else {
    const nameParts = (fromName || "").trim().split(/\s+/);
    const [lead] = await db
      .insert(leadsTable)
      .values({
        firstName: nameParts[0] || "Unknown",
        lastName: nameParts.slice(1).join(" ") || "Unknown",
        email: fromEmail,
        source: "email_campaign",
        status: "new",
      })
      .returning();
    relatedLeadId = lead?.id;
    notes = "Auto-created Lead from inbound email";
  }

  await db
    .insert(emailsTable)
    .values({
      messageUid,
      fromEmail,
      fromName: fromName || fromEmail,
      subject,
      message: body.slice(0, 8000),
      bodyHtml: bodyHtml ? bodyHtml.slice(0, 100000) : null,
      status: "new",
      isKnownCustomer: contact ? "true" : "false",
      relatedContactId,
      relatedLeadId,
      relatedOpportunityId,
      notes,
    })
    .onConflictDoNothing({ target: emailsTable.messageUid });

  await db.insert(activitiesTable).values({
    type: "email",
    subject: `Email: ${subject}`,
    description: body.slice(0, 2000),
    status: "completed",
    leadId: relatedLeadId ?? null,
    contactId: relatedContactId ?? null,
    opportunityId: relatedOpportunityId ?? null,
    accountId: relatedAccountId ?? null,
    completedAt: new Date(),
  });
}

export async function runEmailSync(): Promise<{ processed: number; error?: string }> {
  if (isSyncing) return { processed: 0, error: "Sync already in progress" };
  isSyncing = true;

  const settings = await getSettings();
  const imapConfig = await getImapConfig(settings);

  if (!imapConfig.user || !imapConfig.pass) {
    isSyncing = false;
    return { processed: 0, error: "IMAP credentials not configured" };
  }

  let processed = 0;
  let errorMsg: string | undefined;

  try {
    const { ImapFlow } = await import("imapflow");

    const client = new ImapFlow({
      host: imapConfig.host,
      port: imapConfig.port,
      secure: imapConfig.secure,
      auth: {
        user: imapConfig.user,
        pass: imapConfig.pass,
      },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock("INBOX");
    try {
      // Collect all UIDs already imported so we can skip them
      const existingRows = await db
        .select({ messageUid: emailsTable.messageUid })
        .from(emailsTable);
      const importedUids = new Set(
        existingRows.map((r) => r.messageUid).filter((u): u is string => !!u),
      );

      for await (const msg of client.fetch("1:*", { envelope: true, source: true }, { uid: true })) {
        const uidKey = String(msg.uid);
        if (importedUids.has(uidKey)) continue;

        const envelope = msg.envelope;
        const fromAddr = envelope?.from?.[0];
        if (!fromAddr?.address) continue;

        const fromEmail = fromAddr.address;
        const fromName = fromAddr.name || fromAddr.address;
        const subject = envelope?.subject || "(no subject)";

        let bodyText = "";
        let bodyHtml: string | null = null;

        if (msg.source) {
          try {
            const parsed = await simpleParser(msg.source);
            bodyText = (parsed.text ?? "").trim();
            bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
            if (!bodyText && bodyHtml) {
              bodyText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            }
          } catch (parseErr) {
            console.error("[EmailPoller] Failed to parse message", uidKey, parseErr);
            const raw = msg.source.toString("utf8");
            const parts = raw.split(/\r?\n\r?\n/);
            bodyText = parts.slice(1).join("\n\n").replace(/<[^>]+>/g, " ").trim();
          }
        }

        await processEmail(uidKey, fromEmail, fromName, subject, bodyText || "(no body)", bodyHtml);
        importedUids.add(uidKey);
        processed++;
      }
    } finally {
      lock.release();
    }

    await client.logout();

    const settingsId = settings?.id;
    if (settingsId) {
      await db
        .update(emailSettingsTable)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: "ok",
          lastSyncMessage: `Processed ${processed} email(s)`,
          emailsProcessed: (settings.emailsProcessed ?? 0) + processed,
          updatedAt: new Date(),
        })
        .where(eq(emailSettingsTable.id, settingsId));
    }
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Unknown IMAP error";
    const settingsId = settings?.id;
    if (settingsId) {
      await db
        .update(emailSettingsTable)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: "error",
          lastSyncMessage: errorMsg,
          updatedAt: new Date(),
        })
        .where(eq(emailSettingsTable.id, settingsId));
    }
  } finally {
    isSyncing = false;
  }

  return { processed, error: errorMsg };
}

export async function startEmailPoller() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }

  const settings = await getSettings();
  const hasDbCreds = settings?.imapUser && settings?.imapPassword;
  const hasHardcoded = DEFAULT_IMAP.user && DEFAULT_IMAP.password;

  if (!hasDbCreds && !hasHardcoded) {
    console.log("[EmailPoller] No IMAP credentials configured — skipping.");
    return;
  }

  if (settings && settings.syncEnabled === false) {
    console.log("[EmailPoller] Sync explicitly disabled by admin — skipping.");
    return;
  }

  const intervalMs = (settings?.syncIntervalMinutes ?? 15) * 60 * 1000;
  console.log(`[EmailPoller] Starting — polling every ${settings?.syncIntervalMinutes ?? 15} min.`);

  syncTimer = setInterval(async () => {
    console.log("[EmailPoller] Running scheduled sync...");
    const result = await runEmailSync();
    if (result.error) {
      console.error("[EmailPoller] Sync error:", result.error);
    } else {
      console.log(`[EmailPoller] Sync done — ${result.processed} email(s) processed.`);
    }
  }, intervalMs);
}

export async function stopEmailPoller() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    console.log("[EmailPoller] Stopped.");
  }
}
