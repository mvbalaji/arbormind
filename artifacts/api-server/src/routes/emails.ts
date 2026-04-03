import { Router } from "express";
import { db, emailsTable, leadsTable, opportunitiesTable, contactsTable, insertEmailSchema } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const router = Router();

// Check if email sender is known customer (exists in contacts)
async function checkIfKnownCustomer(email: string) {
  const [contact] = await db
    .select({ id: contactsTable.id })
    .from(contactsTable)
    .where(like(contactsTable.email, email));
  return !!contact;
}

// POST: Receive email from support inbox
router.post("/emails", async (req, res) => {
  try {
    const parsed = insertEmailSchema.parse(req.body);
    const isKnown = await checkIfKnownCustomer(parsed.fromEmail);
    
    let relatedLeadId: number | undefined;
    let relatedOpportunityId: number | undefined;
    let relatedContactId: number | undefined;

    // Known customer: Create Opportunity
    if (isKnown) {
      const [contact] = await db
        .select({ id: contactsTable.id })
        .from(contactsTable)
        .where(eq(contactsTable.email, parsed.fromEmail));
      
      if (contact) {
        relatedContactId = contact.id;
        
        const [opportunity] = await db
          .insert(opportunitiesTable)
          .values({
            title: parsed.subject,
            description: parsed.message,
            stage: "Prospecting",
            probability: 30,
            value: 0,
            expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            ownerId: 1, // Will be assigned by sales team
          })
          .returning();
        relatedOpportunityId = opportunity?.id;
      }
    } else {
      // New customer: Create Lead
      const [lead] = await db
        .insert(leadsTable)
        .values({
          firstName: parsed.fromName.split(" ")[0],
          lastName: parsed.fromName.split(" ").slice(1).join(" ") || "Unknown",
          email: parsed.fromEmail,
          phone: "",
          company: "",
          source: "Email Inquiry",
          status: "New",
          ownerId: 1, // Will be assigned by sales team
        })
        .returning();
      relatedLeadId = lead?.id;
    }

    // Store email
    const [email] = await db
      .insert(emailsTable)
      .values({
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        subject: parsed.subject,
        message: parsed.message,
        status: "replied",
        isKnownCustomer: isKnown ? "true" : "false",
        relatedContactId,
        relatedLeadId,
        relatedOpportunityId,
        notes: `Auto-${isKnown ? "created Opportunity" : "created Lead"}`,
      })
      .returning();

    res.status(201).json({ 
      success: true, 
      email,
      message: isKnown 
        ? "New product inquiry - sales team will get in touch with you shortly."
        : "Thank you for your inquiry - our sales team will get in touch with you shortly.",
    });
    return;
  } catch (err) {
    console.error("Email submission error:", err);
    res.status(400).json({ error: "Failed to process email" });
    return;
  }
});

// GET: List all emails (admin only)
router.get("/emails", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = req.user as { role?: string } | undefined;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden - Admin only" });
      return;
    }

    const emails = await db
      .select()
      .from(emailsTable)
      .orderBy(emailsTable.createdAt);

    res.json({ emails });
    return;
  } catch (err) {
    console.error("Fetch emails error:", err);
    res.status(500).json({ error: "Failed to fetch emails" });
    return;
  }
});

// PATCH: Update email status or assign
router.patch("/emails/:id", async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = req.user as { role?: string } | undefined;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden - Admin only" });
      return;
    }

    const { status, notes } = req.body;
    const emailId = parseInt(req.params.id, 10);

    const [email] = await db
      .update(emailsTable)
      .set({
        status: status || undefined,
        notes: notes || undefined,
        updatedAt: new Date(),
      })
      .where(eq(emailsTable.id, emailId))
      .returning();

    res.json({ success: true, email });
    return;
  } catch (err) {
    console.error("Update email error:", err);
    res.status(500).json({ error: "Failed to update email" });
    return;
  }
});

export default router;
