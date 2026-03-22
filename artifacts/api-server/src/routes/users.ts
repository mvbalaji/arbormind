import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users", async (req, res) => {
  try {
    const { search, role, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = db.select().from(usersTable);
    const conditions = [];
    if (search) conditions.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))!);
    if (role) conditions.push(eq(usersTable.role, role));

    const [data, countResult] = await Promise.all([
      conditions.length > 0
        ? db.select().from(usersTable).where(conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`).limit(limitNum).offset(offset)
        : db.select().from(usersTable).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(usersTable)
    ]);

    res.json({ data, total: Number(countResult[0].count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const [user] = await db.insert(usersTable).values(req.body).returning();
    res.status(201).json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(req.params.id)));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const [user] = await db.update(usersTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(usersTable.id, parseInt(req.params.id)))
      .returning();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
