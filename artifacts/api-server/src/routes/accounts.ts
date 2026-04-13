import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { accountsTable, usersTable, contactsTable, opportunitiesTable, activitiesTable, quotesTable, casesTable } from "@workspace/db";
import type { InsertAccount } from "@workspace/db";
import { eq, ilike, sql, and, desc, inArray } from "drizzle-orm";

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
  status: accountsTable.status,
  stage: accountsTable.stage,
  amount: accountsTable.amount,
  closeDate: accountsTable.closeDate,
  probability: accountsTable.probability,
  forecastCategory: accountsTable.forecastCategory,
  nextStep: accountsTable.nextStep,
  optyOwner: accountsTable.optyOwner,
  optyTeam: accountsTable.optyTeam,
  ownerId: accountsTable.ownerId,
  createdBy: accountsTable.createdBy,
  modifiedBy: accountsTable.modifiedBy,
  ownerName: usersTable.name,
  createdAt: accountsTable.createdAt,
  updatedAt: accountsTable.updatedAt,
};

function numericOrNull(val: string | null) {
  return val ? Number(val) : null;
}

function sanitizeAccount(a: Record<string, unknown>) {
  return {
    ...a,
    annualRevenue: numericOrNull(a.annualRevenue as string | null),
    amount: numericOrNull(a.amount as string | null),
  };
}

async function enrichAccounts(data: Array<{ id: number; [key: string]: unknown }>) {
  const accountIds = data.map(a => a.id);
  if (accountIds.length === 0) return data.map(a => ({ ...sanitizeAccount(a), contactCount: 0, dealCount: 0 }));

  const [contactCounts, dealCounts] = await Promise.all([
    db.select({ accountId: contactsTable.accountId, count: sql<number>`count(*)` })
      .from(contactsTable)
      .where(inArray(contactsTable.accountId, accountIds))
      .groupBy(contactsTable.accountId),
    db.select({ accountId: opportunitiesTable.accountId, count: sql<number>`count(*)` })
      .from(opportunitiesTable)
      .where(inArray(opportunitiesTable.accountId, accountIds))
      .groupBy(opportunitiesTable.accountId),
  ]);

  const contactCountMap = new Map(contactCounts.map(c => [c.accountId, Number(c.count)]));
  const dealCountMap = new Map(dealCounts.map(d => [d.accountId, Number(d.count)]));

  return data.map(a => ({
    ...sanitizeAccount(a),
    contactCount: contactCountMap.get(a.id) ?? 0,
    dealCount: dealCountMap.get(a.id) ?? 0,
  }));
}

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const ALLOWED_FIELDS = [
  "name", "industry", "website", "phone", "email", "address", "city", "country",
  "employees", "annualRevenue", "description", "status", "stage", "amount",
  "closeDate", "probability", "forecastCategory", "nextStep", "optyOwner",
  "optyTeam", "ownerId",
];

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
    const payload: Partial<InsertAccount> = {};
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        (payload as Record<string, unknown>)[key] = req.body[key];
      }
    }
    const sessionUser = req.session?.user as { id?: number; name?: string } | undefined;
    if (sessionUser?.id) {
      payload.createdBy = sessionUser.id;
      payload.modifiedBy = sessionUser.id;
    }
    const [account] = await db.insert(accountsTable).values(payload as InsertAccount).returning();
    res.status(201).json({
      ...sanitizeAccount(account),
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
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const [account] = await db
      .select(accountFields)
      .from(accountsTable)
      .leftJoin(usersTable, eq(accountsTable.ownerId, usersTable.id))
      .where(eq(accountsTable.id, id));

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    const [contactCounts, dealCounts] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(contactsTable).where(eq(contactsTable.accountId, account.id)),
      db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable).where(eq(opportunitiesTable.accountId, account.id)),
    ]);

    res.json({
      ...sanitizeAccount(account),
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
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const payload: Partial<InsertAccount> & { updatedAt: Date } = { updatedAt: new Date() };
    for (const key of ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) {
        (payload as Record<string, unknown>)[key] = req.body[key];
      }
    }
    const sessionUser = req.session?.user as { id?: number; name?: string } | undefined;
    if (sessionUser?.id) payload.modifiedBy = sessionUser.id;
    const [account] = await db.update(accountsTable)
      .set(payload)
      .where(eq(accountsTable.id, id))
      .returning();
    if (!account) {
      res.status(404).json({ error: "Account not found" });
    } else {
      res.json({
        ...sanitizeAccount(account),
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
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid account ID" }); return; }
    await db.delete(accountsTable).where(eq(accountsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/accounts/:id/contacts", async (req, res) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
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

router.get("/accounts/:id/opportunities", async (req, res) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
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

router.get("/accounts/:id/activities", async (req, res) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const data = await db
      .select()
      .from(activitiesTable)
      .where(eq(activitiesTable.accountId, accountId))
      .orderBy(desc(activitiesTable.createdAt));
    res.json({ data });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/accounts/:id/quotes", async (req, res) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const data = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.accountId, accountId))
      .orderBy(desc(quotesTable.createdAt));
    res.json({
      data: data.map((q) => ({
        ...q,
        subtotal: q.subtotal ? Number(q.subtotal) : 0,
        discount: q.discount ? Number(q.discount) : 0,
        tax: q.tax ? Number(q.tax) : 0,
        total: q.total ? Number(q.total) : 0,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/accounts/:id/cases", async (req, res) => {
  try {
    const accountId = parseId(req.params.id);
    if (!accountId) { res.status(400).json({ error: "Invalid account ID" }); return; }
    const data = await db
      .select()
      .from(casesTable)
      .where(eq(casesTable.accountId, accountId))
      .orderBy(desc(casesTable.createdAt));
    res.json({ data });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
