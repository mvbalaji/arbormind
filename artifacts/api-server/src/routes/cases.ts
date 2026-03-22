import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { casesTable, usersTable, contactsTable, accountsTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const caseFields = {
  id: casesTable.id,
  caseNumber: casesTable.caseNumber,
  subject: casesTable.subject,
  description: casesTable.description,
  status: casesTable.status,
  priority: casesTable.priority,
  type: casesTable.type,
  origin: casesTable.origin,
  contactId: casesTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  accountId: casesTable.accountId,
  accountName: accountsTable.name,
  assignedTo: casesTable.assignedTo,
  assignedToName: usersTable.name,
  resolution: casesTable.resolution,
  resolvedAt: casesTable.resolvedAt,
  createdAt: casesTable.createdAt,
  updatedAt: casesTable.updatedAt,
};

function formatCase(c: { contactFirstName: string | null; contactLastName: string | null; [key: string]: unknown }) {
  const { contactFirstName, contactLastName, ...rest } = c;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName}` : null,
  };
}

router.get("/cases", async (req, res) => {
  try {
    const { search, status, priority, contactId, accountId, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(caseFields)
      .from(casesTable)
      .leftJoin(usersTable, eq(casesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(casesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(casesTable.accountId, accountsTable.id));

    const conditions = [];
    if (search) conditions.push(ilike(casesTable.subject, `%${search}%`));
    if (status) conditions.push(eq(casesTable.status, status));
    if (priority) conditions.push(eq(casesTable.priority, priority));
    if (contactId) conditions.push(eq(casesTable.contactId, parseInt(contactId)));
    if (accountId) conditions.push(eq(casesTable.accountId, parseInt(accountId)));
    if (assignedTo) conditions.push(eq(casesTable.assignedTo, parseInt(assignedTo)));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(casesTable).where(whereClause);
    res.json({ data: data.map(formatCase), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/cases", async (req, res) => {
  try {
    const [maxCase] = await db.select({ maxNum: sql<string>`max(case_number)` }).from(casesTable);
    const nextNum = maxCase?.maxNum ? parseInt(maxCase.maxNum.replace("CASE-", "")) + 1 : 1001;
    const caseNumber = `CASE-${nextNum}`;

    const [caseRecord] = await db.insert(casesTable).values({ ...req.body, caseNumber }).returning();
    res.status(201).json({
      ...caseRecord,
      contactName: null,
      accountName: null,
      assignedToName: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cases/:id", async (req, res) => {
  try {
    const [caseRecord] = await db
      .select(caseFields)
      .from(casesTable)
      .leftJoin(usersTable, eq(casesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(casesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(casesTable.accountId, accountsTable.id))
      .where(eq(casesTable.id, parseInt(req.params.id)));

    if (!caseRecord) {
      res.status(404).json({ error: "Case not found" });
    } else {
      res.json(formatCase(caseRecord));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/cases/:id", async (req, res) => {
  try {
    const [caseRecord] = await db.update(casesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(casesTable.id, parseInt(req.params.id)))
      .returning();
    if (!caseRecord) {
      res.status(404).json({ error: "Case not found" });
    } else {
      res.json({ ...caseRecord, contactName: null, accountName: null, assignedToName: null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/cases/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(casesTable).where(eq(casesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
