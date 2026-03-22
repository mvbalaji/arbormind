import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable, opportunitiesTable, contactsTable, accountsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const quoteFields = {
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
};

type QuoteRow = {
  contactFirstName?: string | null;
  contactLastName?: string | null;
  subtotal: string | null;
  discount: string | null;
  tax: string | null;
  total: string | null;
  [key: string]: unknown;
};

function formatQuote(q: QuoteRow, items: unknown[] = []) {
  const { contactFirstName, contactLastName, ...rest } = q;
  return {
    ...rest,
    contactName: contactFirstName ? `${contactFirstName} ${contactLastName}` : null,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    tax: Number(q.tax),
    total: Number(q.total),
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

router.get("/quotes", async (req, res) => {
  try {
    const { opportunityId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const baseQuery = db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id));

    const rawData = await (opportunityId
      ? baseQuery.where(eq(quotesTable.opportunityId, parseInt(opportunityId)))
      : baseQuery
    ).limit(limitNum).offset(offset);

    const quoteIds = rawData.map(q => q.id);
    const allItems = quoteIds.length > 0
      ? await db.select().from(quoteItemsTable).where(
          sql`${quoteItemsTable.quoteId} = ANY(ARRAY[${sql.raw(quoteIds.join(","))}]::int[])`
        )
      : [];

    const itemsByQuote = new Map<number, ReturnType<typeof formatItem>[]>();
    for (const item of allItems) {
      if (!itemsByQuote.has(item.quoteId)) itemsByQuote.set(item.quoteId, []);
      itemsByQuote.get(item.quoteId)!.push(formatItem(item));
    }

    const quoteWhere = opportunityId ? eq(quotesTable.opportunityId, parseInt(opportunityId)) : undefined;
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(quotesTable).where(quoteWhere);
    res.json({
      data: rawData.map(q => formatQuote(q, itemsByQuote.get(q.id) ?? [])),
      total: Number(countResult.count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes", async (req, res) => {
  try {
    const { items = [], ...quoteData } = req.body as { items?: Array<{ productId?: number; productName: string; quantity: number; unitPrice: number; discount?: number }>; [key: string]: unknown };

    const [maxQuote] = await db.select({ maxNum: sql<string>`max(quote_number)` }).from(quotesTable);
    const nextNum = maxQuote?.maxNum ? parseInt(maxQuote.maxNum.replace("QT-", "")) + 1 : 1001;
    const quoteNumber = `QT-${nextNum}`;

    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100);
    }
    const discountPct = Number(quoteData.discount) || 0;
    const taxPct = Number(quoteData.tax) || 0;
    const total = subtotal * (1 - discountPct / 100) * (1 + taxPct / 100);

    const insertData = {
      name: (quoteData.name as string) ?? "",
      opportunityId: quoteData.opportunityId as number | null ?? null,
      contactId: quoteData.contactId as number | null ?? null,
      accountId: quoteData.accountId as number | null ?? null,
      status: (quoteData.status as string) ?? "draft",
      validUntil: quoteData.validUntil ? new Date(quoteData.validUntil as string) : null,
      discount: (quoteData.discount as string) ?? "0",
      tax: (quoteData.tax as string) ?? "0",
      notes: (quoteData.notes as string) ?? null,
      quoteNumber,
      subtotal: subtotal.toString(),
      total: total.toString(),
    };
    const [quote] = await db.insert(quotesTable).values(insertData).returning();

    if (items.length > 0) {
      await db.insert(quoteItemsTable).values(items.map(item => ({
        quoteId: quote.id,
        productId: item.productId ?? null,
        productName: item.productName,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount ?? 0).toString(),
        total: (item.quantity * item.unitPrice * (1 - (item.discount ?? 0) / 100)).toString(),
      })));
    }

    res.status(201).json(formatQuote(quote, []));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [quote] = await db
      .select(quoteFields)
      .from(quotesTable)
      .leftJoin(opportunitiesTable, eq(quotesTable.opportunityId, opportunitiesTable.id))
      .leftJoin(contactsTable, eq(quotesTable.contactId, contactsTable.id))
      .leftJoin(accountsTable, eq(quotesTable.accountId, accountsTable.id))
      .where(eq(quotesTable.id, id));

    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    const quoteItems = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));
    res.json(formatQuote(quote, quoteItems.map(formatItem)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/quotes/:id", async (req, res) => {
  try {
    const { items: _items, ...quoteData } = req.body as { items?: unknown; [key: string]: unknown };
    const [quote] = await db.update(quotesTable)
      .set({ ...(quoteData as Record<string, unknown>), updatedAt: new Date() })
      .where(eq(quotesTable.id, parseInt(req.params.id)))
      .returning();
    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
    } else {
      res.json(formatQuote(quote, []));
    }
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
