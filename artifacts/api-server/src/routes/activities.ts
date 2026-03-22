import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable, usersTable, contactsTable, accountsTable, opportunitiesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const activityFields = {
  id: activitiesTable.id,
  type: activitiesTable.type,
  subject: activitiesTable.subject,
  description: activitiesTable.description,
  status: activitiesTable.status,
  dueDate: activitiesTable.dueDate,
  completedAt: activitiesTable.completedAt,
  contactId: activitiesTable.contactId,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  opportunityId: activitiesTable.opportunityId,
  opportunityName: opportunitiesTable.name,
  accountId: activitiesTable.accountId,
  accountName: accountsTable.name,
  assignedTo: activitiesTable.assignedTo,
  assignedToName: usersTable.name,
  createdAt: activitiesTable.createdAt,
  updatedAt: activitiesTable.updatedAt,
};

function formatActivity(a: { contactFirstName: string | null; contactLastName: string | null; [key: string]: unknown }) {
  const { contactFirstName, contactLastName, ...rest } = a;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName}` : null,
  };
}

const baseJoins = (query: ReturnType<typeof db.select>) =>
  query
    .from(activitiesTable)
    .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
    .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
    .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
    .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id));

router.get("/activities", async (req, res) => {
  try {
    const { contactId, opportunityId, accountId, type, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (contactId) conditions.push(eq(activitiesTable.contactId, parseInt(contactId)));
    if (opportunityId) conditions.push(eq(activitiesTable.opportunityId, parseInt(opportunityId)));
    if (accountId) conditions.push(eq(activitiesTable.accountId, parseInt(accountId)));
    if (type) conditions.push(eq(activitiesTable.type, type));
    if (assignedTo) conditions.push(eq(activitiesTable.assignedTo, parseInt(assignedTo)));

    const baseQuery = db.select(activityFields)
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).orderBy(activitiesTable.createdAt).limit(limitNum).offset(offset);

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(activitiesTable).where(whereClause);
    res.json({ data: data.map(formatActivity), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const [activity] = await db.insert(activitiesTable).values(req.body).returning();
    res.status(201).json({ ...activity, contactName: null, opportunityName: null, accountName: null, assignedToName: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/:id", async (req, res) => {
  try {
    const [activity] = await db
      .select(activityFields)
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id))
      .where(eq(activitiesTable.id, parseInt(req.params.id)));

    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
    } else {
      res.json(formatActivity(activity));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/activities/:id", async (req, res) => {
  try {
    const [activity] = await db.update(activitiesTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(activitiesTable.id, parseInt(req.params.id)))
      .returning();
    if (!activity) {
      res.status(404).json({ error: "Activity not found" });
    } else {
      res.json({ ...activity, contactName: null, opportunityName: null, accountName: null, assignedToName: null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/activities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(activitiesTable).where(eq(activitiesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
