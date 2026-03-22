import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactsTable, usersTable, accountsTable } from "@workspace/db";
import { eq, ilike, or, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const contactFields = {
  id: contactsTable.id,
  firstName: contactsTable.firstName,
  lastName: contactsTable.lastName,
  email: contactsTable.email,
  phone: contactsTable.phone,
  mobile: contactsTable.mobile,
  title: contactsTable.title,
  department: contactsTable.department,
  accountId: contactsTable.accountId,
  accountName: accountsTable.name,
  ownerId: contactsTable.ownerId,
  ownerName: usersTable.name,
  leadSource: contactsTable.leadSource,
  address: contactsTable.address,
  city: contactsTable.city,
  country: contactsTable.country,
  description: contactsTable.description,
  createdAt: contactsTable.createdAt,
  updatedAt: contactsTable.updatedAt,
};

router.get("/contacts", async (req, res) => {
  try {
    const { search, accountId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(contactFields)
      .from(contactsTable)
      .leftJoin(usersTable, eq(contactsTable.ownerId, usersTable.id))
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id));

    const conditions = [];
    if (search) {
      conditions.push(or(
        ilike(contactsTable.firstName, `%${search}%`),
        ilike(contactsTable.lastName, `%${search}%`),
        ilike(contactsTable.email, `%${search}%`)
      )!);
    }
    if (accountId) {
      conditions.push(eq(contactsTable.accountId, parseInt(accountId)));
    }

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(contactsTable);
    res.json({ data, total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const [contact] = await db.insert(contactsTable).values(req.body).returning();
    res.status(201).json(contact);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/contacts/:id", async (req, res) => {
  try {
    const [contact] = await db
      .select(contactFields)
      .from(contactsTable)
      .leftJoin(usersTable, eq(contactsTable.ownerId, usersTable.id))
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .where(eq(contactsTable.id, parseInt(req.params.id)));

    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
    } else {
      res.json(contact);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/contacts/:id", async (req, res) => {
  try {
    const [contact] = await db.update(contactsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(contactsTable.id, parseInt(req.params.id)))
      .returning();
    if (!contact) {
      res.status(404).json({ error: "Contact not found" });
    } else {
      res.json(contact);
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(contactsTable).where(eq(contactsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
