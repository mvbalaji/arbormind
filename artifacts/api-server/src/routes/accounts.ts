import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accountsTable, usersTable, contactsTable, opportunitiesTable, activitiesTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const accountFields = {
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
};

async function enrichAccounts(data: Array<{ id: number; annualRevenue: string | null; [key: string]: unknown }>) {
  const accountIds = data.map(a => a.id);
  if (accountIds.length === 0) return data.map(a => ({ ...a, contactCount: 0, dealCount: 0, annualRevenue: a.annualRevenue ? Number(a.annualRevenue) : null }));

  const [contactCounts, dealCounts] = await Promise.all([
    db.select({ accountId: contactsTable.accountId, count: sql<number>`count(*)` })
      .from(contactsTable)
      .where(sql`${contactsTable.accountId} = ANY(ARRAY[${sql.raw(accountIds.join(","))}]::int[])`)
      .groupBy(contactsTable.accountId),
    db.select({ accountId: opportunitiesTable.accountId, count: sql<number>`count(*)` })
      .from(opportunitiesTable)
      .where(sql`${opportunitiesTable.accountId} = ANY(ARRAY[${sql.raw(accountIds.join(","))}]::int[])`)
      .groupBy(opportunitiesTable.accountId),
  ]);

  const contactCountMap = new Map(contactCounts.map(c => [c.accountId, Number(c.count)]));
  const dealCountMap = new Map(dealCounts.map(d => [d.accountId, Number(d.count)]));

  return data.map(a => ({
    ...a,
    annualRevenue: a.annualRevenue ? Number(a.annualRevenue) : null,
    contactCount: contactCountMap.get(a.id) ?? 0,
    dealCount: dealCountMap.get(a.id) ?? 0,
  }));
}

router.get("/accounts", async (req, res) => {
  try {
    const { search, industry, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(accountFields)
      .from(accountsTable)
      .leftJoin(usersTable, eq(accountsTable.ownerId, usersTable.id));

    const conditions = [];
    if (search) conditions.push(ilike(accountsTable.name, `%${search}%`));
    if (industry) conditions.push(eq(accountsTable.industry, industry));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(accountsTable).where(whereClause);
    const enriched = await enrichAccounts(data);

    res.json({ data: enriched, total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/accounts", async (req, res) => {
  try {
    const [account] = await db.insert(accountsTable).values(req.body).returning();
    res.status(201).json({
      ...account,
      annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null,
      contactCount: 0,
      dealCount: 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/accounts/:id", async (req, res) => {
  try {
    const [account] = await db
      .select(accountFields)
      .from(accountsTable)
      .leftJoin(usersTable, eq(accountsTable.ownerId, usersTable.id))
      .where(eq(accountsTable.id, parseInt(req.params.id)));

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const [contactCounts, dealCounts] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contactsTable).where(eq(contactsTable.accountId, account.id)),
      db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable).where(eq(opportunitiesTable.accountId, account.id)),
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
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json({
        ...account,
        annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null,
        contactCount: 0,
        dealCount: 0,
      });
    }
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

// Relationship: contacts for an account
router.get("/accounts/:id/contacts", async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const data = await db
      .select()
      .from(contactsTable)
      .where(eq(contactsTable.accountId, accountId))
      .orderBy(contactsTable.firstName);
    res.json({ data });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Relationship: opportunities for an account
router.get("/accounts/:id/opportunities", async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const data = await db
      .select()
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.accountId, accountId))
      .orderBy(opportunitiesTable.closeDate);
    res.json({ data: data.map((o) => ({ ...o, amount: o.amount ? Number(o.amount) : null })) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Relationship: activities for an account
router.get("/accounts/:id/activities", async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const data = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.accountId, accountId))
      .orderBy(activitiesTable.dueDate);
    res.json({ data });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
