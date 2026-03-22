import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable, usersTable, contactsTable, accountsTable, opportunitiesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activities", async (req, res) => {
  try {
    const { contactId, opportunityId, accountId, type, assignedTo, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select({
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
      })
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id));

    let data: any[];
    if (contactId) {
      data = await baseQuery.where(eq(activitiesTable.contactId, parseInt(contactId))).limit(limitNum).offset(offset);
    } else if (opportunityId) {
      data = await baseQuery.where(eq(activitiesTable.opportunityId, parseInt(opportunityId))).limit(limitNum).offset(offset);
    } else if (accountId) {
      data = await baseQuery.where(eq(activitiesTable.accountId, parseInt(accountId))).limit(limitNum).offset(offset);
    } else if (type) {
      data = await baseQuery.where(eq(activitiesTable.type, type)).limit(limitNum).offset(offset);
    } else if (assignedTo) {
      data = await baseQuery.where(eq(activitiesTable.assignedTo, parseInt(assignedTo))).limit(limitNum).offset(offset);
    } else {
      data = await baseQuery.limit(limitNum).offset(offset);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(activitiesTable);
    const enriched = data.map(a => ({
      ...a,
      contactName: a.contactFirstName ? `${a.contactFirstName} ${a.contactLastName}` : null,
      contactFirstName: undefined,
      contactLastName: undefined,
    }));

    res.json({ data: enriched, total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const [activity] = await db.insert(activitiesTable).values(req.body).returning();
    res.status(201).json(activity);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/activities/:id", async (req, res) => {
  try {
    const [activity] = await db
      .select({
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
      })
      .from(activitiesTable)
      .leftJoin(usersTable, eq(activitiesTable.assignedTo, usersTable.id))
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(activitiesTable.accountId, accountsTable.id))
      .leftJoin(opportunitiesTable, eq(activitiesTable.opportunityId, opportunitiesTable.id))
      .where(eq(activitiesTable.id, parseInt(req.params.id)));

    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json({
      ...activity,
      contactName: activity.contactFirstName ? `${activity.contactFirstName} ${activity.contactLastName}` : null,
    });
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
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json(activity);
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
