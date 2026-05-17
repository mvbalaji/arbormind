import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable, usersTable, accountsTable, contactsTable, activitiesTable, opportunityItemsTable, opportunityStageHistoryTable } from "@workspace/db";
import { eq, ilike, sql, and, isNull, asc } from "drizzle-orm";

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
  forecastCategory: opportunitiesTable.forecastCategory,
  teamMembers: opportunitiesTable.teamMembers,
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

    const whereClause = conditions.length === 0 ? undefined : conditions.length === 1 ? conditions[0] : and(...conditions);
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(opportunitiesTable).where(whereClause);
    res.json({ data: data.map(formatOpp), total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/opportunities", async (req, res) => {
  try {
    const [opportunity] = await db.insert(opportunitiesTable).values(req.body).returning();
    await db.insert(opportunityStageHistoryTable).values({
      opportunityId: opportunity.id,
      stage: opportunity.stage,
    });
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
    const id = parseInt(req.params.id);
    const opportunity = await db.transaction(async (tx) => {
      const [prev] = await tx.select({ stage: opportunitiesTable.stage }).from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).for("update");
      if (!prev) return null;
      const [updated] = await tx.update(opportunitiesTable)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(opportunitiesTable.id, id))
        .returning();
      if (req.body.stage && prev.stage !== updated.stage) {
        const now = new Date();
        await tx.update(opportunityStageHistoryTable)
          .set({ leftAt: now })
          .where(and(
            eq(opportunityStageHistoryTable.opportunityId, id),
            eq(opportunityStageHistoryTable.stage, prev.stage),
            isNull(opportunityStageHistoryTable.leftAt),
          ));
        await tx.insert(opportunityStageHistoryTable).values({
          opportunityId: id,
          stage: updated.stage,
          enteredAt: now,
        });
      }
      return updated;
    });
    if (!opportunity) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    res.json({ ...opportunity, amount: opportunity.amount ? Number(opportunity.amount) : null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Stage history for an opportunity (for tooltip showing days per stage)
router.get("/opportunities/:id/stage-history", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [opp] = await db.select({ stage: opportunitiesTable.stage, createdAt: opportunitiesTable.createdAt }).from(opportunitiesTable).where(eq(opportunitiesTable.id, id));
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    let rows = await db.select().from(opportunityStageHistoryTable)
      .where(eq(opportunityStageHistoryTable.opportunityId, id))
      .orderBy(asc(opportunityStageHistoryTable.enteredAt));
    // Backfill (idempotent): seed once for legacy opps using a transaction with row lock.
    if (rows.length === 0) {
      rows = await db.transaction(async (tx) => {
        // Lock the opportunity row to serialize concurrent backfill attempts
        await tx.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(eq(opportunitiesTable.id, id)).for("update");
        const existing = await tx.select().from(opportunityStageHistoryTable)
          .where(eq(opportunityStageHistoryTable.opportunityId, id))
          .orderBy(asc(opportunityStageHistoryTable.enteredAt));
        if (existing.length > 0) return existing;
        const [inserted] = await tx.insert(opportunityStageHistoryTable).values({
          opportunityId: id,
          stage: opp.stage,
          enteredAt: opp.createdAt,
        }).returning();
        return [inserted];
      });
    }
    res.json({ data: rows });
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

// Relationship: contacts related to an opportunity (primary contact + account contacts)
router.get("/opportunities/:id/contacts", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const [opp] = await db
      .select({ contactId: opportunitiesTable.contactId, accountId: opportunitiesTable.accountId })
      .from(opportunitiesTable)
      .where(eq(opportunitiesTable.id, opportunityId));

    if (!opp) return res.status(404).json({ error: "Opportunity not found" });

    // Collect contact IDs: primary contact + contacts from the same account
    const conditions = [];
    if (opp.contactId) conditions.push(eq(contactsTable.id, opp.contactId));
    if (opp.accountId) conditions.push(eq(contactsTable.accountId, opp.accountId));

    if (!conditions.length) return res.json({ data: [] });

    const { or } = await import("drizzle-orm");
    const data = await db
      .select({
        id: contactsTable.id,
        firstName: contactsTable.firstName,
        lastName: contactsTable.lastName,
        email: contactsTable.email,
        phone: contactsTable.phone,
        title: contactsTable.title,
        accountId: contactsTable.accountId,
        accountName: accountsTable.name,
      })
      .from(contactsTable)
      .leftJoin(accountsTable, eq(contactsTable.accountId, accountsTable.id))
      .where(or(...conditions));

    res.json({ data });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Relationship: activities for an opportunity
router.get("/opportunities/:id/activities", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const data = await db
      .select()
      .from(activitiesTable)
      .leftJoin(contactsTable, eq(activitiesTable.contactId, contactsTable.id))
      .where(eq(activitiesTable.opportunityId, opportunityId))
      .orderBy(activitiesTable.dueDate);
    res.json({
      data: data.map((r) => ({
        ...r.activities,
        contactName: r.contacts ? `${r.contacts.firstName} ${r.contacts.lastName}` : null,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/opportunities/:id/items", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    if (!Number.isFinite(opportunityId) || opportunityId <= 0) {
      res.status(400).json({ error: "Invalid opportunity ID" });
      return;
    }
    const items = await db.select().from(opportunityItemsTable).where(eq(opportunityItemsTable.opportunityId, opportunityId));
    res.json({
      data: items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/opportunities/:id/items", async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    if (!Number.isFinite(opportunityId) || opportunityId <= 0) {
      res.status(400).json({ error: "Invalid opportunity ID" });
      return;
    }

    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(eq(opportunitiesTable.id, opportunityId));
    if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

    const body = req.body as { items?: unknown };
    if (!body.items || !Array.isArray(body.items)) {
      res.status(400).json({ error: "Request body must contain an 'items' array." });
      return;
    }
    const items = body.items as Array<{ productId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }>;

    await db.delete(opportunityItemsTable).where(eq(opportunityItemsTable.opportunityId, opportunityId));

    if (items && items.length > 0) {
      await db.insert(opportunityItemsTable).values(items.map((item) => ({
        opportunityId,
        productId: item.productId ?? null,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount ?? 0).toString(),
        total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
      })));
    }

    const totalAmount = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
    }, 0);
    await db.update(opportunitiesTable)
      .set({ amount: totalAmount.toString(), updatedAt: new Date() })
      .where(eq(opportunitiesTable.id, opportunityId));

    const savedItems = await db.select().from(opportunityItemsTable).where(eq(opportunityItemsTable.opportunityId, opportunityId));
    res.json({
      data: savedItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
