import { Router } from "express";
import { db, emailsTable, leadsTable, opportunitiesTable, contactsTable, activitiesTable, insertEmailSchema, quotesTable } from "@workspace/db";
import { eq, ilike, desc, sql } from "drizzle-orm";
import { detectEmailApproval, processEmailApprovalDecision } from "./quote-workflow-rules";
import { getDefaultOrgId, getOrgId } from "../lib/org-context";

// Detect if an email body/subject is a quote rejection and extract reason
function detectQuoteRejection(subject: string, body: string): { isRejection: boolean; reason: string } {
  const text = `${subject} ${body}`.toLowerCase();
  const rejectionKeywords = ["reject", "decline", "not interested", "no thank you", "not proceeding", "won't be moving forward", "will not be moving forward", "pass on this", "going with another", "chosen another", "not accepting"];
  const isRejection = rejectionKeywords.some(kw => text.includes(kw));
  if (!isRejection) return { isRejection: false, reason: "" };
  // Extract a concise reason — take first 300 chars of body stripped of whitespace runs
  const reason = body.replace(/\s+/g, " ").trim().substring(0, 300);
  return { isRejection: true, reason };
}

// Extract quote number from email subject/body (e.g. QT-1004)
function extractQuoteNumber(subject: string, body: string): string | null {
  const match = `${subject} ${body}`.match(/QT-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

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

async function checkIfKnownCustomer(email: string) {
  const [contact] = await db
    .select({ id: contactsTable.id, accountId: contactsTable.accountId })
    .from(contactsTable)
    .where(ilike(contactsTable.email, email));
  return contact ?? null;
}

// POST: Receive email via webhook (from email forwarding / Cloudflare Email Routing)
router.post("/emails", async (req, res) => {
  try {
    const orgId = await getDefaultOrgId();
    const parsed = insertEmailSchema.parse(req.body);
    const knownContact = await checkIfKnownCustomer(parsed.fromEmail);
    const isKnown = !!knownContact;

    let relatedLeadId: number | undefined;
    let relatedOpportunityId: number | undefined;
    let relatedContactId: number | undefined;
    let relatedAccountId: number | undefined;

    if (isKnown && knownContact) {
      relatedContactId = knownContact.id;
      relatedAccountId = knownContact.accountId ?? undefined;
      const [opportunity] = await db
        .insert(opportunitiesTable)
        .values({
          name: `Inquiry: ${parsed.subject}`,
          description: parsed.message,
          stage: "prospecting",
          probability: 30,
          amount: 0,
          closeDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        })
        .returning();
      relatedOpportunityId = opportunity?.id;
    } else {
      const nameParts = parsed.fromName.split(" ");
      const [lead] = await db
        .insert(leadsTable)
        .values({
          firstName: nameParts[0] || "Unknown",
          lastName: nameParts.slice(1).join(" ") || "Unknown",
          email: parsed.fromEmail,
          source: "email_campaign",
          status: "new",
        })
        .returning();
      if (lead) await db.execute(sql`UPDATE leads SET org_id = ${orgId} WHERE id = ${lead.id}`);
      relatedLeadId = lead?.id;
    }

    const [email] = await db
      .insert(emailsTable)
      .values({
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        subject: parsed.subject,
        message: parsed.message,
        status: "new",
        isKnownCustomer: isKnown ? "true" : "false",
        relatedContactId,
        relatedLeadId,
        relatedOpportunityId,
        notes: isKnown ? "Auto-created Opportunity" : "Auto-created Lead",
      })
      .returning();
    if (email) await db.execute(sql`UPDATE emails SET org_id = ${orgId} WHERE id = ${email.id}`);

    const [activity] = await db.insert(activitiesTable).values({
      type: "email",
      subject: `Inbound: ${parsed.subject}`,
      description: parsed.message?.substring(0, 500) || "",
      status: "completed",
      contactId: relatedContactId ?? null,
      leadId: relatedLeadId ?? null,
      opportunityId: relatedOpportunityId ?? null,
      accountId: relatedAccountId ?? null,
    }).returning();
    if (activity) await db.execute(sql`UPDATE activities SET org_id = ${orgId} WHERE id = ${activity.id}`);

    // Detect workflow approval decision from inbound email (reply-based)
    const approvalDetection = await detectEmailApproval(parsed.subject ?? "", parsed.message ?? "");
    if (approvalDetection.approvalId && approvalDetection.decision) {
      await processEmailApprovalDecision(
        approvalDetection.approvalId,
        approvalDetection.decision,
        approvalDetection.reason,
        parsed.fromEmail,
      );
    }

    // Detect quote rejection from inbound email
    let quoteRejected = false;
    const { isRejection, reason } = detectQuoteRejection(parsed.subject ?? "", parsed.message ?? "");
    if (isRejection) {
      const quoteNumber = extractQuoteNumber(parsed.subject ?? "", parsed.message ?? "");
      if (quoteNumber) {
        const [targetQuote] = await db.select({ id: quotesTable.id, status: quotesTable.status })
          .from(quotesTable).where(eq(quotesTable.quoteNumber, quoteNumber));
        if (targetQuote && targetQuote.status !== "rejected") {
          await db.execute(sql`
            UPDATE quotes SET status = 'rejected', rejection_reason = ${reason}, updated_at = NOW()
            WHERE id = ${targetQuote.id}
          `);
          // Track in stage history
          const now = new Date();
          await db.execute(sql`UPDATE quote_stage_history SET left_at = ${now} WHERE quote_id = ${targetQuote.id} AND stage = ${targetQuote.status} AND left_at IS NULL`);
          await db.execute(sql`INSERT INTO quote_stage_history (quote_id, stage, entered_at) VALUES (${targetQuote.id}, 'rejected', ${now})`);
          quoteRejected = true;
        }
      }
    }

    res.status(201).json({
      success: true,
      email,
      quoteRejected,
      message: isKnown
        ? "New product inquiry — our sales team will get in touch shortly."
        : "Thank you for your inquiry — our sales team will get in touch shortly.",
    });
  } catch (err) {
    console.error("Email webhook error:", err);
    res.status(400).json({ error: "Failed to process email" });
  }
});

// GET: List all emails (admin only)
router.get("/emails", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    let orgId: number;
    try {
      orgId = getOrgId(req);
    } catch {
      // OAuth sessions that pre-date the orgId fix don't have it in the token yet;
      // fall back to the default org so the inbox still loads.
      const { getDefaultOrgId } = await import("../lib/org-context");
      orgId = await getDefaultOrgId();
    }
    const result = await db.execute(sql`
      SELECT
        id,
        message_uid AS "messageUid",
        message_id AS "messageId",
        in_reply_to AS "inReplyTo",
        from_email AS "fromEmail",
        from_name AS "fromName",
        subject,
        message,
        body_html AS "bodyHtml",
        status,
        related_contact_id AS "relatedContactId",
        related_lead_id AS "relatedLeadId",
        related_opportunity_id AS "relatedOpportunityId",
        is_known_customer AS "isKnownCustomer",
        notes,
        auto_replied_at AS "autoRepliedAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        org_id AS "orgId"
      FROM emails
      WHERE org_id = ${orgId}
      ORDER BY created_at DESC
    `);
    res.json({ emails: result.rows });
  } catch (err) {
    console.error("Fetch emails error:", err);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

// PATCH: Update email status (admin only)
router.patch("/emails/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { status, notes } = req.body as { status?: string; notes?: string };
    const emailId = parseInt(req.params.id, 10);

    const [email] = await db
      .update(emailsTable)
      .set({
        status: status ?? undefined,
        notes: notes ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(emailsTable.id, emailId))
      .returning();

    res.json({ success: true, email });
  } catch (err) {
    console.error("Update email error:", err);
    res.status(500).json({ error: "Failed to update email" });
  }
});

export default router;
