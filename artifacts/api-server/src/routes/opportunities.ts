import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable, usersTable, accountsTable, contactsTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const oppFields = {
  id: opportunitiesTable.id,
  name: opportunitiesTable.name,
  accountId: opportunitiesTable.accountId,
  accountName: accountsTable.name,
  contactId: opportunitiesTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  stage: opportunitiesTable.stage,
  amount: opportunitiesTable.amount,
  probability: opportunitiesTable.probability,
  closeDate: opportunitiesTable.closeDate,
  description: opportunitiesTable.description,
  assignedTo: opportunitiesTable.assignedTo,
  assignedToName: usersTable.name,
  leadSource: opportunitiesTable.leadSource,
  nextStep: opportunitiesTable.nextStep,
  createdAt: opportunitiesTable.createdAt,
  updatedAt: opportunitiesTable.updatedAt,
};

function formatOpp(o: {
  amount: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  [key: string]: unknown;
}) {
  const { contactFirstName, contactLastName, ...rest } = o;
  return {
    ...rest,
    amount: o.amount ? Number(o.amount) : null,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName}` : null,
  };
}

router.get("/opportunities", async (req, res) => {
  try {
    const { search, stage, accountId, assignedTo, page = "1", limit = "100" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(oppFields)
      .from(opportunitiesTable)
      .leftJoin(usersTable, eq(opportunitiesTable.assignedTo, usersTable.id))
      .leftJoin(accountsTable, eq(opportunitiesTable.accountId, accountsTable.id))
      .leftJoin(contactsTable, eq(opportunitiesTable.contactId, contactsTable.id));

    const conditions = [];
    if (search) conditions.push(ilike(opportunitiesTable.name, `%${search}%`));
    if (stage) conditions.push(eq(opportunitiesTable.stage, stage));
    if (accountId) conditions.push(eq(opportunitiesTable.accountId, parseInt(accountId)));
    if (assignedTo) conditions.push(eq(opportunitiesTable.assignedTo, parseInt(assignedTo)));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable);
    res.json({ data: data.map(formatOpp), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/opportunities", async (req, res) => {
  try {
    const [opportunity] = await db.insert(opportunitiesTable).values(req.body).returning();
    res.status(201).json({ ...opportunity, amount: opportunity.amount ? Number(opportunity.amount) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/opportunities/:id", async (req, res) => {
  try {
    const [opportunity] = await db
      .select(oppFields)
      .from(opportunitiesTable)
      .leftJoin(usersTable, eq(opportunitiesTable.assignedTo, usersTable.id))
      .leftJoin(accountsTable, eq(opportunitiesTable.accountId, accountsTable.id))
      .leftJoin(contactsTable, eq(opportunitiesTable.contactId, contactsTable.id))
      .where(eq(opportunitiesTable.id, parseInt(req.params.id)));

    if (!opportunity) {
      res.status(404).json({ error: "Opportunity not found" });
    } else {
      res.json(formatOpp(opportunity));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/opportunities/:id", async (req, res) => {
  try {
    const [opportunity] = await db.update(opportunitiesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(opportunitiesTable.id, parseInt(req.params.id)))
      .returning();
    if (!opportunity) {
      res.status(404).json({ error: "Opportunity not found" });
    } else {
      res.json({ ...opportunity, amount: opportunity.amount ? Number(opportunity.amount) : null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/opportunities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
