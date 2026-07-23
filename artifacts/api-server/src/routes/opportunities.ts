import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { opportunitiesTable, usersTable, accountsTable, contactsTable, activitiesTable, opportunityItemsTable, opportunityStageHistoryTable } from "@workspace/db";
import { getStandardPriceBookId } from "../lib/pricing";
import { eq, ilike, sql, and, isNull, asc, desc } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { evaluateApprovalsForEntity } from "../lib/approvals-engine";

function actorFromReq(req: any) {
  const u = req.session?.user ?? req.user ?? null;
  return { id: u?.id ?? null, name: u?.name ?? null, email: u?.email ?? null };
}

const router: IRouter = Router();
router.use("/opportunities", requireScreenAccess("opportunities"));

const oppFields = {
  id: opportunitiesTable.id,
  name: opportunitiesTable.name,
  accountId: opportunitiesTable.accountId,
  accountName: accountsTable.name,
  priceBookId: opportunitiesTable.priceBookId,
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

    const conditions = [eq(opportunitiesTable.orgId, req.orgId as number)];
    if (search) conditions.push(ilike(opportunitiesTable.name, `%${search}%`));
    if (stage) conditions.push(eq(opportunitiesTable.stage, stage));
    if (accountId) conditions.push(eq(opportunitiesTable.accountId, parseInt(accountId)));
    if (assignedTo) conditions.push(eq(opportunitiesTable.assignedTo, parseInt(assignedTo)));

    const data = await (conditions.length > 0
      ? baseQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions))
      : baseQuery
    ).orderBy(desc(opportunitiesTable.createdAt)).limit(limitNum).offset(offset);

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
    const oppData = { ...req.body, orgId: req.orgId as number };
    // Default to the Standard Price Book when none was chosen.
    if (oppData.priceBookId == null) {
      oppData.priceBookId = await getStandardPriceBookId(req.orgId as number);
    }
    // Convert date-only string to full timestamp for the DB timestamp column
    if (oppData.closeDate && typeof oppData.closeDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(oppData.closeDate)) {
      oppData.closeDate = new Date(oppData.closeDate + "T00:00:00Z");
    }
    const [opportunity] = await db.insert(opportunitiesTable).values(oppData).returning();
    await db.insert(opportunityStageHistoryTable).values({
      orgId: req.orgId as number,
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
      .where(and(eq(opportunitiesTable.id, parseInt(req.params.id)), eq(opportunitiesTable.orgId, req.orgId as number)));

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
    const { createdAt: _ca, updatedAt: _ua, id: _id, ...rawBody } = req.body ?? {};
    const patch: Record<string, unknown> = { ...rawBody };
    if (typeof patch.closeDate === "string") {
      patch.closeDate = patch.closeDate ? new Date(patch.closeDate) : null;
    }
    // If the price book was explicitly cleared, fall back to the Standard Price Book.
    if ("priceBookId" in patch && patch.priceBookId == null) {
      patch.priceBookId = await getStandardPriceBookId(req.orgId as number);
    }
    const orgId = req.orgId as number;
    const opportunity = await db.transaction(async (tx) => {
      const [prev] = await tx.select({ stage: opportunitiesTable.stage }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.orgId, orgId))).for("update");
      if (!prev) return null;
      const [updated] = await tx.update(opportunitiesTable)
        .set({ ...patch, updatedAt: new Date() })
        .where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.orgId, orgId)))
        .returning();
      if (req.body.stage && prev.stage !== updated.stage) {
        const now = new Date();
        await tx.update(opportunityStageHistoryTable)
          .set({ leftAt: now })
          .where(and(
            eq(opportunityStageHistoryTable.opportunityId, id),
            eq(opportunityStageHistoryTable.stage, prev.stage),
            eq(opportunityStageHistoryTable.orgId, orgId),
            isNull(opportunityStageHistoryTable.leftAt),
          ));
        await tx.insert(opportunityStageHistoryTable).values({
          orgId,
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
    // Fire-and-forget: evaluate approval rules against the updated opportunity.
    const items = await db.select().from(opportunityItemsTable).where(and(eq(opportunityItemsTable.opportunityId, id), eq(opportunityItemsTable.orgId, orgId)));
    const maxItemDiscount = items.reduce((m, it) => Math.max(m, Number(it.discount) || 0), 0);
    void evaluateApprovalsForEntity(
      "opportunity",
      id,
      {
        title: `Opportunity #${id} — ${opportunity.name}`,
        amount: opportunity.amount ? Number(opportunity.amount) : null,
        probability: opportunity.probability ?? null,
        discountPercent: maxItemDiscount,
      },
      actorFromReq(req),
      req.log,
    );
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
    const orgId = req.orgId as number;
    const [opp] = await db.select({ stage: opportunitiesTable.stage, createdAt: opportunitiesTable.createdAt }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.orgId, orgId)));
    if (!opp) {
      res.status(404).json({ error: "Opportunity not found" });
      return;
    }
    let rows = await db.select().from(opportunityStageHistoryTable)
      .where(and(eq(opportunityStageHistoryTable.opportunityId, id), eq(opportunityStageHistoryTable.orgId, orgId)))
      .orderBy(asc(opportunityStageHistoryTable.enteredAt));
    // Backfill (idempotent): seed once for legacy opps using a transaction with row lock.
    if (rows.length === 0) {
      rows = await db.transaction(async (tx) => {
        // Lock the opportunity row to serialize concurrent backfill attempts
        await tx.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.orgId, orgId))).for("update");
        const existing = await tx.select().from(opportunityStageHistoryTable)
          .where(and(eq(opportunityStageHistoryTable.opportunityId, id), eq(opportunityStageHistoryTable.orgId, orgId)))
          .orderBy(asc(opportunityStageHistoryTable.enteredAt));
        if (existing.length > 0) return existing;
        const [inserted] = await tx.insert(opportunityStageHistoryTable).values({
          orgId,
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
    await db.delete(opportunitiesTable).where(and(eq(opportunitiesTable.id, id), eq(opportunitiesTable.orgId, req.orgId as number)));
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
    const orgId = req.orgId as number;
    const [opp] = await db
      .select({ contactId: opportunitiesTable.contactId, accountId: opportunitiesTable.accountId })
      .from(opportunitiesTable)
      .where(and(eq(opportunitiesTable.id, opportunityId), eq(opportunitiesTable.orgId, orgId)));

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
      .where(and(or(...conditions), eq(contactsTable.orgId, orgId)));

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
      .where(and(eq(activitiesTable.opportunityId, opportunityId), eq(activitiesTable.orgId, req.orgId as number)))
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
    const items = await db.select().from(opportunityItemsTable).where(and(eq(opportunityItemsTable.opportunityId, opportunityId), eq(opportunityItemsTable.orgId, req.orgId as number)));
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
    const orgId = req.orgId as number;

    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, opportunityId), eq(opportunitiesTable.orgId, orgId)));
    if (!opp) { res.status(404).json({ error: "Opportunity not found" }); return; }

    const body = req.body as { items?: unknown };
    if (!body.items || !Array.isArray(body.items)) {
      res.status(400).json({ error: "Request body must contain an 'items' array." });
      return;
    }
    const items = body.items as Array<{ productId?: number | null; priceBookEntryId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }>;

    await db.delete(opportunityItemsTable).where(and(eq(opportunityItemsTable.opportunityId, opportunityId), eq(opportunityItemsTable.orgId, orgId)));

    if (items && items.length > 0) {
      await db.insert(opportunityItemsTable).values(items.map((item) => ({
        orgId,
        opportunityId,
        productId: item.productId ?? null,
        priceBookEntryId: item.priceBookEntryId ?? null,
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
      .where(and(eq(opportunitiesTable.id, opportunityId), eq(opportunitiesTable.orgId, orgId)));

    const savedItems = await db.select().from(opportunityItemsTable).where(and(eq(opportunityItemsTable.opportunityId, opportunityId), eq(opportunityItemsTable.orgId, orgId)));
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

// Opportunity attachments
// Note: opportunity_attachments has no org_id column of its own, so every handler
// below first verifies the parent opportunity belongs to the caller's org via the
// (already org-scoped) opportunitiesTable before touching the attachments row(s).
router.get("/opportunities/:id/attachments", async (req, res) => {
  try {
    const oppId = parseInt(req.params.id);
    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.orgId, req.orgId as number)));
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });
    const result = await db.execute(sql`SELECT id, opportunity_id, file_name, file_size, file_type, uploaded_by_name, created_at FROM opportunity_attachments WHERE opportunity_id = ${oppId} ORDER BY created_at DESC`);
    res.json({ data: result.rows });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.post("/opportunities/:id/attachments", async (req, res) => {
  try {
    const oppId = parseInt(req.params.id);
    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.orgId, req.orgId as number)));
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });
    const { fileName, fileSize, fileType, fileData } = req.body;
    const sessionUser = (req as any).session?.user ?? (req as any).user ?? null;
    const result = await db.execute(sql`INSERT INTO opportunity_attachments (opportunity_id, file_name, file_size, file_type, file_data, uploaded_by_name) VALUES (${oppId}, ${fileName}, ${fileSize ?? 0}, ${fileType ?? ""}, ${fileData}, ${sessionUser?.name ?? null}) RETURNING id, opportunity_id, file_name, file_size, file_type, uploaded_by_name, created_at`);
    res.status(201).json(result.rows[0]);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.get("/opportunities/:id/attachments/:attId/download", async (req, res) => {
  try {
    const oppId = parseInt(req.params.id);
    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.orgId, req.orgId as number)));
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });
    const result = await db.execute(sql`SELECT file_name, file_type, file_data FROM opportunity_attachments WHERE id = ${parseInt(req.params.attId)} AND opportunity_id = ${oppId}`);
    const att = result.rows[0] as any;
    if (!att) return res.status(404).json({ error: "Not found" });
    const buf = Buffer.from(att.file_data, "base64");
    res.setHeader("Content-Disposition", `attachment; filename="${att.file_name}"`);
    res.setHeader("Content-Type", att.file_type || "application/octet-stream");
    res.send(buf);
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/opportunities/:id/attachments/:attId", async (req, res) => {
  try {
    const oppId = parseInt(req.params.id);
    const [opp] = await db.select({ id: opportunitiesTable.id }).from(opportunitiesTable).where(and(eq(opportunitiesTable.id, oppId), eq(opportunitiesTable.orgId, req.orgId as number)));
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });
    await db.execute(sql`DELETE FROM opportunity_attachments WHERE id = ${parseInt(req.params.attId)} AND opportunity_id = ${oppId}`);
    res.json({ success: true });
  } catch (err) { req.log.error(err); res.status(500).json({ error: "Internal server error" }); }
});

export default router;
