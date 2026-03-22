import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, usersTable, contactsTable, accountsTable, opportunitiesTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const leadFields = {
  id: leadsTable.id,
  firstName: leadsTable.firstName,
  lastName: leadsTable.lastName,
  email: leadsTable.email,
  phone: leadsTable.phone,
  company: leadsTable.company,
  title: leadsTable.title,
  status: leadsTable.status,
  source: leadsTable.source,
  score: leadsTable.score,
  annualRevenue: leadsTable.annualRevenue,
  employees: leadsTable.employees,
  industry: leadsTable.industry,
  description: leadsTable.description,
  assignedTo: leadsTable.assignedTo,
  assignedToName: usersTable.name,
  isConverted: leadsTable.isConverted,
  convertedContactId: leadsTable.convertedContactId,
  convertedAccountId: leadsTable.convertedAccountId,
  convertedOpportunityId: leadsTable.convertedOpportunityId,
  createdAt: leadsTable.createdAt,
  updatedAt: leadsTable.updatedAt,
};

function formatLead(l: { annualRevenue: string | null; [key: string]: unknown }) {
  return { ...l, annualRevenue: l.annualRevenue ? Number(l.annualRevenue) : null };
}

router.get("/leads", async (req, res) => {
  try {
    const { search, status, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(leadFields)
      .from(leadsTable)
      .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id));

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(leadsTable.firstName, `%${search}%`),
        ilike(leadsTable.lastName, `%${search}%`),
        ilike(leadsTable.company, `%${search}%`)
      )!);
    }
    if (status) conditions.push(eq(leadsTable.status, status));
    if (assignedTo) conditions.push(eq(leadsTable.assignedTo, parseInt(assignedTo)));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable);
    res.json({ data: data.map(formatLead), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const [lead] = await db.insert(leadsTable).values(req.body).returning();
    res.status(201).json(formatLead(lead));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/leads/:id", async (req, res) => {
  try {
    const [lead] = await db
      .select(leadFields)
      .from(leadsTable)
      .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
      .where(eq(leadsTable.id, parseInt(req.params.id)));

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
    } else {
      res.json(formatLead(lead));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/leads/:id", async (req, res) => {
  try {
    const [lead] = await db.update(leadsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(leadsTable.id, parseInt(req.params.id)))
      .returning();
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
    } else {
      res.json(formatLead(lead));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/leads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(leadsTable).where(eq(leadsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads/:id/convert", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { createContact, createAccount, createOpportunity, opportunityName, opportunityAmount } = req.body;

    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    let contactId: number | null = null;
    let accountId: number | null = null;
    let opportunityId: number | null = null;

    if (createAccount && lead.company) {
      const [account] = await db.insert(accountsTable).values({
        name: lead.company,
        industry: lead.industry ?? null,
        employees: lead.employees ?? null,
        annualRevenue: lead.annualRevenue ?? null,
      }).returning();
      accountId = account.id;
    }

    if (createContact) {
      const [contact] = await db.insert(contactsTable).values({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        title: lead.title ?? null,
        accountId: accountId,
        leadSource: lead.source ?? null,
      }).returning();
      contactId = contact.id;
    }

    if (createOpportunity) {
      const [opportunity] = await db.insert(opportunitiesTable).values({
        name: opportunityName || `${lead.firstName} ${lead.lastName} Opportunity`,
        accountId: accountId,
        contactId: contactId,
        amount: opportunityAmount ?? null,
        stage: "prospecting",
      }).returning();
      opportunityId = opportunity.id;
    }

    await db.update(leadsTable)
      .set({
        isConverted: true,
        status: "converted",
        convertedContactId: contactId,
        convertedAccountId: accountId,
        convertedOpportunityId: opportunityId,
        updatedAt: new Date(),
      })
      .where(eq(leadsTable.id, leadId));

    res.json({ success: true, contactId, accountId, opportunityId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
