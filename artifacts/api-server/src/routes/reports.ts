import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  contactsTable, leadsTable, accountsTable, opportunitiesTable,
  activitiesTable, casesTable
} from "@workspace/db";
import { eq, sql, gte, lt, and } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();
router.use("/reports", requireScreenAccess("reports"));

router.get("/reports/dashboard", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const [
      totalContactsRes,
      totalLeadsRes,
      totalAccountsRes,
      openOpportunitiesRes,
      pipelineValueRes,
      wonDealsRes,
      openCasesRes,
      activitiesThisWeekRes,
      winLossRes,
      recentActivities,
      upcomingActivities,
      recentLeads,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contactsTable).where(eq(contactsTable.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` }).from(accountsTable).where(eq(accountsTable.orgId, orgId)),
      db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable)
        .where(and(sql`stage NOT IN ('closed_won', 'closed_lost')`, eq(opportunitiesTable.orgId, orgId))),
      db.select({ total: sql<number>`coalesce(sum(amount), 0)` }).from(opportunitiesTable)
        .where(and(sql`stage NOT IN ('closed_won', 'closed_lost')`, eq(opportunitiesTable.orgId, orgId))),
      db.select({ count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(amount), 0)` })
        .from(opportunitiesTable)
        .where(and(eq(opportunitiesTable.stage, 'closed_won'), gte(opportunitiesTable.updatedAt, startOfMonth), eq(opportunitiesTable.orgId, orgId))),
      db.select({ count: sql<number>`count(*)` }).from(casesTable)
        .where(and(sql`status NOT IN ('resolved', 'closed')`, eq(casesTable.orgId, orgId))),
      db.select({ count: sql<number>`count(*)` }).from(activitiesTable)
        .where(and(gte(activitiesTable.createdAt, startOfWeek), lt(activitiesTable.createdAt, endOfWeek), eq(activitiesTable.orgId, orgId))),
      db.select({ count: sql<number>`count(*)`, stage: opportunitiesTable.stage })
        .from(opportunitiesTable)
        .where(and(sql`stage IN ('closed_won', 'closed_lost')`, eq(opportunitiesTable.orgId, orgId)))
        .groupBy(opportunitiesTable.stage),
      db.select().from(activitiesTable).where(eq(activitiesTable.orgId, orgId)).orderBy(sql`created_at desc`).limit(5),
      db.select().from(activitiesTable)
        .where(and(sql`status = 'planned'`, sql`due_date > now()`, eq(activitiesTable.orgId, orgId)))
        .orderBy(activitiesTable.dueDate).limit(5),
      db.select().from(leadsTable).where(eq(leadsTable.orgId, orgId)).orderBy(sql`created_at desc`).limit(5),
    ]);

    const wonCount = winLossRes.find(r => r.stage === 'closed_won')?.count || 0;
    const lostCount = winLossRes.find(r => r.stage === 'closed_lost')?.count || 0;
    const totalClosed = Number(wonCount) + Number(lostCount);
    const winRate = totalClosed > 0 ? Math.round((Number(wonCount) / totalClosed) * 100) : 0;

    res.json({
      totalContacts: Number(totalContactsRes[0].count),
      totalLeads: Number(totalLeadsRes[0].count),
      totalAccounts: Number(totalAccountsRes[0].count),
      openOpportunities: Number(openOpportunitiesRes[0].count),
      totalPipelineValue: Number(pipelineValueRes[0].total),
      wonDealsThisMonth: Number(wonDealsRes[0].count),
      revenueThisMonth: Number(wonDealsRes[0].revenue),
      openCases: Number(openCasesRes[0].count),
      activitiesThisWeek: Number(activitiesThisWeekRes[0].count),
      winRate,
      recentActivities: recentActivities.map(a => ({ ...a, contactName: null, opportunityName: null, accountName: null, assignedToName: null })),
      upcomingActivities: upcomingActivities.map(a => ({ ...a, contactName: null, opportunityName: null, accountName: null, assignedToName: null })),
      recentLeads: recentLeads.map(l => ({ ...l, annualRevenue: l.annualRevenue ? Number(l.annualRevenue) : null, assignedToName: null })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/pipeline", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const stages = await db
      .select({
        stage: opportunitiesTable.stage,
        count: sql<number>`count(*)`,
        totalValue: sql<number>`coalesce(sum(amount), 0)`,
        avgProbability: sql<number>`coalesce(avg(probability), 0)`,
      })
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.orgId, orgId))
      .groupBy(opportunitiesTable.stage);

    const [totals] = await db.select({
      totalValue: sql<number>`coalesce(sum(amount), 0)`,
      totalDeals: sql<number>`count(*)`,
    }).from(opportunitiesTable).where(eq(opportunitiesTable.orgId, orgId));

    res.json({
      stages: stages.map(s => ({
        stage: s.stage,
        count: Number(s.count),
        totalValue: Number(s.totalValue),
        avgProbability: Number(s.avgProbability),
      })),
      totalValue: Number(totals.totalValue),
      totalDeals: Number(totals.totalDeals),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/top-deals", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const topDeals = await db
      .select({
        id: opportunitiesTable.id,
        name: opportunitiesTable.name,
        amount: opportunitiesTable.amount,
        stage: opportunitiesTable.stage,
        probability: opportunitiesTable.probability,
        closeDate: opportunitiesTable.closeDate,
        accountId: opportunitiesTable.accountId,
        accountName: accountsTable.name,
        assignedTo: opportunitiesTable.assignedTo,
      })
      .from(opportunitiesTable)
      .leftJoin(accountsTable, eq(opportunitiesTable.accountId, accountsTable.id))
      .where(and(sql`${opportunitiesTable.stage} NOT IN ('closed_won', 'closed_lost')`, eq(opportunitiesTable.orgId, orgId)))
      .orderBy(sql`${opportunitiesTable.amount} DESC NULLS LAST`)
      .limit(5);

    res.json({
      data: topDeals.map(d => ({
        ...d,
        amount: d.amount ? Number(d.amount) : 0,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/lead-sources", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const sources = await db
      .select({
        source: leadsTable.source,
        count: sql<number>`count(*)`,
      })
      .from(leadsTable)
      .where(eq(leadsTable.orgId, orgId))
      .groupBy(leadsTable.source);

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(leadsTable).where(eq(leadsTable.orgId, orgId));
    const totalNum = Number(total.count);

    res.json({
      sources: sources.map(s => ({
        source: s.source || 'Unknown',
        count: Number(s.count),
        percentage: totalNum > 0 ? Math.round((Number(s.count) / totalNum) * 100) : 0,
      })),
      total: totalNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/activities-summary", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const byType = await db
      .select({
        type: activitiesTable.type,
        status: activitiesTable.status,
        count: sql<number>`count(*)`,
      })
      .from(activitiesTable)
      .where(eq(activitiesTable.orgId, orgId))
      .groupBy(activitiesTable.type, activitiesTable.status);

    const types = ['call', 'email', 'meeting', 'task', 'note'];
    const summary = types.map(type => {
      const completed = byType.find(b => b.type === type && b.status === 'completed')?.count || 0;
      const planned = byType.find(b => b.type === type && b.status === 'planned')?.count || 0;
      return { type, completed: Number(completed), planned: Number(planned) };
    });

    const [totals] = await db.select({
      totalCompleted: sql<number>`count(*) filter (where status = 'completed')`,
      totalPlanned: sql<number>`count(*) filter (where status = 'planned')`,
    }).from(activitiesTable).where(eq(activitiesTable.orgId, orgId));

    res.json({
      byType: summary,
      totalCompleted: Number(totals.totalCompleted),
      totalPlanned: Number(totals.totalPlanned),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/revenue-forecast", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const [wonRevenue] = await db.select({
        revenue: sql<number>`coalesce(sum(amount), 0)`,
      }).from(opportunitiesTable)
        .where(and(
          eq(opportunitiesTable.stage, 'closed_won'),
          gte(opportunitiesTable.updatedAt, d),
          lt(opportunitiesTable.updatedAt, nextD),
          eq(opportunitiesTable.orgId, orgId)
        ));

      const [forecastRevenue] = await db.select({
        forecast: sql<number>`coalesce(sum(amount * probability / 100), 0)`,
      }).from(opportunitiesTable)
        .where(and(
          sql`stage NOT IN ('closed_won', 'closed_lost')`,
          gte(opportunitiesTable.closeDate, d),
          lt(opportunitiesTable.closeDate, nextD),
          eq(opportunitiesTable.orgId, orgId)
        ));

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Number(wonRevenue.revenue),
        forecast: Number(forecastRevenue.forecast),
      });
    }

    // Add 3 future months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const [forecastRevenue] = await db.select({
        forecast: sql<number>`coalesce(sum(amount * probability / 100), 0)`,
      }).from(opportunitiesTable)
        .where(and(
          sql`stage NOT IN ('closed_won', 'closed_lost')`,
          gte(opportunitiesTable.closeDate, d),
          lt(opportunitiesTable.closeDate, nextD),
          eq(opportunitiesTable.orgId, orgId)
        ));

      months.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: 0,
        forecast: Number(forecastRevenue.forecast),
      });
    }

    const totalForecast = months.reduce((sum, m) => sum + m.forecast, 0);
    const totalActual = months.reduce((sum, m) => sum + m.revenue, 0);

    res.json({ months, totalForecast, totalActual });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
