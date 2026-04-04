import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";

const router: IRouter = Router();

function formatCampaign(c: Record<string, unknown>) {
  return {
    ...c,
    budget: c.budget ? Number(c.budget) : null,
    actualCost: c.actualCost ? Number(c.actualCost) : null,
    expectedRevenue: c.expectedRevenue ? Number(c.expectedRevenue) : null,
  };
}

router.get("/campaigns", async (req, res) => {
  try {
    const { search, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(campaignsTable.name, `%${search}%`),
        ilike(campaignsTable.description, `%${search}%`)
      )!);
    }
    if (status) conditions.push(eq(campaignsTable.status, status));

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);

    const [data, countResult] = await Promise.all([
      db.select().from(campaignsTable).where(whereClause).limit(limitNum).offset(offset).orderBy(sql`created_at desc`),
      db.select({ count: sql<number>`count(*)` }).from(campaignsTable).where(whereClause),
    ]);

    res.json({ data: data.map(formatCampaign), total: Number(countResult[0].count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.budget) body.budget = String(body.budget);
    if (body.actualCost) body.actualCost = String(body.actualCost);
    if (body.expectedRevenue) body.expectedRevenue = String(body.expectedRevenue);
    const [campaign] = await db.insert(campaignsTable).values(body).returning();
    res.status(201).json(formatCampaign(campaign));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/:id", async (req, res) => {
  try {
    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, parseInt(req.params.id)));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
    } else {
      res.json(formatCampaign(campaign));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/campaigns/:id", async (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date() };
    if (body.budget) body.budget = String(body.budget);
    if (body.actualCost) body.actualCost = String(body.actualCost);
    if (body.expectedRevenue) body.expectedRevenue = String(body.expectedRevenue);
    const [campaign] = await db.update(campaignsTable)
      .set(body)
      .where(eq(campaignsTable.id, parseInt(req.params.id)))
      .returning();
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
    } else {
      res.json(formatCampaign(campaign));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
