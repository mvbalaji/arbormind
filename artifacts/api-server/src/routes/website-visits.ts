import { Router, type IRouter } from "express";
import { db, websiteVisitsTable, insertWebsiteVisitSchema } from "@workspace/db";
import { ilike, or, sql, and } from "drizzle-orm";
import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();

function clientIp(req: { headers: Record<string, unknown>; ip?: string }): string | null {
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff[0] : (xff as string | undefined);
  const fromHeader = raw?.split(",")[0]?.trim();
  return fromHeader || req.ip || null;
}

// PUBLIC: record a website visit. Called from the public marketing site, so
// this endpoint intentionally has no auth guard (mirrors POST /enquiries).
// Must be declared BEFORE the requireScreenAccess guard below.
router.post("/website-visits", async (req, res) => {
  try {
    const parsed = insertWebsiteVisitSchema.parse(req.body ?? {});
    const userAgent = (req.headers["user-agent"] as string | undefined) ?? null;
    const [visit] = await db
      .insert(websiteVisitsTable)
      .values({
        ...parsed,
        userAgent,
        ipAddress: clientIp(req),
      })
      .returning();
    res.status(201).json({ success: true, id: visit.id });
  } catch (err) {
    req.log.error(err);
    res.status(400).json({ error: "Failed to record visit" });
  }
});

// Everything below requires authenticated access to the "website-visits" screen.
router.use("/website-visits", requireScreenAccess("website-visits"));

router.get("/website-visits/stats", async (req, res) => {
  try {
    const [row] = await db
      .select({
        total: sql<number>`count(*)`,
        unique: sql<number>`count(distinct ${websiteVisitsTable.sessionId})`,
        today: sql<number>`count(*) filter (where ${websiteVisitsTable.visitedAt} >= date_trunc('day', now()))`,
      })
      .from(websiteVisitsTable);
    res.json({
      total: Number(row?.total ?? 0),
      unique: Number(row?.unique ?? 0),
      today: Number(row?.today ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/website-visits", async (req, res) => {
  try {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(websiteVisitsTable.path, `%${search}%`),
          ilike(websiteVisitsTable.referrer, `%${search}%`),
          ilike(websiteVisitsTable.userAgent, `%${search}%`),
          ilike(websiteVisitsTable.ipAddress, `%${search}%`),
        )!,
      );
    }
    const whereClause =
      conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [data, countResult] = await Promise.all([
      db
        .select()
        .from(websiteVisitsTable)
        .where(whereClause)
        .limit(limitNum)
        .offset(offset)
        .orderBy(sql`visited_at desc`),
      db.select({ count: sql<number>`count(*)` }).from(websiteVisitsTable).where(whereClause),
    ]);

    res.json({
      data,
      total: Number(countResult[0].count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
