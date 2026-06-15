import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { leadsTable, usersTable, contactsTable, accountsTable, opportunitiesTable, leadContactsTable, activitiesTable, leadInsightsTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { computeLeadScore } from "../lib/lead-scoring";
import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();
router.use("/leads", requireScreenAccess("leads"));

const leadFields = {
  id: leadsTable.id,
  firstName: leadsTable.firstName,
  lastName: leadsTable.lastName,
  email: leadsTable.email,
  phone: leadsTable.phone,
  website: leadsTable.website,
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
  buyerClassification: leadsTable.buyerClassification,
  insightsGeneratedAt: leadsTable.insightsGeneratedAt,
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

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(whereClause);
    res.json({ data: data.map(formatLead), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads", async (req, res) => {
  try {
    const body = { ...req.body };
    // Auto-compute lead score unless caller explicitly supplied one (manual override).
    if (body.score == null || body.score === "") {
      body.score = computeLeadScore({
        email: body.email,
        phone: body.phone,
        company: body.company,
        title: body.title,
        industry: body.industry,
        description: body.description,
        source: body.source,
        status: body.status,
        employees: body.employees,
        annualRevenue: body.annualRevenue,
      }).total;
    }
    const [lead] = await db.insert(leadsTable).values(body).returning();
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
    const allowedFields = [
      "firstName", "lastName", "email", "phone", "website", "company", "title",
      "status", "source", "score", "assignedTo",
      "industry", "employees", "annualRevenue", "description",
    ] as const;
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (key in req.body) updateData[key] = req.body[key];
    }

    // Auto-recompute score if the caller did not explicitly send `score`,
    // but did change a field that feeds the scoring rubric. Manual `score`
    // values in the request body always take precedence.
    const scoringFields = [
      "email", "phone", "company", "title", "industry",
      "description", "source", "status", "employees", "annualRevenue",
    ] as const;
    const shouldRescore =
      !("score" in req.body) &&
      scoringFields.some((k) => k in req.body);

    if (shouldRescore) {
      const id = parseInt(req.params.id);
      const [current] = await db.select(leadFields).from(leadsTable)
        .leftJoin(usersTable, eq(leadsTable.assignedTo, usersTable.id))
        .where(eq(leadsTable.id, id));
      if (current) {
        const merged = { ...formatLead(current), ...req.body };
        updateData.score = computeLeadScore({
          email: merged.email,
          phone: merged.phone,
          company: merged.company,
          title: merged.title,
          industry: merged.industry,
          description: merged.description,
          source: merged.source,
          status: merged.status,
          employees: merged.employees,
          annualRevenue: merged.annualRevenue,
        }).total;
      }
    }

    const [lead] = await db.update(leadsTable)
      .set(updateData)
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
    await db.transaction(async (tx) => {
      // Detach activities (nullable FK) so history is preserved.
      await tx.update(activitiesTable).set({ leadId: null }).where(eq(activitiesTable.leadId, id));
      // Remove junction rows that hard-reference the lead.
      await tx.delete(leadContactsTable).where(eq(leadContactsTable.leadId, id));
      await tx.delete(leadsTable).where(eq(leadsTable.id, id));
    });
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/leads/:id/convert", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const {
      createContact, createAccount, createOpportunity,
      opportunityName, opportunityAmount,
      existingAccountId, existingContactId,
      existingContactIds,
    } = req.body;

    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    if (lead.isConverted) {
      res.status(409).json({ error: "Lead is already converted" });
      return;
    }

    if (createAccount && !existingAccountId && !lead.company) {
      res.status(400).json({ error: "Lead must have a company name to create an account. Please update the lead's company field first." });
      return;
    }

    if (existingAccountId) {
      const [acct] = await db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.id, existingAccountId));
      if (!acct) {
        res.status(400).json({ error: "Selected account does not exist" });
        return;
      }
    }

    const allContactIds: number[] = existingContactIds?.length
      ? existingContactIds
      : existingContactId ? [existingContactId] : [];

    for (const cId of allContactIds) {
      const [ct] = await db.select({ id: contactsTable.id }).from(contactsTable).where(eq(contactsTable.id, cId));
      if (!ct) {
        res.status(400).json({ error: `Contact ID ${cId} does not exist` });
        return;
      }
    }

    const result = await db.transaction(async (tx) => {
      let contactId: number | null = null;
      const contactIds: number[] = [];
      let accountId: number | null = null;
      let opportunityId: number | null = null;

      if (existingAccountId) {
        accountId = existingAccountId;
      } else if (createAccount && lead.company) {
        const [existingByName] = await tx
          .select({ id: accountsTable.id })
          .from(accountsTable)
          .where(ilike(accountsTable.name, lead.company))
          .limit(1);
        if (existingByName) {
          accountId = existingByName.id;
        } else {
          const [account] = await tx.insert(accountsTable).values({
            name: lead.company,
            industry: lead.industry ?? null,
            employees: lead.employees ?? null,
            annualRevenue: lead.annualRevenue ?? null,
          }).returning();
          accountId = account.id;
        }
      }

      if (allContactIds.length > 0) {
        contactId = allContactIds[0];
        contactIds.push(...allContactIds);
        if (accountId) {
          for (const cId of allContactIds) {
            await tx.update(contactsTable)
              .set({ accountId, updatedAt: new Date() })
              .where(eq(contactsTable.id, cId));
          }
        }
      } else if (createContact) {
        const [contact] = await tx.insert(contactsTable).values({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email ?? null,
          phone: lead.phone ?? null,
          title: lead.title ?? null,
          accountId: accountId,
          leadSource: lead.source ?? null,
        }).returning();
        contactId = contact.id;
        contactIds.push(contact.id);
      }

      if (createOpportunity && !accountId) {
        throw new Error("ACCOUNT_REQUIRED");
      }

      if (createOpportunity && accountId) {
        const [opportunity] = await tx.insert(opportunitiesTable).values({
          name: opportunityName || `${lead.firstName} ${lead.lastName} Opportunity`,
          accountId: accountId,
          contactId: contactId,
          amount: opportunityAmount ?? null,
          stage: "prospecting",
        }).returning();
        opportunityId = opportunity.id;
      }

      await tx.update(leadsTable)
        .set({
          isConverted: true,
          status: "converted",
          convertedContactId: contactId,
          convertedAccountId: accountId,
          convertedOpportunityId: opportunityId,
          updatedAt: new Date(),
        })
        .where(eq(leadsTable.id, leadId));

      if (contactIds.length > 0) {
        await tx.insert(leadContactsTable).values(
          contactIds.map((cId) => ({ leadId, contactId: cId }))
        );
      }

      return { contactId, contactIds, accountId, opportunityId };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof Error && err.message === "ACCOUNT_REQUIRED") {
      res.status(400).json({ error: "An account is required to create an opportunity. Please select or create an account." });
      return;
    }
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /leads/:id/analyze — trigger AI insight analysis
router.post("/leads/:id/analyze", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { analyzeLeadWithAI } = await import("../lib/lead-analyzer");
    const result = await analyzeLeadWithAI(leadId);
    res.json({ success: true, ...result });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Analysis failed" });
  }
});

// GET /leads/:id/insights — fetch stored insights
router.get("/leads/:id/insights", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const [insights] = await db.select().from(leadInsightsTable).where(eq(leadInsightsTable.leadId, leadId));
    res.json({ insights: insights ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});

router.get("/leads/:id/contacts", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const rows = await db
      .select({
        id: contactsTable.id,
        firstName: contactsTable.firstName,
        lastName: contactsTable.lastName,
        email: contactsTable.email,
        phone: contactsTable.phone,
        title: contactsTable.title,
        accountId: contactsTable.accountId,
      })
      .from(leadContactsTable)
      .innerJoin(contactsTable, eq(leadContactsTable.contactId, contactsTable.id))
      .where(eq(leadContactsTable.leadId, leadId));
    res.json({ data: rows });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
