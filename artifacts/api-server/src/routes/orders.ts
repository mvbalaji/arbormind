import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, quotesTable, quoteItemsTable, opportunitiesTable, contactsTable, accountsTable } from "@workspace/db";
import { eq, sql, inArray, desc, and } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { getOrgId } from "../lib/org-context";

const router: IRouter = Router();
router.use("/orders", requireScreenAccess("orders"));

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const orderFields = {
  id: ordersTable.id,
  orderNumber: ordersTable.orderNumber,
  quoteId: ordersTable.quoteId,
  opportunityId: ordersTable.opportunityId,
  contactId: ordersTable.contactId,
  accountId: ordersTable.accountId,
  createdByUserId: ordersTable.createdByUserId,
  status: ordersTable.status,
  subtotal: ordersTable.subtotal,
  discount: ordersTable.discount,
  tax: ordersTable.tax,
  total: ordersTable.total,
  notes: ordersTable.notes,
  orderDate: ordersTable.orderDate,
  createdAt: ordersTable.createdAt,
  updatedAt: ordersTable.updatedAt,
  opportunityName: opportunitiesTable.name,
  contactFirstName: contactsTable.firstName,
  contactLastName: contactsTable.lastName,
  accountName: accountsTable.name,
  quoteNumber: quotesTable.quoteNumber,
};

type OrderRow = {
  contactFirstName?: string | null;
  contactLastName?: string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  [key: string]: unknown;
};

function formatOrder(o: OrderRow, items: unknown[] = []) {
  const { contactFirstName, contactLastName, ...rest } = o;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName ?? ""}`.trim() : null,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    tax: Number(o.tax),
    total: Number(o.total),
    items,
  };
}

function formatItem(item: { quantity: string; unitPrice: string; discount: string; total: string; [key: string]: unknown }) {
  return {
    ...item,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    total: Number(item.total),
  };
}

router.get("/orders", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(ordersTable.orgId, orgId)];
    const whereClause = and(...conditions);

    const rawData = await db
      .select(orderFields)
      .from(ordersTable)
      .leftJoin(opportunitiesTable, eq(ordersTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(ordersTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(ordersTable.accountId, accountsTable.id))
      .leftJoin(quotesTable, eq(ordersTable.quoteId, quotesTable.id))
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const orderIds = rawData.map(o => o.id);
    const allItems = orderIds.length > 0
      ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds))
      : [];

    const itemsByOrder = new Map<number, ReturnType<typeof formatItem>[]>();
    for (const item of allItems) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(formatItem(item));
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable).where(whereClause);
    res.json({
      data: rawData.map(o => formatOrder(o, itemsByOrder.get(o.id) ?? [])),
      total: Number(countResult.count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const { items = [], ...orderData } = req.body as {
      items?: Array<{ productId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }>;
      [key: string]: unknown;
    };

    // Verify any referenced quote/opportunity/contact/account actually belongs to this org —
    // otherwise a crafted request could attach this order to another org's records.
    for (const [field, table] of [
      ["quoteId", quotesTable],
      ["opportunityId", opportunitiesTable],
      ["contactId", contactsTable],
      ["accountId", accountsTable],
    ] as const) {
      const refId = orderData[field];
      if (refId != null) {
        const [row] = await db.select({ id: table.id }).from(table).where(and(eq(table.id, refId as number), eq(table.orgId, orgId)));
        if (!row) { res.status(400).json({ error: `Invalid ${field}` }); return; }
      }
    }

    const sessionUserId = (req.session as any)?.user?.id ?? (req as any).user?.id ?? null;

    const [maxOrder] = await db.select({ maxNum: sql<string>`max(order_number)` }).from(ordersTable);
    const nextNum = maxOrder?.maxNum ? parseInt(maxOrder.maxNum.replace("ORD-", "")) + 1 : 5001;
    const orderNumber = `ORD-${nextNum}`;

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
    }
    const discountPct = Number(orderData.discount) || 0;
    const taxPct = Number(orderData.tax) || 0;
    const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);

    const [order] = await db.insert(ordersTable).values({
      orgId,
      orderNumber,
      quoteId: (orderData.quoteId as number | null) ?? null,
      opportunityId: (orderData.opportunityId as number | null) ?? null,
      contactId: (orderData.contactId as number | null) ?? null,
      accountId: (orderData.accountId as number | null) ?? null,
      createdByUserId: sessionUserId,
      status: (orderData.status as string) ?? "pending",
      notes: (orderData.notes as string) ?? null,
      subtotal: subtotal.toString(),
      discount: discountPct.toString(),
      tax: taxPct.toString(),
      total: total.toString(),
    }).returning();

    if (items.length > 0) {
      await db.insert(orderItemsTable).values(items.map(item => ({
        orderId: order.id,
        productId: item.productId ?? null,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount ?? 0).toString(),
        total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
      })));
    }

    res.status(201).json(formatOrder(order, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/orders/from-quote/:quoteId", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const quoteId = parseId(req.params.quoteId);
    if (!quoteId) { res.status(400).json({ error: "Invalid quote ID" }); return; }

    const [quote] = await db.select().from(quotesTable).where(and(eq(quotesTable.id, quoteId), eq(quotesTable.orgId, orgId)));
    if (!quote) { res.status(404).json({ error: "Quote not found" }); return; }
    if (quote.status !== "accepted") {
      res.status(400).json({ error: "Only accepted quotes can be converted to orders" });
      return;
    }

    const quoteItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));

    const sessionUserId = (req.session as any)?.user?.id ?? (req as any).user?.id ?? quote.createdByUserId ?? null;

    const [maxOrder] = await db.select({ maxNum: sql<string>`max(order_number)` }).from(ordersTable);
    const nextNum = maxOrder?.maxNum ? parseInt(maxOrder.maxNum.replace("ORD-", "")) + 1 : 5001;
    const orderNumber = `ORD-${nextNum}`;

    const [order] = await db.insert(ordersTable).values({
      orgId,
      orderNumber,
      quoteId: quote.id,
      opportunityId: quote.opportunityId,
      contactId: quote.contactId,
      accountId: quote.accountId,
      createdByUserId: sessionUserId,
      status: "pending",
      subtotal: quote.subtotal,
      discount: quote.discount,
      tax: quote.tax,
      total: quote.total,
      notes: quote.notes,
    }).returning();

    if (quoteItems.length > 0) {
      await db.insert(orderItemsTable).values(quoteItems.map(item => ({
        orderId: order.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total,
      })));
    }

    res.status(201).json(formatOrder(order, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const [order] = await db
      .select(orderFields)
      .from(ordersTable)
      .leftJoin(opportunitiesTable, eq(ordersTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(ordersTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(ordersTable.accountId, accountsTable.id))
      .leftJoin(quotesTable, eq(ordersTable.quoteId, quotesTable.id))
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)));

    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    res.json(formatOrder(order, items.map(formatItem)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const VALID_ORDER_STATUSES = new Set(["pending", "confirmed", "shipped", "delivered", "cancelled"]);

router.put("/orders/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid order ID" }); return; }

    if (req.body.status && !VALID_ORDER_STATUSES.has(req.body.status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${[...VALID_ORDER_STATUSES].join(", ")}` });
      return;
    }

    const [existing] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const { items, ...orderData } = req.body as {
      items?: Array<{ productId?: number | null; productName: string; quantity: number; unitPrice: number; discount?: number }>;
      [key: string]: unknown;
    };

    const allowedFields = ["status", "notes", "discount", "tax"];
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowedFields) {
      if (orderData[key] !== undefined) updateData[key] = orderData[key];
    }

    if (items) {
      await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      if (items.length > 0) {
        await db.insert(orderItemsTable).values(items.map(item => ({
          orderId: id,
          productId: item.productId ?? null,
          productName: item.productName,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          discount: (item.discount ?? 0).toString(),
          total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
        })));
      }
    }

    const needsRecalc = items !== undefined || orderData.discount !== undefined || orderData.tax !== undefined;
    if (needsRecalc) {
      const currentItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
      let subtotal = 0;
      for (const item of currentItems) {
        subtotal += Number(item.quantity) * Number(item.unitPrice) * (1 - Number(item.discount) / 100);
      }
      const discountPct = Number(orderData.discount ?? existing.discount) || 0;
      const taxPct = Number(orderData.tax ?? existing.tax) || 0;
      const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);
      updateData.subtotal = subtotal.toString();
      updateData.total = total.toString();
    }

    const [order] = await db.update(ordersTable)
      .set(updateData)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)))
      .returning();

    const updatedItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    res.json(formatOrder(order, updatedItems.map(formatItem)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const orgId = getOrgId(req);
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid order ID" }); return; }
    const [existing] = await db.select({ id: ordersTable.id }).from(ordersTable).where(and(eq(ordersTable.id, id), eq(ordersTable.orgId, orgId)));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    await db.delete(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    await db.delete(ordersTable).where(eq(ordersTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
