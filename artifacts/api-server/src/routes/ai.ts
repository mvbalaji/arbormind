import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  leadsTable, contactsTable, accountsTable, opportunitiesTable,
  activitiesTable, casesTable, quotesTable, ordersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

let _openai: any = null;

async function getOpenAI() {
  if (_openai) return _openai;
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    _openai = mod.openai;
    return _openai;
  } catch {
    return null;
  }
}

function getSessionUser(req: any) {
  return req.session?.user ?? req.user ?? null;
}

function requireAuth(req: any, res: any): boolean {
  const user = getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function getCRMContext(): Promise<string> {
  const [
    leadsCount, contactsCount, accountsCount, oppsCount,
    activitiesCount, casesCount, quotesCount, ordersCount,
    pipelineValue, wonDeals, recentLeads, topOpps,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(leadsTable),
    db.select({ count: sql<number>`count(*)` }).from(contactsTable),
    db.select({ count: sql<number>`count(*)` }).from(accountsTable),
    db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable),
    db.select({ count: sql<number>`count(*)` }).from(activitiesTable),
    db.select({ count: sql<number>`count(*)` }).from(casesTable),
    db.select({ count: sql<number>`count(*)` }).from(quotesTable),
    db.select({ count: sql<number>`count(*)` }).from(ordersTable),
    db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(opportunitiesTable)
      .where(sql`stage NOT IN ('closed_won', 'closed_lost')`),
    db.select({ count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(amount), 0)` })
      .from(opportunitiesTable).where(sql`stage = 'closed_won'`),
    db.select({ firstName: leadsTable.firstName, lastName: leadsTable.lastName, company: leadsTable.company, status: leadsTable.status, score: leadsTable.score })
      .from(leadsTable).orderBy(sql`created_at desc`).limit(5),
    db.select({ name: opportunitiesTable.name, amount: opportunitiesTable.amount, stage: opportunitiesTable.stage })
      .from(opportunitiesTable).where(sql`stage NOT IN ('closed_won', 'closed_lost')`).orderBy(sql`amount desc nulls last`).limit(5),
  ]);

  return `CRM Database Summary:
- Leads: ${leadsCount[0].count} total
- Contacts: ${contactsCount[0].count} total
- Accounts: ${accountsCount[0].count} total
- Opportunities: ${oppsCount[0].count} total (pipeline value: $${Number(pipelineValue[0].total).toLocaleString()})
- Won deals: ${wonDeals[0].count} (total revenue: $${Number(wonDeals[0].revenue).toLocaleString()})
- Activities: ${activitiesCount[0].count} total
- Cases: ${casesCount[0].count} total
- Quotes: ${quotesCount[0].count} total
- Orders: ${ordersCount[0].count} total

Recent Leads:
${recentLeads.map(l => `  - ${l.firstName} ${l.lastName} (${l.company ?? 'no company'}) - ${l.status}, score: ${l.score ?? 'N/A'}`).join('\n')}

Top Open Opportunities:
${topOpps.map(o => `  - ${o.name}: $${Number(o.amount ?? 0).toLocaleString()} (${o.stage})`).join('\n')}`;
}

router.post("/ai/chat", async (req, res) => {
  if (!requireAuth(req, res)) return;

  const openai = await getOpenAI();
  if (!openai) {
    res.status(503).json({ error: "AI service not configured" });
    return;
  }

  try {
    const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
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

    const crmContext = await getCRMContext();

    const systemMessage = `You are an AI assistant for arbormind.in CRM. You help users understand their CRM data, provide insights, and answer questions about leads, contacts, accounts, opportunities, activities, quotes, and orders.

Here is the current CRM data context:
${crmContext}

Guidelines:
- Be concise and helpful
- Reference specific numbers from the data
- Suggest actionable insights when appropriate
- If asked about something not in the data, say so honestly
- Format responses with markdown for readability`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        ...messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_completion_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content ?? "I couldn't generate a response.";
    res.json({ reply });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI service error" });
  }
});

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
        dataContext = `Opportunities: ${s.total} total, ${s.openCount} open (pipeline: $${Number(s.totalPipeline).toLocaleString()}), ${s.wonCount} won, ${s.lostCount} lost. Win rate: ${winRate}%. Avg probability: ${Math.round(Number(s.avgProbability))}%.`;
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
        dataContext = `Quotes: ${stats[0].total} total, ${stats[0].draft} draft, ${stats[0].sent} sent, ${stats[0].accepted} accepted. Total value: $${Number(stats[0].totalValue).toLocaleString()}.`;
        break;
      }
      default:
        dataContext = context ?? "No specific data available.";
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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

export default router;
