import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";
import { getOrgId } from "../lib/org-context";

const router: IRouter = Router();

router.get("/users", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { search, role, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(usersTable.orgId, orgId)];
    if (search) {
      conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))!);
    }
    if (role) {
      conditions.push(eq(usersTable.role, role));
    }

    const whereClause = and(...conditions);
    const data = await db.select().from(usersTable).where(whereClause).limit(limitNum).offset(offset);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(whereClause);
    res.json({ data, total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const [user] = await db.insert(usersTable).values({ ...req.body, orgId }).returning();
    res.status(201).json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, parseInt(req.params.id)), eq(usersTable.orgId, orgId)));
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(user);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { orgId: _ignored, ...body } = req.body ?? {};
    const [user] = await db.update(usersTable)
      .set({ ...body, updatedAt: new Date() })
      .where(and(eq(usersTable.id, parseInt(req.params.id)), eq(usersTable.orgId, orgId)))
      .returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(user);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.orgId, orgId)));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
