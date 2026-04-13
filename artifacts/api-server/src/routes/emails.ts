import { Router } from "express";
import { db, emailsTable, leadsTable, opportunitiesTable, contactsTable, activitiesTable, insertEmailSchema } from "@workspace/db";
import { eq, ilike, desc } from "drizzle-orm";

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
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(ilike(contactsTable.email, email));
  return !!contact;
}

// POST: Receive email via webhook (from email forwarding / Cloudflare Email Routing)
router.post("/emails", async (req, res) => {
  try {
    const parsed = insertEmailSchema.parse(req.body);
    const isKnown = await checkIfKnownCustomer(parsed.fromEmail);

    let relatedLeadId: number | undefined;
    let relatedOpportunityId: number | undefined;
    let relatedContactId: number | undefined;

    if (isKnown) {
      const [contact] = await db
        .select({ id: contactsTable.id })
        .from(contactsTable)
        .where(ilike(contactsTable.email, parsed.fromEmail));

      if (contact) {
        relatedContactId = contact.id;
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
      }
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

    await db.insert(activitiesTable).values({
      type: "email",
      subject: `Inbound: ${parsed.subject}`,
      description: parsed.message?.substring(0, 500) || "",
      status: "completed",
      contactId: relatedContactId ?? null,
      leadId: relatedLeadId ?? null,
      opportunityId: relatedOpportunityId ?? null,
    });

    res.status(201).json({
      success: true,
      email,
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
    const emails = await db
      .select()
      .from(emailsTable)
      .orderBy(desc(emailsTable.createdAt));
    res.json({ emails });
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
