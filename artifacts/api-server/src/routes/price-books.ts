import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { priceBooksTable, priceBookEntriesTable, productsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { getStandardPriceBook, productHasStandardEntry, syncStandardEntry } from "../lib/pricing";

const router: IRouter = Router();
router.use("/price-books", requireScreenAccess("price-books"));

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatEntry(e: { listPrice: string | null; [key: string]: unknown }) {
  return { ...e, listPrice: e.listPrice == null ? null : Number(e.listPrice) };
}

// ── Price Books ────────────────────────────────────────────────────────────

router.get("/price-books", async (req, res) => {
  try {
    await getStandardPriceBook();
    const rows = await db
      .select()
      .from(priceBooksTable)
      .orderBy(desc(priceBooksTable.isStandard), priceBooksTable.name);

    const counts = await db
      .select({
        priceBookId: priceBookEntriesTable.priceBookId,
        count: sql<number>`count(*)`,
      })
      .from(priceBookEntriesTable)
      .groupBy(priceBookEntriesTable.priceBookId);
    const countByBook = new Map(counts.map((c) => [c.priceBookId, Number(c.count)]));

    res.json({
      data: rows.map((r) => ({ ...r, entryCount: countByBook.get(r.id) ?? 0 })),
      total: rows.length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/price-books", async (req, res) => {
  try {
    const { name, description, isActive } = req.body as {
      name?: string;
      description?: string;
      isActive?: boolean;
    };
    if (!name || !name.trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [book] = await db
      .insert(priceBooksTable)
      .values({
        name: name.trim(),
        description: description ?? null,
        isStandard: false,
        isActive: isActive ?? true,
      })
      .returning();
    res.status(201).json(book);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/price-books/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid price book ID" }); return; }
    const [book] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, id));
    if (!book) { res.status(404).json({ error: "Price book not found" }); return; }

    const entries = await db
      .select({
        id: priceBookEntriesTable.id,
        priceBookId: priceBookEntriesTable.priceBookId,
        productId: priceBookEntriesTable.productId,
        listPrice: priceBookEntriesTable.listPrice,
        currency: priceBookEntriesTable.currency,
        isActive: priceBookEntriesTable.isActive,
        createdAt: priceBookEntriesTable.createdAt,
        updatedAt: priceBookEntriesTable.updatedAt,
        productName: productsTable.name,
        productCode: productsTable.code,
        productCategory: productsTable.category,
      })
      .from(priceBookEntriesTable)
      .leftJoin(productsTable, eq(priceBookEntriesTable.productId, productsTable.id))
      .where(eq(priceBookEntriesTable.priceBookId, id))
      .orderBy(productsTable.name);

    res.json({ ...book, entries: entries.map(formatEntry) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/price-books/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid price book ID" }); return; }
    const [existing] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, id));
    if (!existing) { res.status(404).json({ error: "Price book not found" }); return; }

    const { name, description, isActive } = req.body as {
      name?: string;
      description?: string;
      isActive?: boolean;
    };
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (!name.trim()) { res.status(400).json({ error: "Name cannot be empty" }); return; }
      // Standard book name is locked.
      if (!existing.isStandard) updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) {
      // Standard book must stay active.
      if (!existing.isStandard) updateData.isActive = isActive;
    }
    const [book] = await db
      .update(priceBooksTable)
      .set(updateData)
      .where(eq(priceBooksTable.id, id))
      .returning();
    res.json(book);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/price-books/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid price book ID" }); return; }
    const [existing] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, id));
    if (!existing) { res.status(404).json({ error: "Price book not found" }); return; }
    if (existing.isStandard) {
      res.status(400).json({ error: "The Standard Price Book cannot be deleted." });
      return;
    }
    await db.delete(priceBookEntriesTable).where(eq(priceBookEntriesTable.priceBookId, id));
    await db.delete(priceBooksTable).where(eq(priceBooksTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Price Book Entries ───────────────────────────────────────────────────────

router.post("/price-books/:id/entries", async (req, res) => {
  try {
    const priceBookId = parseId(req.params.id);
    if (!priceBookId) { res.status(400).json({ error: "Invalid price book ID" }); return; }
    const [book] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, priceBookId));
    if (!book) { res.status(404).json({ error: "Price book not found" }); return; }

    const { productId, listPrice, currency, isActive } = req.body as {
      productId?: number;
      listPrice?: number | string;
      currency?: string;
      isActive?: boolean;
    };
    if (!productId || !Number.isFinite(productId)) {
      res.status(400).json({ error: "productId is required" });
      return;
    }
    if (listPrice == null || isNaN(Number(listPrice)) || Number(listPrice) < 0) {
      res.status(400).json({ error: "A valid listPrice is required" });
      return;
    }

    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }

    // Standard-price-first rule: a product must have a Standard Price entry
    // before it can be added to any custom price book.
    if (book.isStandard) {
      // Adding/keeping the standard entry also syncs the product's unitPrice.
      await syncStandardEntry(productId, Number(listPrice), "GBP");
      await db
        .update(productsTable)
        .set({ unitPrice: Number(listPrice).toString(), updatedAt: new Date() })
        .where(eq(productsTable.id, productId));
      const [entry] = await db
        .select()
        .from(priceBookEntriesTable)
        .where(and(eq(priceBookEntriesTable.priceBookId, priceBookId), eq(priceBookEntriesTable.productId, productId)));
      res.status(201).json(formatEntry(entry));
      return;
    }

    if (!(await productHasStandardEntry(productId))) {
      res.status(400).json({
        error: "This product needs a Standard Price before it can be added to a custom price book.",
      });
      return;
    }

    // One entry per product per book.
    const [dupe] = await db
      .select({ id: priceBookEntriesTable.id })
      .from(priceBookEntriesTable)
      .where(and(eq(priceBookEntriesTable.priceBookId, priceBookId), eq(priceBookEntriesTable.productId, productId)));
    if (dupe) {
      res.status(409).json({ error: "This product is already in this price book." });
      return;
    }

    const [entry] = await db
      .insert(priceBookEntriesTable)
      .values({
        priceBookId,
        productId,
        listPrice: Number(listPrice).toString(),
        currency: "GBP",
        isActive: isActive ?? true,
      })
      .returning();
    res.status(201).json(formatEntry(entry));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/price-books/:id/entries/:entryId", async (req, res) => {
  try {
    const priceBookId = parseId(req.params.id);
    const entryId = parseId(req.params.entryId);
    if (!priceBookId || !entryId) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [entry] = await db
      .select()
      .from(priceBookEntriesTable)
      .where(and(eq(priceBookEntriesTable.id, entryId), eq(priceBookEntriesTable.priceBookId, priceBookId)));
    if (!entry) { res.status(404).json({ error: "Price book entry not found" }); return; }
    const [book] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, priceBookId));

    const { listPrice, currency, isActive } = req.body as {
      listPrice?: number | string;
      currency?: string;
      isActive?: boolean;
    };
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (listPrice !== undefined) {
      if (isNaN(Number(listPrice)) || Number(listPrice) < 0) {
        res.status(400).json({ error: "A valid listPrice is required" });
        return;
      }
      updateData.listPrice = Number(listPrice).toString();
    }
    if (currency !== undefined) updateData.currency = "GBP";
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(priceBookEntriesTable)
      .set(updateData)
      .where(eq(priceBookEntriesTable.id, entryId))
      .returning();

    // Editing the Standard Price keeps the product's unitPrice in sync.
    if (book?.isStandard && updateData.listPrice !== undefined) {
      await db
        .update(productsTable)
        .set({ unitPrice: updateData.listPrice as string, updatedAt: new Date() })
        .where(eq(productsTable.id, entry.productId));
    }
    res.json(formatEntry(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/price-books/:id/entries/:entryId", async (req, res) => {
  try {
    const priceBookId = parseId(req.params.id);
    const entryId = parseId(req.params.entryId);
    if (!priceBookId || !entryId) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [entry] = await db
      .select()
      .from(priceBookEntriesTable)
      .where(and(eq(priceBookEntriesTable.id, entryId), eq(priceBookEntriesTable.priceBookId, priceBookId)));
    if (!entry) { res.status(404).json({ error: "Price book entry not found" }); return; }
    const [book] = await db.select().from(priceBooksTable).where(eq(priceBooksTable.id, priceBookId));
    if (book?.isStandard) {
      res.status(400).json({
        error: "Cannot remove a product's Standard Price. Remove the product from custom books first.",
      });
      return;
    }
    await db.delete(priceBookEntriesTable).where(eq(priceBookEntriesTable.id, entryId));
    res.json({ success: true, id: entryId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Entries for a given product across all books (used by Products page) ──────

router.get("/price-books/by-product/:productId", async (req, res) => {
  try {
    const productId = parseId(req.params.productId);
    if (!productId) { res.status(400).json({ error: "Invalid product ID" }); return; }
    const rows = await db
      .select({
        id: priceBookEntriesTable.id,
        priceBookId: priceBookEntriesTable.priceBookId,
        productId: priceBookEntriesTable.productId,
        listPrice: priceBookEntriesTable.listPrice,
        currency: priceBookEntriesTable.currency,
        isActive: priceBookEntriesTable.isActive,
        priceBookName: priceBooksTable.name,
        isStandard: priceBooksTable.isStandard,
      })
      .from(priceBookEntriesTable)
      .leftJoin(priceBooksTable, eq(priceBookEntriesTable.priceBookId, priceBooksTable.id))
      .where(eq(priceBookEntriesTable.productId, productId))
      .orderBy(desc(priceBooksTable.isStandard), priceBooksTable.name);
    res.json({ data: rows.map(formatEntry) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Active entries for a given book (used by quote/opportunity line editors) ──

router.get("/price-books/:id/active-entries", async (req, res) => {
  try {
    const priceBookId = parseId(req.params.id);
    if (!priceBookId) { res.status(400).json({ error: "Invalid price book ID" }); return; }
    const rows = await db
      .select({
        id: priceBookEntriesTable.id,
        priceBookId: priceBookEntriesTable.priceBookId,
        productId: priceBookEntriesTable.productId,
        listPrice: priceBookEntriesTable.listPrice,
        currency: priceBookEntriesTable.currency,
        productName: productsTable.name,
        productCode: productsTable.code,
      })
      .from(priceBookEntriesTable)
      .leftJoin(productsTable, eq(priceBookEntriesTable.productId, productsTable.id))
      .where(and(eq(priceBookEntriesTable.priceBookId, priceBookId), eq(priceBookEntriesTable.isActive, true)))
      .orderBy(productsTable.name);
    res.json({ data: rows.map(formatEntry) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
