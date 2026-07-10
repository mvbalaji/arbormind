import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  leadsTable, contactsTable, accountsTable, opportunitiesTable,
  activitiesTable, casesTable, quotesTable, ordersTable,
} from "@workspace/db";
import { sql, and, eq, or, ilike, gte, lte, desc, isNull } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

interface ChatCompletionsAPI {
  create(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_completion_tokens?: number;
    response_format?: { type: "json_object" | "text" };
  }): Promise<{
    choices: Array<{ message?: { content?: string | null } }>;
  }>;
}

interface OpenAIClient {
  chat: { completions: ChatCompletionsAPI };
}

const router: IRouter = Router();

let _openai: OpenAIClient | null = null;

async function getOpenAI(): Promise<OpenAIClient | null> {
  if (_openai) return _openai;
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openai = mod.openai;
    return _openai;
  } catch {
    return null;
  }
}

interface SessionUser {
  id: number;
  email: string;
  role: string;
}

function getSessionUser(req: Request): SessionUser | null {
  const session = req.session as Record<string, unknown> | undefined;
  const user = session?.user ?? req.user ?? null;
  return user as SessionUser | null;
}

function requireAuth(req: Request, res: Response): boolean {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

/* ========================================================================
 * AGENTIC TOOLS — read-only Phase 1
 * Each tool is a typed function the LLM can call to query live CRM data.
 * ====================================================================== */

const gbp = (n: number | string | null | undefined): string =>
  `£${Number(n ?? 0).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const TOOL_DEFS = [
  {
    name: "search_leads",
    description:
      "Search leads by free-text query (matches name/email/company), status, and conversion state. Returns up to `limit` results (default 10, max 50).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text query — matches first/last name, email, company" },
        status: { type: "string", enum: ["new", "contacted", "qualified", "unqualified", "lost"] },
        isConverted: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "search_opportunities",
    description:
      "Search opportunities. Filter by stage, minimum amount, and optionally only those assigned to the current user. Returns up to `limit` results (default 10, max 50).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text query — matches name and description" },
        stage: {
          type: "string",
          enum: ["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"],
        },
        minAmount: { type: "number", description: "Minimum amount in GBP" },
        assignedToMe: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "search_accounts",
    description: "Search accounts by name/industry/website. Returns up to `limit` (default 10, max 50).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        industry: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "search_contacts",
    description: "Search contacts by name/email/title. Returns up to `limit` (default 10, max 50).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "get_entity_details",
    description: "Get the full details for a single record by id.",
    input_schema: {
      type: "object",
      properties: {
        entityType: {
          type: "string",
          enum: ["lead", "opportunity", "account", "contact", "activity"],
        },
        id: { type: "integer" },
      },
      required: ["entityType", "id"],
    },
  },
  {
    name: "list_my_activities",
    description:
      "List activities assigned to the CURRENT user (the person chatting). Use `overdueOnly` to filter to overdue planned items, or `status` to filter by status.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["planned", "in_progress", "completed", "cancelled"] },
        overdueOnly: { type: "boolean" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "get_pipeline_summary",
    description:
      "Aggregated pipeline by stage. Returns count and total GBP amount per stage for open opportunities, plus grand total.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_lead_sources_summary",
    description: "Lead counts grouped by source (web, referral, etc).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_revenue_summary",
    description: "Revenue from closed-won opportunities in a period.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["month", "quarter", "year", "all_time"] },
      },
    },
  },
  {
    name: "get_top_opportunities",
    description: "Top open opportunities sorted by amount (highest first).",
    input_schema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 20 } },
    },
  },
  {
    name: "get_workspace_overview",
    description:
      "High-level counts across the entire workspace (leads, contacts, accounts, opps, activities, cases, quotes, orders) plus pipeline value and won revenue.",
    input_schema: { type: "object", properties: {} },
  },

  /* ---------- WRITE TOOLS (Phase 2 — agentic actions) ---------- */
  {
    name: "create_lead",
    description: "Create a new lead. Requires firstName and lastName. Other fields optional. Returns the created lead.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        company: { type: "string" },
        title: { type: "string" },
        source: { type: "string" },
        status: { type: "string", enum: ["new","contacted","qualified","unqualified","lost"] },
        score: { type: "integer", minimum: 0, maximum: 100 },
        description: { type: "string" },
      },
      required: ["firstName","lastName"],
    },
  },
  {
    name: "update_lead",
    description: "Update an existing lead. Provide id and any subset of fields to change.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "integer" },
        status: { type: "string", enum: ["new","contacted","qualified","unqualified","lost"] },
        score: { type: "integer", minimum: 0, maximum: 100 },
        assignedTo: { type: "integer", description: "user id to assign to" },
        phone: { type: "string" },
        email: { type: "string" },
        company: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_contact",
    description: "Create a new contact. Requires firstName, lastName.",
    input_schema: {
      type: "object",
      properties: {
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        title: { type: "string" },
        accountId: { type: "integer" },
        leadSource: { type: "string" },
        description: { type: "string" },
      },
      required: ["firstName","lastName"],
    },
  },
  {
    name: "create_opportunity",
    description: "Create a new opportunity. Requires name. Amount in GBP.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        accountId: { type: "integer" },
        contactId: { type: "integer" },
        amount: { type: "number" },
        stage: { type: "string", enum: ["prospecting","qualification","proposal","negotiation","closed_won","closed_lost"] },
        probability: { type: "integer", minimum: 0, maximum: 100 },
        closeDate: { type: "string", description: "ISO date (YYYY-MM-DD)" },
        nextStep: { type: "string" },
        description: { type: "string" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_opportunity",
    description: "Update an opportunity — stage, amount, nextStep, closeDate, probability.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "integer" },
        stage: { type: "string", enum: ["prospecting","qualification","proposal","negotiation","closed_won","closed_lost"] },
        amount: { type: "number" },
        probability: { type: "integer", minimum: 0, maximum: 100 },
        closeDate: { type: "string", description: "ISO date (YYYY-MM-DD)" },
        nextStep: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "create_activity",
    description: "Create / log an activity (call, email, meeting, task, note). Link to a lead/contact/opportunity/account. dueDate is ISO.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["call","email","meeting","task","note"] },
        subject: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["planned","in_progress","completed","cancelled"] },
        dueDate: { type: "string", description: "ISO datetime" },
        leadId: { type: "integer" },
        contactId: { type: "integer" },
        opportunityId: { type: "integer" },
        accountId: { type: "integer" },
        assignToMe: { type: "boolean", description: "If true, assign to the current user" },
      },
      required: ["type","subject"],
    },
  },
  {
    name: "complete_activity",
    description: "Mark an activity as completed.",
    input_schema: {
      type: "object",
      properties: { id: { type: "integer" } },
      required: ["id"],
    },
  },
] as const;

type ToolInput = Record<string, unknown>;

async function runTool(
  name: string,
  input: ToolInput,
  user: SessionUser,
): Promise<unknown> {
  const limit = Math.min(Number(input.limit ?? 10) || 10, 50);

  switch (name) {
    case "search_leads": {
      const q = typeof input.query === "string" ? input.query.trim() : "";
      const conds = [];
      if (q) {
        conds.push(
          or(
            ilike(leadsTable.firstName, `%${q}%`),
            ilike(leadsTable.lastName, `%${q}%`),
            ilike(leadsTable.email, `%${q}%`),
            ilike(leadsTable.company, `%${q}%`),
          ),
        );
      }
      if (typeof input.status === "string") conds.push(eq(leadsTable.status, input.status));
      if (typeof input.isConverted === "boolean") conds.push(eq(leadsTable.isConverted, input.isConverted));
      const rows = await db
        .select({
          id: leadsTable.id, firstName: leadsTable.firstName, lastName: leadsTable.lastName,
          email: leadsTable.email, company: leadsTable.company, status: leadsTable.status,
          source: leadsTable.source, score: leadsTable.score, isConverted: leadsTable.isConverted,
          createdAt: leadsTable.createdAt,
        })
        .from(leadsTable)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(leadsTable.createdAt))
        .limit(limit);
      return { count: rows.length, results: rows };
    }

    case "search_opportunities": {
      const q = typeof input.query === "string" ? input.query.trim() : "";
      const conds = [];
      if (q) {
        conds.push(
          or(ilike(opportunitiesTable.name, `%${q}%`), ilike(opportunitiesTable.description, `%${q}%`)),
        );
      }
      if (typeof input.stage === "string") conds.push(eq(opportunitiesTable.stage, input.stage));
      if (typeof input.minAmount === "number")
        conds.push(gte(opportunitiesTable.amount, String(input.minAmount)));
      if (input.assignedToMe === true) conds.push(eq(opportunitiesTable.assignedTo, user.id));
      const rows = await db
        .select({
          id: opportunitiesTable.id, name: opportunitiesTable.name,
          stage: opportunitiesTable.stage, amount: opportunitiesTable.amount,
          probability: opportunitiesTable.probability, closeDate: opportunitiesTable.closeDate,
          accountId: opportunitiesTable.accountId, assignedTo: opportunitiesTable.assignedTo,
        })
        .from(opportunitiesTable)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(opportunitiesTable.amount))
        .limit(limit);
      return {
        count: rows.length,
        results: rows.map((r) => ({ ...r, amountFormatted: gbp(r.amount) })),
      };
    }

    case "search_accounts": {
      const q = typeof input.query === "string" ? input.query.trim() : "";
      const conds = [];
      if (q) {
        conds.push(
          or(
            ilike(accountsTable.name, `%${q}%`),
            ilike(accountsTable.industry, `%${q}%`),
            ilike(accountsTable.website, `%${q}%`),
          ),
        );
      }
      if (typeof input.industry === "string") conds.push(eq(accountsTable.industry, input.industry));
      const rows = await db
        .select({
          id: accountsTable.id, name: accountsTable.name, industry: accountsTable.industry,
          website: accountsTable.website, employees: accountsTable.employees,
          annualRevenue: accountsTable.annualRevenue, status: accountsTable.status,
          country: accountsTable.country,
        })
        .from(accountsTable)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(accountsTable.annualRevenue))
        .limit(limit);
      return {
        count: rows.length,
        results: rows.map((r) => ({ ...r, annualRevenueFormatted: gbp(r.annualRevenue) })),
      };
    }

    case "search_contacts": {
      const q = typeof input.query === "string" ? input.query.trim() : "";
      const conds = [];
      if (q) {
        conds.push(
          or(
            ilike(contactsTable.firstName, `%${q}%`),
            ilike(contactsTable.lastName, `%${q}%`),
            ilike(contactsTable.email, `%${q}%`),
            ilike(contactsTable.title, `%${q}%`),
          ),
        );
      }
      const rows = await db
        .select({
          id: contactsTable.id, firstName: contactsTable.firstName, lastName: contactsTable.lastName,
          email: contactsTable.email, phone: contactsTable.phone, title: contactsTable.title,
          accountId: contactsTable.accountId,
        })
        .from(contactsTable)
        .where(conds.length ? and(...conds) : undefined)
        .orderBy(desc(contactsTable.createdAt))
        .limit(limit);
      return { count: rows.length, results: rows };
    }

    case "get_entity_details": {
      const id = Number(input.id);
      const type = String(input.entityType);
      if (!id) return { error: "Invalid id" };
      switch (type) {
        case "lead": {
          const [row] = await db.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
          return row ?? { error: "Lead not found" };
        }
        case "opportunity": {
          const [row] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).limit(1);
          return row ? { ...row, amountFormatted: gbp(row.amount) } : { error: "Opportunity not found" };
        }
        case "account": {
          const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, id)).limit(1);
          return row ? { ...row, annualRevenueFormatted: gbp(row.annualRevenue) } : { error: "Account not found" };
        }
        case "contact": {
          const [row] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
          return row ?? { error: "Contact not found" };
        }
        case "activity": {
          const [row] = await db.select().from(activitiesTable).where(eq(activitiesTable.id, id)).limit(1);
          return row ?? { error: "Activity not found" };
        }
        default:
          return { error: "Unknown entityType" };
      }
    }

    case "list_my_activities": {
      const conds = [eq(activitiesTable.assignedTo, user.id)];
      if (input.overdueOnly === true) {
        conds.push(eq(activitiesTable.status, "planned"));
        conds.push(lte(activitiesTable.dueDate, new Date()));
      } else if (typeof input.status === "string") {
        conds.push(eq(activitiesTable.status, input.status));
      }
      const rows = await db
        .select({
          id: activitiesTable.id, type: activitiesTable.type, subject: activitiesTable.subject,
          status: activitiesTable.status, dueDate: activitiesTable.dueDate,
          leadId: activitiesTable.leadId, opportunityId: activitiesTable.opportunityId,
          accountId: activitiesTable.accountId,
        })
        .from(activitiesTable)
        .where(and(...conds))
        .orderBy(activitiesTable.dueDate)
        .limit(limit);
      return { count: rows.length, results: rows };
    }

    case "get_pipeline_summary": {
      const rows = await db
        .select({
          stage: opportunitiesTable.stage,
          count: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(amount), 0)`,
        })
        .from(opportunitiesTable)
        .where(sql`stage NOT IN ('closed_won', 'closed_lost')`)
        .groupBy(opportunitiesTable.stage);
      const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);
      return {
        byStage: rows.map((r) => ({
          stage: r.stage, count: Number(r.count),
          total: Number(r.total), totalFormatted: gbp(r.total),
        })),
        grandTotal, grandTotalFormatted: gbp(grandTotal),
      };
    }

    case "get_lead_sources_summary": {
      const rows = await db
        .select({
          source: leadsTable.source,
          count: sql<number>`count(*)`,
          converted: sql<number>`count(*) filter (where is_converted = true)`,
        })
        .from(leadsTable)
        .groupBy(leadsTable.source);
      return rows.map((r) => ({
        source: r.source ?? "(unknown)",
        count: Number(r.count),
        converted: Number(r.converted),
        conversionRate: Number(r.count) > 0
          ? Math.round((Number(r.converted) / Number(r.count)) * 100)
          : 0,
      }));
    }

    case "get_revenue_summary": {
      const period = String(input.period ?? "all_time");
      let since: Date | null = null;
      const now = new Date();
      if (period === "month") since = new Date(now.getFullYear(), now.getMonth(), 1);
      else if (period === "quarter") {
        const q = Math.floor(now.getMonth() / 3);
        since = new Date(now.getFullYear(), q * 3, 1);
      } else if (period === "year") since = new Date(now.getFullYear(), 0, 1);
      const conds = [eq(opportunitiesTable.stage, "closed_won")];
      if (since) conds.push(gte(opportunitiesTable.closeDate, since));
      const [row] = await db
        .select({
          count: sql<number>`count(*)`,
          revenue: sql<number>`coalesce(sum(amount), 0)`,
        })
        .from(opportunitiesTable)
        .where(and(...conds));
      return {
        period,
        wonCount: Number(row?.count ?? 0),
        revenue: Number(row?.revenue ?? 0),
        revenueFormatted: gbp(row?.revenue ?? 0),
      };
    }

    case "get_top_opportunities": {
      const rows = await db
        .select({
          id: opportunitiesTable.id, name: opportunitiesTable.name,
          stage: opportunitiesTable.stage, amount: opportunitiesTable.amount,
          probability: opportunitiesTable.probability, closeDate: opportunitiesTable.closeDate,
        })
        .from(opportunitiesTable)
        .where(sql`stage NOT IN ('closed_won', 'closed_lost')`)
        .orderBy(sql`amount desc nulls last`)
        .limit(limit);
      return rows.map((r) => ({ ...r, amountFormatted: gbp(r.amount) }));
    }

    case "get_workspace_overview": {
      const [
        leadsC, contactsC, accountsC, oppsC, activitiesC, casesC, quotesC, ordersC,
        pipeline, won,
      ] = await Promise.all([
        db.select({ c: sql<number>`count(*)` }).from(leadsTable),
        db.select({ c: sql<number>`count(*)` }).from(contactsTable),
        db.select({ c: sql<number>`count(*)` }).from(accountsTable),
        db.select({ c: sql<number>`count(*)` }).from(opportunitiesTable),
        db.select({ c: sql<number>`count(*)` }).from(activitiesTable),
        db.select({ c: sql<number>`count(*)` }).from(casesTable),
        db.select({ c: sql<number>`count(*)` }).from(quotesTable),
        db.select({ c: sql<number>`count(*)` }).from(ordersTable),
        db.select({ t: sql<number>`coalesce(sum(amount), 0)` }).from(opportunitiesTable)
          .where(sql`stage NOT IN ('closed_won', 'closed_lost')`),
        db.select({ c: sql<number>`count(*)`, r: sql<number>`coalesce(sum(amount), 0)` })
          .from(opportunitiesTable).where(eq(opportunitiesTable.stage, "closed_won")),
      ]);
      return {
        counts: {
          leads: Number(leadsC[0].c), contacts: Number(contactsC[0].c),
          accounts: Number(accountsC[0].c), opportunities: Number(oppsC[0].c),
          activities: Number(activitiesC[0].c), cases: Number(casesC[0].c),
          quotes: Number(quotesC[0].c), orders: Number(ordersC[0].c),
        },
        openPipeline: Number(pipeline[0].t),
        openPipelineFormatted: gbp(pipeline[0].t),
        wonCount: Number(won[0].c),
        wonRevenue: Number(won[0].r),
        wonRevenueFormatted: gbp(won[0].r),
      };
    }

    /* ---------- WRITE TOOLS ---------- */
    case "create_lead": {
      const [row] = await db.insert(leadsTable).values({
        firstName: String(input.firstName),
        lastName: String(input.lastName),
        email: input.email ? String(input.email) : null,
        phone: input.phone ? String(input.phone) : null,
        company: input.company ? String(input.company) : null,
        title: input.title ? String(input.title) : null,
        source: input.source ? String(input.source) : null,
        status: typeof input.status === "string" ? input.status : "new",
        score: typeof input.score === "number" ? input.score : null,
        description: input.description ? String(input.description) : null,
        assignedTo: user.id,
      }).returning();
      return { ok: true, created: "lead", lead: row };
    }

    case "update_lead": {
      const id = Number(input.id);
      if (!id) return { error: "id required" };
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof input.status === "string") patch.status = input.status;
      if (typeof input.score === "number") patch.score = input.score;
      if (typeof input.assignedTo === "number") patch.assignedTo = input.assignedTo;
      if (typeof input.phone === "string") patch.phone = input.phone;
      if (typeof input.email === "string") patch.email = input.email;
      if (typeof input.company === "string") patch.company = input.company;
      if (typeof input.title === "string") patch.title = input.title;
      if (typeof input.description === "string") patch.description = input.description;
      const [row] = await db.update(leadsTable).set(patch).where(eq(leadsTable.id, id)).returning();
      if (!row) return { error: "Lead not found" };
      return { ok: true, updated: "lead", lead: row };
    }

    case "create_contact": {
      const [row] = await db.insert(contactsTable).values({
        firstName: String(input.firstName),
        lastName: String(input.lastName),
        email: input.email ? String(input.email) : null,
        phone: input.phone ? String(input.phone) : null,
        title: input.title ? String(input.title) : null,
        accountId: typeof input.accountId === "number" ? input.accountId : null,
        leadSource: input.leadSource ? String(input.leadSource) : null,
        description: input.description ? String(input.description) : null,
        ownerId: user.id,
      }).returning();
      return { ok: true, created: "contact", contact: row };
    }

    case "create_opportunity": {
      const [row] = await db.insert(opportunitiesTable).values({
        name: String(input.name),
        accountId: typeof input.accountId === "number" ? input.accountId : null,
        contactId: typeof input.contactId === "number" ? input.contactId : null,
        amount: typeof input.amount === "number" ? String(input.amount) : null,
        stage: typeof input.stage === "string" ? input.stage : "prospecting",
        probability: typeof input.probability === "number" ? input.probability : null,
        closeDate: typeof input.closeDate === "string" ? new Date(input.closeDate) : null,
        nextStep: input.nextStep ? String(input.nextStep) : null,
        description: input.description ? String(input.description) : null,
        assignedTo: user.id,
      }).returning();
      return { ok: true, created: "opportunity", opportunity: row };
    }

    case "update_opportunity": {
      const id = Number(input.id);
      if (!id) return { error: "id required" };
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof input.stage === "string") patch.stage = input.stage;
      if (typeof input.amount === "number") patch.amount = String(input.amount);
      if (typeof input.probability === "number") patch.probability = input.probability;
      if (typeof input.closeDate === "string") patch.closeDate = new Date(input.closeDate);
      if (typeof input.nextStep === "string") patch.nextStep = input.nextStep;
      const [row] = await db.update(opportunitiesTable).set(patch).where(eq(opportunitiesTable.id, id)).returning();
      if (!row) return { error: "Opportunity not found" };
      return { ok: true, updated: "opportunity", opportunity: row };
    }

    case "create_activity": {
      const [row] = await db.insert(activitiesTable).values({
        type: String(input.type),
        subject: String(input.subject),
        description: input.description ? String(input.description) : null,
        status: typeof input.status === "string" ? input.status : "planned",
        dueDate: typeof input.dueDate === "string" ? new Date(input.dueDate) : null,
        leadId: typeof input.leadId === "number" ? input.leadId : null,
        contactId: typeof input.contactId === "number" ? input.contactId : null,
        opportunityId: typeof input.opportunityId === "number" ? input.opportunityId : null,
        accountId: typeof input.accountId === "number" ? input.accountId : null,
        assignedTo: input.assignToMe === false ? null : user.id,
      }).returning();
      return { ok: true, created: "activity", activity: row };
    }

    case "complete_activity": {
      const id = Number(input.id);
      if (!id) return { error: "id required" };
      const [row] = await db.update(activitiesTable)
        .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
        .where(eq(activitiesTable.id, id))
        .returning();
      if (!row) return { error: "Activity not found" };
      return { ok: true, updated: "activity", activity: row };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/* ========================================================================
 * AGENTIC CHAT — Claude tool-use loop
 * ====================================================================== */

interface ClientMessage { role: "user" | "assistant"; content: string }

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicBlock[];
}

router.post("/ai/chat", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req)!;

  try {
    const { messages } = req.body as { messages: ClientMessage[] };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }
    if (messages.length > 50) {
      res.status(400).json({ error: "Too many messages" });
      return;
    }
    for (const m of messages) {
      if (typeof m.content !== "string" || m.content.length > 4000) {
        res.status(400).json({ error: "Invalid message content" });
        return;
      }
      if (m.role !== "user" && m.role !== "assistant") {
        res.status(400).json({ error: "Invalid message role" });
        return;
      }
    }

    const systemPrompt = `You are ArborMind AI, an agentic assistant for the arbormind.in CRM. You help users understand their pipeline, find records, analyse performance, and decide what to do next.

You have access to a set of tools that query the live CRM database. Use them whenever the user asks about data — do NOT guess or rely on stale knowledge. Chain multiple tool calls when needed (e.g. search to find an id, then get_entity_details for a deep dive).

Current user: id=${user.id}, email=${user.email}, role=${user.role}. When the user says "my", "I", or "mine", scope queries to this user (use assignedToMe=true on opportunities, or list_my_activities for tasks).

Guidelines:
- Be concise and action-oriented. Lead with the answer, then a short justification.
- All currency is British Pounds (£) — never use $ or €.
- Format numbers with commas. Use the *Formatted variants returned by tools where present.
- When listing >3 items, use a markdown bullet list. When showing tabular data, prefer a small markdown table.
- Reference record names and ids so the user can act on them.
- Suggest a clear next step at the end when relevant (e.g. "Want me to find the contacts for these accounts?").
- If a tool returns 0 results, say so plainly and suggest broadening the query.
- You now have WRITE tools (Phase 2): create_lead, update_lead, create_contact, create_opportunity, update_opportunity, create_activity, complete_activity. Use them when the user asks to add, log, update, assign, advance, or schedule something.
- IMPORTANT before any write: (1) confirm intent if the user's request is ambiguous; (2) for updates, look up the record first with a search tool to confirm the id; (3) after a successful write, summarise what was done with the new id and offer a follow-up (e.g. "Created lead #42 — want me to log a follow-up call for tomorrow?").
- Never invent ids. Never bulk-delete. If a destructive action is requested (delete records), refuse politely and suggest the user do it manually.`;

    const convo: AnthropicMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

    const MAX_ITERATIONS = 6;
    let finalText = "";

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        tools: TOOL_DEFS as unknown as Parameters<typeof anthropic.messages.create>[0]["tools"],
        messages: convo as Parameters<typeof anthropic.messages.create>[0]["messages"],
      });

      const blocks = response.content as AnthropicBlock[];
      const toolUses = blocks.filter((b): b is Extract<AnthropicBlock, { type: "tool_use" }> => b.type === "tool_use");
      const textBlocks = blocks.filter((b): b is Extract<AnthropicBlock, { type: "text" }> => b.type === "text");

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        finalText = textBlocks.map((b) => b.text).join("\n").trim();
        break;
      }

      // Append assistant's tool_use turn
      convo.push({ role: "assistant", content: blocks });

      // Execute tools in parallel
      const toolResults = await Promise.all(
        toolUses.map(async (tu) => {
          try {
            const result = await runTool(tu.name, tu.input ?? {}, user);
            return { tool_use_id: tu.id, content: JSON.stringify(result).slice(0, 12000) };
          } catch (err) {
            req.log.error({ err, tool: tu.name }, "tool execution failed");
            return { tool_use_id: tu.id, content: JSON.stringify({ error: "Tool execution failed" }) };
          }
        }),
      );

      convo.push({
        role: "user",
        content: toolResults.map((tr) => ({
          type: "tool_result" as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        })),
      });
    }

    if (!finalText) finalText = "I couldn't complete that request in time. Please rephrase or try a simpler question.";
    res.json({ reply: finalText });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI service error" });
  }
});

/* ========================================================================
 * AI Summary endpoint (unchanged) — used by ai-summary cards on detail pages
 * ====================================================================== */

router.post("/ai/summary", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const openai = await getOpenAI();
  if (!openai) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  try {
    const { entityType, context } = req.body as { entityType: string; context?: string };
    if (!entityType || typeof entityType !== "string") {
      res.status(400).json({ error: "entityType is required" });
      return;
    }

    let dataContext = "";

    switch (entityType) {
      case "leads": {
        const stats = await db.select({
          total: sql<number>`count(*)`,
          newCount: sql<number>`count(*) filter (where status = 'new')`,
          contactedCount: sql<number>`count(*) filter (where status = 'contacted')`,
          qualifiedCount: sql<number>`count(*) filter (where status = 'qualified')`,
          avgScore: sql<number>`coalesce(avg(score), 0)`,
        }).from(leadsTable);
        dataContext = `Leads: ${stats[0].total} total, ${stats[0].newCount} new, ${stats[0].contactedCount} contacted, ${stats[0].qualifiedCount} qualified. Average score: ${Math.round(Number(stats[0].avgScore))}.`;
        break;
      }
      case "contacts": {
        const stats = await db.select({ total: sql<number>`count(*)` }).from(contactsTable);
        const withAccount = await db.select({ count: sql<number>`count(*)` }).from(contactsTable).where(sql`account_id is not null`);
        dataContext = `Contacts: ${stats[0].total} total, ${withAccount[0].count} linked to accounts.`;
        break;
      }
      case "accounts": {
        const stats = await db.select({
          total: sql<number>`count(*)`,
        }).from(accountsTable);
        dataContext = `Accounts: ${stats[0].total} total.`;
        break;
      }
      case "opportunities": {
        const stats = await db.select({
          total: sql<number>`count(*)`,
          openCount: sql<number>`count(*) filter (where stage not in ('closed_won', 'closed_lost'))`,
          wonCount: sql<number>`count(*) filter (where stage = 'closed_won')`,
          lostCount: sql<number>`count(*) filter (where stage = 'closed_lost')`,
          totalPipeline: sql<number>`coalesce(sum(case when stage not in ('closed_won', 'closed_lost') then amount else 0 end), 0)`,
          avgProbability: sql<number>`coalesce(avg(probability), 0)`,
        }).from(opportunitiesTable);
        const s = stats[0];
        const winRate = (Number(s.wonCount) + Number(s.lostCount)) > 0
          ? Math.round(Number(s.wonCount) / (Number(s.wonCount) + Number(s.lostCount)) * 100)
          : 0;
        dataContext = `Opportunities: ${s.total} total, ${s.openCount} open (pipeline: £${Number(s.totalPipeline).toLocaleString()}), ${s.wonCount} won, ${s.lostCount} lost. Win rate: ${winRate}%. Avg probability: ${Math.round(Number(s.avgProbability))}%.`;
        break;
      }
      case "activities": {
        const stats = await db.select({
          total: sql<number>`count(*)`,
          planned: sql<number>`count(*) filter (where status = 'planned')`,
          completed: sql<number>`count(*) filter (where status = 'completed')`,
        }).from(activitiesTable);
        dataContext = `Activities: ${stats[0].total} total, ${stats[0].planned} planned, ${stats[0].completed} completed.`;
        break;
      }
      case "quotes": {
        const stats = await db.select({
          total: sql<number>`count(*)`,
          draft: sql<number>`count(*) filter (where status = 'draft')`,
          sent: sql<number>`count(*) filter (where status = 'sent')`,
          accepted: sql<number>`count(*) filter (where status = 'accepted')`,
          totalValue: sql<number>`coalesce(sum(total), 0)`,
        }).from(quotesTable);
        dataContext = `Quotes: ${stats[0].total} total, ${stats[0].draft} draft, ${stats[0].sent} sent, ${stats[0].accepted} accepted. Total value: £${Number(stats[0].totalValue).toLocaleString()}.`;
        break;
      }
      default:
        dataContext = context ?? "No specific data available.";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: `You are a CRM analytics assistant. Generate a brief, insightful summary (2-4 sentences) about the given CRM entity data. Focus on key metrics, trends, and actionable recommendations. Be concise.`,
        },
        {
          role: "user",
          content: `Generate a summary for ${entityType}:\n${dataContext}${context ? `\nAdditional context: ${context}` : ""}`,
        },
      ],
      max_completion_tokens: 256,
    });

    const summary = completion.choices[0]?.message?.content ?? "Unable to generate summary.";
    res.json({ summary });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI service error" });
  }
});

/* ========================================================================
 * NEXT BEST ACTIONS — Phase 2 agentic suggestions per entity
 * ====================================================================== */
router.post("/ai/next-actions", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req)!;
  try {
    const { entityType, id } = req.body as { entityType?: string; id?: number };
    if (!entityType || !id || !["lead","opportunity","contact","account"].includes(entityType)) {
      res.status(400).json({ error: "entityType (lead|opportunity|contact|account) and id required" });
      return;
    }

    // Gather minimal entity context + recent activities
    let entity: Record<string, unknown> | null = null;
    let recentActs: Array<{ type: string; subject: string; status: string; dueDate: Date | null; completedAt: Date | null; createdAt: Date }> = [];

    if (entityType === "lead") {
      const [row] = await db.select().from(leadsTable).where(eq(leadsTable.id, id)).limit(1);
      entity = row as unknown as Record<string, unknown>;
      recentActs = await db.select({
        type: activitiesTable.type, subject: activitiesTable.subject, status: activitiesTable.status,
        dueDate: activitiesTable.dueDate, completedAt: activitiesTable.completedAt, createdAt: activitiesTable.createdAt,
      }).from(activitiesTable).where(eq(activitiesTable.leadId, id)).orderBy(desc(activitiesTable.createdAt)).limit(10);
    } else if (entityType === "opportunity") {
      const [row] = await db.select().from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).limit(1);
      entity = row as unknown as Record<string, unknown>;
      recentActs = await db.select({
        type: activitiesTable.type, subject: activitiesTable.subject, status: activitiesTable.status,
        dueDate: activitiesTable.dueDate, completedAt: activitiesTable.completedAt, createdAt: activitiesTable.createdAt,
      }).from(activitiesTable).where(eq(activitiesTable.opportunityId, id)).orderBy(desc(activitiesTable.createdAt)).limit(10);
    } else if (entityType === "contact") {
      const [row] = await db.select().from(contactsTable).where(eq(contactsTable.id, id)).limit(1);
      entity = row as unknown as Record<string, unknown>;
      recentActs = await db.select({
        type: activitiesTable.type, subject: activitiesTable.subject, status: activitiesTable.status,
        dueDate: activitiesTable.dueDate, completedAt: activitiesTable.completedAt, createdAt: activitiesTable.createdAt,
      }).from(activitiesTable).where(eq(activitiesTable.contactId, id)).orderBy(desc(activitiesTable.createdAt)).limit(10);
    } else if (entityType === "account") {
      const [row] = await db.select().from(accountsTable).where(eq(accountsTable.id, id)).limit(1);
      entity = row as unknown as Record<string, unknown>;
      recentActs = await db.select({
        type: activitiesTable.type, subject: activitiesTable.subject, status: activitiesTable.status,
        dueDate: activitiesTable.dueDate, completedAt: activitiesTable.completedAt, createdAt: activitiesTable.createdAt,
      }).from(activitiesTable).where(eq(activitiesTable.accountId, id)).orderBy(desc(activitiesTable.createdAt)).limit(10);
    }

    if (!entity) {
      res.status(404).json({ error: "Entity not found" });
      return;
    }

    const openai = await getOpenAI();
    if (!openai) {
      res.status(503).json({ error: "AI service unavailable" });
      return;
    }

    const lastActDate = recentActs[0]?.createdAt ? new Date(recentActs[0].createdAt) : null;
    const daysSince = lastActDate ? Math.floor((Date.now() - lastActDate.getTime()) / 86400000) : null;

    // Sanitize entity — only safe fields to send to LLM
    const SAFE_FIELDS: Record<string, string[]> = {
      lead: ["firstName","lastName","email","phone","company","title","status","source","score","industry","description","isConverted"],
      opportunity: ["name","stage","amount","probability","closeDate","nextStep","forecastCategory","leadSource","description"],
      contact: ["firstName","lastName","email","phone","title","department","leadSource","city","country","description"],
      account: ["name","industry","website","phone","type","employees","annualRevenue","description","city","country"],
    };
    const safe = SAFE_FIELDS[entityType] ?? [];
    const sanitizedEntity: Record<string, unknown> = {};
    for (const k of safe) if (entity[k] !== undefined && entity[k] !== null) sanitizedEntity[k] = entity[k];

    const sysPrompt = `You are an expert sales coach for a CRM. Given an entity and its recent activity, return EXACTLY 3 next best actions. Respond with a JSON object: {"actions": [{"title": short imperative (<= 60 chars), "reason": one-sentence why, "type": "call"|"email"|"meeting"|"task"|"note"|"stage_change", "priority": "high"|"medium"|"low"}, ...]}. Be specific. Use British English. All currency is GBP (£).`;

    const userPrompt = `Entity type: ${entityType}
Entity: ${JSON.stringify(sanitizedEntity)}
Days since last activity: ${daysSince ?? "no activities yet"}
Recent activities (newest first): ${JSON.stringify(recentActs.slice(0, 5))}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: 600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let actions: unknown[] = [];
    try {
      const parsed = JSON.parse(raw) as { actions?: unknown };
      if (Array.isArray(parsed.actions)) actions = parsed.actions;
    } catch {
      actions = [];
    }
    res.json({ actions, daysSinceLastActivity: daysSince });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI service error" });
  }
});

void isNull;

export default router;
