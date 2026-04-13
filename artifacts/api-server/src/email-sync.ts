import { db, emailSettingsTable, emailsTable, leadsTable, opportunitiesTable, contactsTable, activitiesTable } from "@workspace/db";
import { eq, ilike } from "drizzle-orm";

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

const HARDCODED_IMAP = {
  host: "mail.spacemail.com",
  port: 993,
  secure: true,
  user: "support@arbormind.in",
  password: "February2026#",
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
    host: HARDCODED_IMAP.host,
    port: HARDCODED_IMAP.port,
    secure: HARDCODED_IMAP.secure,
    user: HARDCODED_IMAP.user,
    pass: HARDCODED_IMAP.password,
  };
}

async function checkIfKnownCustomer(email: string) {
  const [contact] = await db
    .select({ id: contactsTable.id, accountId: contactsTable.accountId })
    .from(contactsTable)
    .where(ilike(contactsTable.email, email));
  return contact ?? null;
}

async function processEmail(fromEmail: string, fromName: string, subject: string, body: string) {
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

  await db.insert(emailsTable).values({
    fromEmail,
    fromName: fromName || fromEmail,
    subject,
    message: body.slice(0, 4000),
    status: "new",
    isKnownCustomer: contact ? "true" : "false",
    relatedContactId,
    relatedLeadId,
    relatedOpportunityId,
    notes,
  });

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
      for await (const msg of client.fetch("1:*", { envelope: true, bodyStructure: true, source: true }, { uid: true })) {
        if (msg.flags?.has("\\Seen")) continue;

        const envelope = msg.envelope;
        const fromAddr = envelope?.from?.[0];
        if (!fromAddr?.address) continue;

        const fromEmail = fromAddr.address;
        const fromName = fromAddr.name || fromAddr.address;
        const subject = envelope?.subject || "(no subject)";

        let body = "";
        if (msg.source) {
          const raw = msg.source.toString("utf8");
          const parts = raw.split(/\r?\n\r?\n/);
          body = parts.slice(1).join("\n\n").replace(/<[^>]+>/g, " ").trim().slice(0, 4000);
        }

        await processEmail(fromEmail, fromName, subject, body || "(no body)");
        await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"]);
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
  const hasHardcoded = HARDCODED_IMAP.user && HARDCODED_IMAP.password;

  if (!hasDbCreds && !hasHardcoded) {
    console.log("[EmailPoller] Sync disabled or not configured — skipping.");
    return;
  }

  if (settings && !settings.syncEnabled && !hasHardcoded) {
    console.log("[EmailPoller] Sync disabled or not configured — skipping.");
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
