import { db, emailSettingsTable, emailsTable, leadsTable, opportunitiesTable, contactsTable, activitiesTable, emailTrackingTable } from "@workspace/db";
import { eq, ilike, desc, sql } from "drizzle-orm";
import { getDefaultOrgId } from "./lib/org-context";
import { simpleParser } from "mailparser";
import { maybeAutoReply } from "./auto-reply";
import { generateEmailTaskTitle } from "./lib/ai-task-title";

// Normalises a Message-ID for header comparison: trims whitespace, removes angle brackets,
// and lowercases the domain. Returns null for empty input. Equivalent values from different
// MTAs all collapse to a single canonical form, so In-Reply-To / Message-ID can match.
function normalizeMessageId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.trim().replace(/^<+|>+$/g, "").trim();
  if (!stripped) return null;
  const at = stripped.lastIndexOf("@");
  if (at === -1) return stripped;
  return stripped.slice(0, at + 1) + stripped.slice(at + 1).toLowerCase();
}

// Strip leading reply/forward prefixes ("Re:", "RE:", "Fwd:", "FW:") repeatedly and
// collapse whitespace, so subject-based threading fallback survives mailer variations.
function normalizeSubject(s: string | null | undefined): string {
  if (!s) return "";
  let out = s.trim();
  while (true) {
    const next = out.replace(/^(re|fwd?|aw|sv|tr)\s*:\s*/i, "").trim();
    if (next === out) break;
    out = next;
  }
  return out.replace(/\s+/g, " ").toLowerCase();
}

interface ThreadParent {
  activityId: number;
  leadId: number | null;
  contactId: number | null;
  opportunityId: number | null;
  accountId: number | null;
}

// Look up the outbound activity that an inbound reply belongs to. Tries each
// In-Reply-To / References Message-ID against email_tracking.message_id first
// (the strict RFC-5322 path). Falls back to a fuzzy match on normalised subject +
// recipient when no header match is found (handles clients that drop In-Reply-To
// on quoted-text-only replies).
async function findThreadParent(opts: {
  inReplyTo: string | null;
  references: string[];
  fromEmail: string;
  subject: string;
}): Promise<ThreadParent | null> {
  const candidates = new Set<string>();
  if (opts.inReplyTo) {
    const n = normalizeMessageId(opts.inReplyTo);
    if (n) candidates.add(n);
  }
  for (const r of opts.references) {
    const n = normalizeMessageId(r);
    if (n) candidates.add(n);
  }

  // Both sides are stored/normalised to the bracket-stripped canonical form (see
  // email-send.ts), so a single equality lookup is sufficient.
  for (const mid of candidates) {
    const [hit] = await db
      .select({
        activityId: emailTrackingTable.activityId,
        leadId: activitiesTable.leadId,
        contactId: activitiesTable.contactId,
        opportunityId: activitiesTable.opportunityId,
        accountId: activitiesTable.accountId,
      })
      .from(emailTrackingTable)
      .innerJoin(activitiesTable, eq(activitiesTable.id, emailTrackingTable.activityId))
      .where(eq(emailTrackingTable.messageId, mid))
      .limit(1);
    if (hit) return hit;
  }

  // Fallback: scan the most recent outbound emails to this sender and pick the newest
  // one whose normalised subject matches. Handles older outbound rows that pre-date the
  // message_id capture (legacy data) and clients that strip In-Reply-To on quoted replies.
  const norm = normalizeSubject(opts.subject);
  if (!norm) return null;
  const recent = await db
    .select({
      activityId: emailTrackingTable.activityId,
      leadId: activitiesTable.leadId,
      contactId: activitiesTable.contactId,
      opportunityId: activitiesTable.opportunityId,
      accountId: activitiesTable.accountId,
      subject: emailTrackingTable.subject,
    })
    .from(emailTrackingTable)
    .innerJoin(activitiesTable, eq(activitiesTable.id, emailTrackingTable.activityId))
    .where(ilike(emailTrackingTable.toEmail, opts.fromEmail))
    .orderBy(desc(emailTrackingTable.sentAt))
    .limit(50);
  for (const row of recent) {
    if (normalizeSubject(row.subject) === norm) {
      return {
        activityId: row.activityId,
        leadId: row.leadId,
        contactId: row.contactId,
        opportunityId: row.opportunityId,
        accountId: row.accountId,
      };
    }
  }
  return null;
}

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

// IMAP credentials come from environment / admin-configured DB row only.
// The password MUST be supplied via the IMAP_PASSWORD secret (or the email_settings DB row) —
// there is no hardcoded password fallback. Host, port, secure, and user have safe non-secret
// defaults for the public support@arbormind.in mailbox so the inbox keeps working out of the box.
const DEFAULT_IMAP = {
  host: process.env.IMAP_HOST ?? "mail.spacemail.com",
  port: Number(process.env.IMAP_PORT ?? 993),
  secure: (process.env.IMAP_SECURE ?? "true") !== "false",
  user: process.env.IMAP_USER ?? "support@arbormind.in",
  password: process.env.IMAP_PASSWORD ?? "",
};

async function getSettings(orgId: number) {
  const result = await db.execute(sql`SELECT * FROM email_settings WHERE org_id = ${orgId} LIMIT 1`);
  return (result.rows[0] as Record<string, unknown> | undefined) ?? null;
}

async function getImapConfig(settings: Record<string, unknown> | null) {
  // Per-tenant DB-stored credentials are used when an admin has explicitly configured them via
  // the email_settings UI. Otherwise, fall back to env-var credentials (IMAP_PASSWORD secret).
  // There is NO hardcoded password fallback — see DEFAULT_IMAP above.
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

async function checkIfKnownCustomer(email: string, orgId: number) {
  const result = await db.execute(sql`
    SELECT id, account_id FROM contacts
    WHERE org_id = ${orgId} AND lower(email) = lower(${email})
    LIMIT 1
  `);
  const row = result.rows[0] as { id: number; account_id: number | null } | undefined;
  return row ? { id: row.id, accountId: row.account_id } : null;
}

async function processEmail(
  messageUid: string,
  fromEmail: string,
  fromName: string,
  subject: string,
  body: string,
  bodyHtml: string | null,
  messageId: string | null,
  inReplyTo: string | null,
  references: string[],
  orgId: number,
) {
  // 1. Thread detection — if this is a reply to an outbound message we sent,
  // attach it to the same activity context (lead/contact/opportunity/account)
  // instead of creating a brand new lead or opportunity. Sales reps then see
  // the full back-and-forth on a single record.
  const parent = await findThreadParent({ inReplyTo, references, fromEmail, subject });

  const contact = parent ? null : await checkIfKnownCustomer(fromEmail, orgId);

  let relatedLeadId: number | undefined;
  let relatedOpportunityId: number | undefined;
  let relatedContactId: number | undefined;
  let relatedAccountId: number | undefined;
  let notes: string;

  if (parent) {
    relatedLeadId = parent.leadId ?? undefined;
    relatedContactId = parent.contactId ?? undefined;
    relatedOpportunityId = parent.opportunityId ?? undefined;
    relatedAccountId = parent.accountId ?? undefined;
    notes = `Reply received on existing thread (activity #${parent.activityId})`;
  } else if (contact) {
    relatedContactId = contact.id;
    relatedAccountId = contact.accountId ?? undefined;
    const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oppResult = await db.execute(sql`
      INSERT INTO opportunities (name, description, stage, probability, amount, close_date, account_id, org_id)
      VALUES (${`Inquiry: ${subject}`}, ${body}, 'prospecting', 30, 0, ${closeDate}, ${contact.accountId ?? null}, ${orgId})
      RETURNING id
    `);
    relatedOpportunityId = (oppResult.rows[0] as { id: number } | undefined)?.id;
    notes = "Auto-created Opportunity from inbound email";
  } else {
    const nameParts = (fromName || "").trim().split(/\s+/);
    const leadResult = await db.execute(sql`
      INSERT INTO leads (first_name, last_name, email, source, status, org_id)
      VALUES (${nameParts[0] || "Unknown"}, ${nameParts.slice(1).join(" ") || "Unknown"}, ${fromEmail}, 'email_campaign', 'new', ${orgId})
      RETURNING id
    `);
    relatedLeadId = (leadResult.rows[0] as { id: number } | undefined)?.id;
    notes = "Auto-created Lead from inbound email";
  }

  const emailResult = await db.execute(sql`
    INSERT INTO emails (message_uid, message_id, in_reply_to, from_email, from_name, subject, message, body_html, status, is_known_customer, related_contact_id, related_lead_id, related_opportunity_id, notes, org_id)
    VALUES (
      ${messageUid}, ${messageId}, ${inReplyTo}, ${fromEmail}, ${fromName || fromEmail},
      ${subject}, ${body.slice(0, 8000)}, ${bodyHtml ? bodyHtml.slice(0, 100000) : null},
      'new', ${parent ? "true" : contact ? "true" : "false"},
      ${relatedContactId ?? null}, ${relatedLeadId ?? null}, ${relatedOpportunityId ?? null},
      ${notes}, ${orgId}
    )
    ON CONFLICT (message_uid) DO NOTHING
    RETURNING id
  `);
  const insertedEmailId = (emailResult.rows[0] as { id: number } | undefined)?.id;

  await db.execute(sql`
    INSERT INTO activities (type, subject, description, status, lead_id, contact_id, opportunity_id, account_id, completed_at, org_id)
    VALUES (
      'email', ${parent ? `Reply: ${subject}` : `Email: ${subject}`}, ${body.slice(0, 2000)},
      'completed', ${relatedLeadId ?? null}, ${relatedContactId ?? null},
      ${relatedOpportunityId ?? null}, ${relatedAccountId ?? null}, NOW(), ${orgId}
    )
  `);

  // Auto-create a follow-up task for the sales rep who owns the record this
  // email is attached to. Inbound emails always require a response, so this
  // surfaces in the rep's open-task list and tomorrow's due-date queue —
  // they never have to remember to check the shared inbox.
  // Owner resolution priority: opportunity → lead → contact → null. The
  // first matching record's owner wins; opportunity is highest priority
  // because it represents the most concrete sales context.
  let ownerId: number | null = null;
  try {
    if (relatedOpportunityId) {
      const [opp] = await db
        .select({ assignedTo: opportunitiesTable.assignedTo })
        .from(opportunitiesTable)
        .where(eq(opportunitiesTable.id, relatedOpportunityId));
      ownerId = opp?.assignedTo ?? null;
    }
    if (ownerId == null && relatedLeadId) {
      const [lead] = await db
        .select({ assignedTo: leadsTable.assignedTo })
        .from(leadsTable)
        .where(eq(leadsTable.id, relatedLeadId));
      ownerId = lead?.assignedTo ?? null;
    }
    if (ownerId == null && relatedContactId) {
      const [c] = await db
        .select({ ownerId: contactsTable.ownerId })
        .from(contactsTable)
        .where(eq(contactsTable.id, relatedContactId));
      ownerId = c?.ownerId ?? null;
    }
  } catch (ownerErr) {
    console.warn("[email-sync] owner lookup failed:", ownerErr);
  }

  try {
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const aiTitle = await generateEmailTaskTitle({
      direction: "inbound",
      subject,
      body,
      counterpartName: fromName,
      counterpartEmail: fromEmail,
    });
    await db.execute(sql`
      INSERT INTO activities (type, subject, description, status, due_date, lead_id, contact_id, opportunity_id, account_id, assigned_to, org_id)
      VALUES (
        'task', ${aiTitle},
        ${`New email from ${fromName || fromEmail} <${fromEmail}> — reply needed.\n\nSubject: ${subject}`},
        'pending', ${dueDate},
        ${relatedLeadId ?? null}, ${relatedContactId ?? null},
        ${relatedOpportunityId ?? null}, ${relatedAccountId ?? null},
        ${ownerId}, ${orgId}
      )
    `);
  } catch (taskErr) {
    // Task creation is non-critical — log and continue so the inbound email
    // is still recorded even if the bookkeeping insert fails.
    console.warn("[email-sync] follow-up task insert failed:", taskErr);
  }

  return insertedEmailId;
}

export async function runEmailSync(orgId?: number): Promise<{ processed: number; error?: string }> {
  if (isSyncing) return { processed: 0, error: "Sync already in progress" };
  isSyncing = true;

  const resolvedOrgId = orgId ?? await getDefaultOrgId();
  const settings = await getSettings(resolvedOrgId);
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
      // Collect all UIDs already imported for this org so we can skip them
      const existingResult = await db.execute(sql`SELECT message_uid FROM emails WHERE org_id = ${resolvedOrgId} AND message_uid IS NOT NULL`);
      const importedUids = new Set(
        existingResult.rows.map((r) => (r as { message_uid: string }).message_uid).filter(Boolean),
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
        let parsedMessageId: string | null = null;
        let parsedInReplyTo: string | null = null;
        let parsedReferences: string[] = [];

        if (msg.source) {
          try {
            const parsed = await simpleParser(msg.source);
            bodyText = (parsed.text ?? "").trim();
            bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
            if (!bodyText && bodyHtml) {
              bodyText = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            }
            parsedMessageId = parsed.messageId ?? null;
            parsedInReplyTo = parsed.inReplyTo ?? null;
            const refs = parsed.references;
            parsedReferences = Array.isArray(refs) ? refs : refs ? [refs] : [];
          } catch (parseErr) {
            console.error("[EmailPoller] Failed to parse message", uidKey, parseErr);
            const raw = msg.source.toString("utf8");
            const parts = raw.split(/\r?\n\r?\n/);
            bodyText = parts.slice(1).join("\n\n").replace(/<[^>]+>/g, " ").trim();
          }
        }

        // The IMAP ENVELOPE also exposes In-Reply-To and Message-Id — use as a safety net
        // in case simpleParser failed but the envelope decoded cleanly.
        const envMsgId = (envelope as { messageId?: string } | undefined)?.messageId ?? null;
        const envInReplyTo = (envelope as { inReplyTo?: string } | undefined)?.inReplyTo ?? null;
        if (!parsedMessageId && envMsgId) parsedMessageId = envMsgId;
        if (!parsedInReplyTo && envInReplyTo) parsedInReplyTo = envInReplyTo;

        const emailBody = bodyText || "(no body)";
        const emailId = await processEmail(
          uidKey,
          fromEmail,
          fromName,
          subject,
          emailBody,
          bodyHtml,
          parsedMessageId,
          parsedInReplyTo,
          parsedReferences,
          resolvedOrgId,
        );
        importedUids.add(uidKey);
        processed++;

        if (emailId) {
          // Auto-reply with Claude using the catalogue. Errors are caught inside
          // maybeAutoReply so a single bad email cannot abort the whole sync.
          try {
            await maybeAutoReply({
              emailId,
              fromEmail,
              fromName,
              subject,
              body: emailBody,
              imapUser: String(imapConfig.user),
              imapPass: String(imapConfig.pass),
              emailSettings: settings as Record<string, unknown> | null,
            });
          } catch (err) {
            console.error("[EmailPoller] Auto-reply failed for", uidKey, err);
          }
        }
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

  const orgId = await getDefaultOrgId();
  const settings = await getSettings(orgId);
  const hasDbCreds = settings?.imapUser && settings?.imapPassword;
  const hasEnvCreds = DEFAULT_IMAP.user && DEFAULT_IMAP.password;

  if (!hasDbCreds && !hasEnvCreds) {
    console.warn(
      "[EmailPoller] No IMAP credentials configured — skipping. " +
        "Set the IMAP_PASSWORD secret (and optionally IMAP_USER / IMAP_HOST) to enable inbox sync.",
    );
    return;
  }

  if (settings && settings.syncEnabled === false) {
    console.log("[EmailPoller] Sync explicitly disabled by admin — skipping.");
    return;
  }

  const intervalMs = (settings?.syncIntervalMinutes ?? 15) * 60 * 1000;
  console.log(`[EmailPoller] org ${orgId}: Starting — polling every ${settings?.syncIntervalMinutes ?? 15} min.`);

  syncTimer = setInterval(async () => {
    console.log(`[EmailPoller] org ${orgId}: Running scheduled sync...`);
    const result = await runEmailSync(orgId);
    if (result.error) {
      console.error(`[EmailPoller] org ${orgId}: Sync error:`, result.error);
    } else {
      console.log(`[EmailPoller] org ${orgId}: Sync done — ${result.processed} email(s) processed.`);
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
