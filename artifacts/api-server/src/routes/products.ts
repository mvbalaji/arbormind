import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, ilike, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/products", async (req, res) => {
  try {
    const { search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const data = await (search
      ? db.select().from(productsTable).where(ilike(productsTable.name, `%${search}%`))
      : db.select().from(productsTable)
    ).limit(limitNum).offset(offset);

    const searchWhere = search ? ilike(productsTable.name, `%${search}%`) : undefined;
    const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(productsTable).where(searchWhere);
    res.json({
      data: data.map(p => ({ ...p, unitPrice: Number(p.unitPrice) })),
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
    const [product] = await db.insert(productsTable).values(req.body).returning();
    res.status(201).json({ ...product, unitPrice: Number(product.unitPrice) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parseInt(req.params.id)));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.json({ ...product, unitPrice: Number(product.unitPrice) });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const [product] = await db.update(productsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(productsTable.id, parseInt(req.params.id)))
      .returning();
    if (!product) {
      res.status(404).json({ error: "Product not found" });
    } else {
      res.json({ ...product, unitPrice: Number(product.unitPrice) });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
