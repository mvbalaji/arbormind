import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accountsTable, usersTable, contactsTable, opportunitiesTable } from "@workspace/db/schema";
import { eq, ilike, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/accounts", async (req, res) => {
  try {
    const { search, industry, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select({
        id: accountsTable.id,
        name: accountsTable.name,
        industry: accountsTable.industry,
        website: accountsTable.website,
        phone: accountsTable.phone,
        email: accountsTable.email,
        address: accountsTable.address,
        city: accountsTable.city,
        country: accountsTable.country,
        employees: accountsTable.employees,
        annualRevenue: accountsTable.annualRevenue,
        description: accountsTable.description,
        ownerId: accountsTable.ownerId,
        ownerName: usersTable.name,
        createdAt: accountsTable.createdAt,
        updatedAt: accountsTable.updatedAt,
      })
      .from(accountsTable)
      .leftJoin(usersTable, eq(accountsTable.ownerId, usersTable.id));

    let data: any[];
    if (search) {
      data = await baseQuery.where(ilike(accountsTable.name, `%${search}%`)).limit(limitNum).offset(offset);
    } else if (industry) {
      data = await baseQuery.where(eq(accountsTable.industry, industry)).limit(limitNum).offset(offset);
    } else {
      data = await baseQuery.limit(limitNum).offset(offset);
    }

    // Count contacts and opportunities per account
    const accountIds = data.map(a => a.id);
    const [contactCounts, dealCounts, countResult] = await Promise.all([
      accountIds.length > 0 ? db.select({
        accountId: contactsTable.accountId,
        count: sql<number>`count(*)`
      }).from(contactsTable).where(sql`${contactsTable.accountId} = ANY(${sql.raw(`ARRAY[${accountIds.join(',')}]::int[]`)})`).groupBy(contactsTable.accountId) : [],
      accountIds.length > 0 ? db.select({
        accountId: opportunitiesTable.accountId,
        count: sql<number>`count(*)`
      }).from(opportunitiesTable).where(sql`${opportunitiesTable.accountId} = ANY(${sql.raw(`ARRAY[${accountIds.join(',')}]::int[]`)})`).groupBy(opportunitiesTable.accountId) : [],
      db.select({ count: sql<number>`count(*)` }).from(accountsTable)
    ]);

    const contactCountMap = new Map(contactCounts.map(c => [c.accountId, Number(c.count)]));
    const dealCountMap = new Map(dealCounts.map(d => [d.accountId, Number(d.count)]));

    const enriched = data.map(a => ({
      ...a,
      annualRevenue: a.annualRevenue ? Number(a.annualRevenue) : null,
      contactCount: contactCountMap.get(a.id) || 0,
      dealCount: dealCountMap.get(a.id) || 0,
    }));

    res.json({ data: enriched, total: Number(countResult[0].count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const [account] = await db.insert(accountsTable).values(req.body).returning();
    res.status(201).json({ ...account, contactCount: 0, dealCount: 0, annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db
      .select({
        id: accountsTable.id,
        name: accountsTable.name,
        industry: accountsTable.industry,
        website: accountsTable.website,
        phone: accountsTable.phone,
        email: accountsTable.email,
        address: accountsTable.address,
        city: accountsTable.city,
        country: accountsTable.country,
        employees: accountsTable.employees,
        annualRevenue: accountsTable.annualRevenue,
        description: accountsTable.description,
        ownerId: accountsTable.ownerId,
        ownerName: usersTable.name,
        createdAt: accountsTable.createdAt,
        updatedAt: accountsTable.updatedAt,
      })
      .from(accountsTable)
      .leftJoin(usersTable, eq(accountsTable.ownerId, usersTable.id))
      .where(eq(accountsTable.id, parseInt(req.params.id)));

    if (!account) return res.status(404).json({ error: "Account not found" });

    const [contactCounts, dealCounts] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contactsTable).where(eq(contactsTable.accountId, account.id)),
      db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable).where(eq(opportunitiesTable.accountId, account.id))
    ]);

    res.json({
      ...account,
      annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null,
      contactCount: Number(contactCounts[0].count),
      dealCount: Number(dealCounts[0].count),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db.update(accountsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(accountsTable.id, parseInt(req.params.id)))
      .returning();
    if (!account) return res.status(404).json({ error: "Account not found" });
    res.json({ ...account, annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null, contactCount: 0, dealCount: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/accounts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(accountsTable).where(eq(accountsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
