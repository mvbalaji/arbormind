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

// POST /leads/:id/find-contacts — scrape website + GPT-4o to extract real contacts
router.post("/leads/:id/find-contacts", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const website = lead.website ?? null;
    const domain = website
      ? website.replace(/^https?:\/\//, "").split("/")[0]
      : lead.email?.includes("@") ? lead.email.split("@")[1] : null;

    if (!website && !domain) {
      return res.status(400).json({ error: "No website or email domain available. Add a website to this lead first." });
    }

    const { findContactsFromWebsite } = await import("../lib/contact-finder");
    const result = await findContactsFromWebsite({
      websiteUrl: website ?? `https://${domain}`,
      companyName: lead.company ?? domain ?? "Unknown",
      domain: domain ?? "",
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Contact search failed" });
  }
});

// POST /leads/:id/add-found-contact — create a CRM contact and link it to the lead
router.post("/leads/:id/add-found-contact", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const { firstName, lastName, title, email, phone, linkedinUrl } = req.body as {
      firstName: string; lastName: string; title?: string;
      email?: string; phone?: string; linkedinUrl?: string;
    };

    if (!firstName || !lastName) return res.status(400).json({ error: "firstName and lastName are required" });

    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    // Check if contact with this email already linked
    if (email) {
      const existing = await db.select({ id: contactsTable.id })
        .from(contactsTable)
        .where(eq(contactsTable.email, email))
        .limit(1);
      if (existing.length > 0) {
        const contactId = existing[0].id;
        // Link if not already linked
        await db.insert(leadContactsTable).values({ leadId, contactId }).onConflictDoNothing();
        const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, contactId));
        return res.status(200).json({ contact, linked: true, alreadyExisted: true });
      }
    }

    const [contact] = await db.insert(contactsTable).values({
      firstName,
      lastName,
      title: title ?? null,
      email: email ?? null,
      phone: phone ?? null,
      description: linkedinUrl ? `LinkedIn: ${linkedinUrl}` : null,
      leadSource: "website",
    }).returning();

    await db.insert(leadContactsTable).values({ leadId, contactId: contact.id });

    res.status(201).json({ contact, linked: true, alreadyExisted: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add contact" });
  }
});

// POST /leads/:id/hunter — look up contacts via Hunter.io domain search
router.post("/leads/:id/hunter", async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) return res.status(400).json({ error: "Hunter.io API key not configured. Add HUNTER_API_KEY to your environment secrets." });

    const domain = lead.website
      ? lead.website.replace(/^https?:\/\//, "").split("/")[0]
      : lead.email?.includes("@") ? lead.email.split("@")[1] : null;

    if (!domain) return res.status(400).json({ error: "No company domain available. Add a website to this lead first." });

    const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=5&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as {
      data?: {
        domain: string;
        organization: string;
        pattern: string;
        emails: Array<{ value: string; first_name: string; last_name: string; position: string; confidence: number; linkedin_url?: string; }>;
      };
      errors?: Array<{ details: string }>;
    };

    if (!response.ok || data.errors?.length) {
      return res.status(400).json({ error: data.errors?.[0]?.details ?? "Hunter.io lookup failed" });
    }

    res.json({
      domain,
      organization: data.data?.organization ?? null,
      pattern: data.data?.pattern ?? null,
      emails: data.data?.emails ?? [],
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Hunter.io lookup failed" });
  }
});

export default router;
