import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable, opportunitiesTable, contactsTable, accountsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/quotes", async (req, res) => {
  try {
    const { opportunityId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select({
        id: quotesTable.id,
        quoteNumber: quotesTable.quoteNumber,
        name: quotesTable.name,
        opportunityId: quotesTable.opportunityId,
        opportunityName: opportunitiesTable.name,
        contactId: quotesTable.contactId,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
        accountId: quotesTable.accountId,
        accountName: accountsTable.name,
        status: quotesTable.status,
        validUntil: quotesTable.validUntil,
        subtotal: quotesTable.subtotal,
        discount: quotesTable.discount,
        tax: quotesTable.tax,
        total: quotesTable.total,
        notes: quotesTable.notes,
        createdAt: quotesTable.createdAt,
        updatedAt: quotesTable.updatedAt,
      })
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id));

    let rawData: any[];
    if (opportunityId) {
      rawData = await baseQuery.where(eq(quotesTable.opportunityId, parseInt(opportunityId))).limit(limitNum).offset(offset);
    } else {
      rawData = await baseQuery.limit(limitNum).offset(offset);
    }

    const quoteIds = rawData.map(q => q.id);
    let allItems: any[] = [];
    if (quoteIds.length > 0) {
      allItems = await db.select().from(quoteItemsTable).where(
        sql`${quoteItemsTable.quoteId} = ANY(${sql.raw(`ARRAY[${quoteIds.join(',')}]::int[]`)})`
      );
    }

    const itemsByQuote = new Map<number, any[]>();
    for (const item of allItems) {
      if (!itemsByQuote.has(item.quoteId)) itemsByQuote.set(item.quoteId, []);
      itemsByQuote.get(item.quoteId)!.push({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        total: Number(item.total),
      });
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(quotesTable);
    const data = rawData.map(q => ({
      ...q,
      contactName: q.contactFirstName ? `${q.contactFirstName} ${q.contactLastName}` : null,
      contactFirstName: undefined,
      contactLastName: undefined,
      subtotal: Number(q.subtotal),
      discount: Number(q.discount),
      tax: Number(q.tax),
      total: Number(q.total),
      items: itemsByQuote.get(q.id) || [],
    }));

    res.json({ data, total: Number(countResult.count), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { items = [], ...quoteData } = req.body;

    const [maxQuote] = await db.select({ maxNum: sql<string>`max(quote_number)` }).from(quotesTable);
    const nextNum = maxQuote?.maxNum ? parseInt(maxQuote.maxNum.replace('QT-', '')) + 1 : 1001;
    const quoteNumber = `QT-${nextNum}`;

    let subtotal = 0;
    for (const item of items) {
      const itemTotal = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
      subtotal += itemTotal;
    }
    const discount = quoteData.discount || 0;
    const tax = quoteData.tax || 0;
    const total = subtotal * (1 - discount / 100) * (1 + tax / 100);

    const [quote] = await db.insert(quotesTable).values({
      ...quoteData,
      quoteNumber,
      subtotal: subtotal.toString(),
      total: total.toString(),
    }).returning();

    if (items.length > 0) {
      await db.insert(quoteItemsTable).values(items.map((item: any) => ({
        quoteId: quote.id,
        productId: item.productId || null,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount || 0).toString(),
        total: (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)).toString(),
      })));
    }

    res.status(201).json({ ...quote, subtotal: Number(quote.subtotal), discount: Number(quote.discount), tax: Number(quote.tax), total: Number(quote.total), items: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quote] = await db.select({
      id: quotesTable.id,
      quoteNumber: quotesTable.quoteNumber,
      name: quotesTable.name,
      opportunityId: quotesTable.opportunityId,
      opportunityName: opportunitiesTable.name,
      contactId: quotesTable.contactId,
      contactFirstName: contactsTable.firstName,
      contactLastName: contactsTable.lastName,
      accountId: quotesTable.accountId,
      accountName: accountsTable.name,
      status: quotesTable.status,
      validUntil: quotesTable.validUntil,
      subtotal: quotesTable.subtotal,
      discount: quotesTable.discount,
      tax: quotesTable.tax,
      total: quotesTable.total,
      notes: quotesTable.notes,
      createdAt: quotesTable.createdAt,
      updatedAt: quotesTable.updatedAt,
    })
    .from(quotesTable)
    .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
    .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
    .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id))
    .where(eq(quotesTable.id, id));

    if (!quote) return res.status(404).json({ error: "Quote not found" });

    const quoteItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    res.json({
      ...quote,
      contactName: quote.contactFirstName ? `${quote.contactFirstName} ${quote.contactLastName}` : null,
      subtotal: Number(quote.subtotal),
      discount: Number(quote.discount),
      tax: Number(quote.tax),
      total: Number(quote.total),
      items: quoteItems.map(i => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice), discount: Number(i.discount), total: Number(i.total) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/quotes/:id", async (req, res) => {
  try {
    const { items, ...quoteData } = req.body;
    const [quote] = await db.update(quotesTable)
      .set({ ...quoteData, updatedAt: new Date() })
      .where(eq(quotesTable.id, parseInt(req.params.id)))
      .returning();
    if (!quote) return res.status(404).json({ error: "Quote not found" });
    res.json({ ...quote, subtotal: Number(quote.subtotal), discount: Number(quote.discount), tax: Number(quote.tax), total: Number(quote.total), items: [] });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/quotes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    await db.delete(quotesTable).where(eq(quotesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
