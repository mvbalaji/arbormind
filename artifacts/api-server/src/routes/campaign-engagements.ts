import { Router, type IRouter } from "express";
import { db, campaignEngagementsTable, EVENT_SCORES, scoreToCategory } from "@workspace/db";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();

// All campaign engagement routes require campaigns screen access
router.use("/campaign-engagements", requireScreenAccess("campaigns"));

// GET /api/campaign-engagements — list events, filterable by campaign/platform/category
router.get("/campaign-engagements", async (req, res) => {
  try {
    const {
      campaignId,
      platform,
      category,
      page = "1",
      limit = "50",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions: ReturnType<typeof eq>[] = [];
    if (campaignId) conditions.push(eq(campaignEngagementsTable.campaignId, parseInt(campaignId)));
    if (platform) conditions.push(eq(campaignEngagementsTable.platform, platform));
    if (category) conditions.push(eq(campaignEngagementsTable.interestCategory, category));

    const where = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [rows, countResult] = await Promise.all([
      db.select().from(campaignEngagementsTable)
        .where(where)
        .orderBy(desc(campaignEngagementsTable.occurredAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(campaignEngagementsTable).where(where),
    ]);

    res.json({
      data: rows,
      total: Number(countResult[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/campaign-engagements/stats?campaignId=X — aggregated breakdown
router.get("/campaign-engagements/stats", async (req, res) => {
  try {
    const { campaignId } = req.query as Record<string, string>;

    const where = campaignId
      ? eq(campaignEngagementsTable.campaignId, parseInt(campaignId))
      : undefined;

    const [byPlatform, byCategory, byEventType, totals, dailyTrend] = await Promise.all([
      // Per-platform breakdown
      db.select({
        platform: campaignEngagementsTable.platform,
        count: sql<number>`count(*)::int`,
        totalScore: sql<number>`sum(engagement_score)::int`,
      }).from(campaignEngagementsTable).where(where)
        .groupBy(campaignEngagementsTable.platform)
        .orderBy(sql`count(*) desc`),

      // By interest category
      db.select({
        category: campaignEngagementsTable.interestCategory,
        count: sql<number>`count(*)::int`,
      }).from(campaignEngagementsTable).where(where)
        .groupBy(campaignEngagementsTable.interestCategory),

      // By event type
      db.select({
        eventType: campaignEngagementsTable.eventType,
        count: sql<number>`count(*)::int`,
        totalScore: sql<number>`sum(engagement_score)::int`,
      }).from(campaignEngagementsTable).where(where)
        .groupBy(campaignEngagementsTable.eventType)
        .orderBy(sql`count(*) desc`),

      // Overall totals
      db.select({
        totalEvents: sql<number>`count(*)::int`,
        totalScore: sql<number>`coalesce(sum(engagement_score), 0)::int`,
        identifiedLeads: sql<number>`count(distinct lead_id) filter (where lead_id is not null)::int`,
        uniquePlatforms: sql<number>`count(distinct platform)::int`,
      }).from(campaignEngagementsTable).where(where),

      // Daily trend — last 30 days
      db.select({
        day: sql<string>`date_trunc('day', occurred_at)::date::text`,
        count: sql<number>`count(*)::int`,
        score: sql<number>`sum(engagement_score)::int`,
      }).from(campaignEngagementsTable)
        .where(
          where
            ? and(where, gte(campaignEngagementsTable.occurredAt, sql`now() - interval '30 days'`))
            : gte(campaignEngagementsTable.occurredAt, sql`now() - interval '30 days'`)
        )
        .groupBy(sql`date_trunc('day', occurred_at)`)
        .orderBy(sql`date_trunc('day', occurred_at)`),
    ]);

    res.json({
      byPlatform,
      byCategory,
      byEventType,
      totals: totals[0] ?? { totalEvents: 0, totalScore: 0, identifiedLeads: 0, uniquePlatforms: 0 },
      dailyTrend,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/campaign-engagements — manually log an engagement
router.post("/campaign-engagements", async (req, res) => {
  try {
    const {
      campaignId, platform, eventType, platformUserName, platformUserEmail,
      platformUserPhone, leadId, contactId, metadata,
    } = req.body as {
      campaignId?: number;
      platform: string;
      eventType: string;
      platformUserName?: string;
      platformUserEmail?: string;
      platformUserPhone?: string;
      leadId?: number;
      contactId?: number;
      metadata?: Record<string, unknown>;
    };

    if (!platform || !eventType) {
      return res.status(400).json({ error: "platform and eventType are required" });
    }

    const score = EVENT_SCORES[eventType as keyof typeof EVENT_SCORES] ?? 1;
    const category = scoreToCategory(score);

    const [row] = await db.insert(campaignEngagementsTable).values({
      campaignId: campaignId ?? null,
      platform,
      eventType,
      engagementScore: score,
      interestCategory: category,
      leadId: leadId ?? null,
      contactId: contactId ?? null,
      platformUserName: platformUserName ?? null,
      platformUserEmail: platformUserEmail ?? null,
      platformUserPhone: platformUserPhone ?? null,
      metadata: metadata ?? null,
    }).returning();

    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
