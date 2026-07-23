import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable, priceBookEntriesTable } from "@workspace/db";
import { eq, ilike, sql, and } from "drizzle-orm";

import { requireScreenAccess } from "../lib/access-control";
import { syncStandardEntry } from "../lib/pricing";

const router: IRouter = Router();
router.use("/products", requireScreenAccess("products"));

router.get("/products", async (req, res) => {
  try {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const orgId = req.orgId as number;
    const searchWhere = search
      ? and(eq(productsTable.orgId, orgId), ilike(productsTable.name, `%${search}%`))
      : eq(productsTable.orgId, orgId);
    const data = await db.select().from(productsTable).where(searchWhere).limit(limitNum).offset(offset);

    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(searchWhere);
    res.json({
      data: data.map(p => ({ ...p, unitPrice: Number(p.unitPrice), costPrice: p.costPrice != null ? Number(p.costPrice) : null })),
      total: Number(countResult.count),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products", async (req, res) => {
  try {
    // Single base-currency model: all product prices are stored in GBP.
    const [product] = await db.insert(productsTable).values({ ...req.body, orgId: req.orgId, currency: "GBP" }).returning();
    await syncStandardEntry(product.orgId, product.id, product.unitPrice, product.currency);
    res.status(201).json({ ...product, unitPrice: Number(product.unitPrice) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(and(eq(productsTable.id, parseInt(req.params.id)), eq(productsTable.orgId, req.orgId as number)));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.json({ ...product, unitPrice: Number(product.unitPrice), costPrice: product.costPrice != null ? Number(product.costPrice) : null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const [product] = await db.update(productsTable)
      .set({ ...req.body, currency: "GBP", updatedAt: new Date() })
      .where(and(eq(productsTable.id, parseInt(req.params.id)), eq(productsTable.orgId, req.orgId as number)))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      await syncStandardEntry(product.orgId, product.id, product.unitPrice, product.currency);
      res.json({ ...product, unitPrice: Number(product.unitPrice), costPrice: product.costPrice != null ? Number(product.costPrice) : null });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const orgId = req.orgId as number;
    // Remove dependent price book entries first (FK is NOT NULL), including the
    // auto-created Standard Price entry, otherwise the delete fails with a FK violation.
    await db.delete(priceBookEntriesTable).where(and(eq(priceBookEntriesTable.productId, id), eq(priceBookEntriesTable.orgId, orgId)));
    await db.delete(productsTable).where(and(eq(productsTable.id, id), eq(productsTable.orgId, orgId)));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
