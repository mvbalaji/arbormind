import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

// List all bundles with their items
router.get("/product-bundles", async (req, res) => {
  try {
    const bundles = await db.execute(sql`SELECT * FROM product_bundles WHERE org_id = ${req.orgId} ORDER BY name ASC`);
    const items = await db.execute(sql`
      SELECT pbi.*, p.name as product_name, p.unit_price as default_unit_price, p.code as product_code, p.category as product_category
      FROM product_bundle_items pbi
      JOIN products p ON p.id = pbi.product_id
      WHERE pbi.org_id = ${req.orgId}
      ORDER BY pbi.bundle_id, pbi.sort_order
    `);
    const itemsByBundle = new Map<number, any[]>();
    for (const item of items.rows) {
      const bid = item.bundle_id as number;
      if (!itemsByBundle.has(bid)) itemsByBundle.set(bid, []);
      itemsByBundle.get(bid)!.push(item);
    }
    const result = (bundles.rows as any[]).map((b) => ({
      ...b,
      items: itemsByBundle.get(b.id) ?? [],
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Get single bundle
router.get("/product-bundles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const bundles = await db.execute(sql`SELECT * FROM product_bundles WHERE id = ${id} AND org_id = ${req.orgId}`);
    if (!bundles.rows.length) return res.status(404).json({ error: "Not found" });
    const items = await db.execute(sql`
      SELECT pbi.*, p.name as product_name, p.unit_price as default_unit_price, p.code as product_code
      FROM product_bundle_items pbi
      JOIN products p ON p.id = pbi.product_id
      WHERE pbi.bundle_id = ${id} AND pbi.org_id = ${req.orgId}
      ORDER BY pbi.sort_order
    `);
    res.json({ ...bundles.rows[0], items: items.rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Create bundle
router.post("/product-bundles", async (req, res) => {
  try {
    const { name, description, bundle_discount_pct = 0, is_active = true, items = [] } = req.body;
    const result = await db.execute(sql`
      INSERT INTO product_bundles (org_id, name, description, bundle_discount_pct, is_active)
      VALUES (${req.orgId}, ${name}, ${description ?? null}, ${bundle_discount_pct}, ${is_active})
      RETURNING *
    `);
    const bundle = result.rows[0] as any;
    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await db.execute(sql`
        INSERT INTO product_bundle_items (org_id, bundle_id, product_id, quantity, unit_price_override, discount_pct, sort_order)
        VALUES (${req.orgId}, ${bundle.id}, ${item.product_id}, ${item.quantity ?? 1}, ${item.unit_price_override ?? null}, ${item.discount_pct ?? 0}, ${i})
      `);
    }
    // Return with items
    const fullItems = await db.execute(sql`
      SELECT pbi.*, p.name as product_name, p.unit_price as default_unit_price
      FROM product_bundle_items pbi JOIN products p ON p.id = pbi.product_id
      WHERE pbi.bundle_id = ${bundle.id} AND pbi.org_id = ${req.orgId} ORDER BY pbi.sort_order
    `);
    res.status(201).json({ ...bundle, items: fullItems.rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Update bundle
router.put("/product-bundles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, bundle_discount_pct, is_active, items } = req.body;
    await db.execute(sql`
      UPDATE product_bundles SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        bundle_discount_pct = COALESCE(${bundle_discount_pct ?? null}, bundle_discount_pct),
        is_active = COALESCE(${is_active ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND org_id = ${req.orgId}
    `);
    // Replace items if provided
    if (Array.isArray(items)) {
      await db.execute(sql`DELETE FROM product_bundle_items WHERE bundle_id = ${id} AND org_id = ${req.orgId}`);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await db.execute(sql`
          INSERT INTO product_bundle_items (org_id, bundle_id, product_id, quantity, unit_price_override, discount_pct, sort_order)
          VALUES (${req.orgId}, ${id}, ${item.product_id}, ${item.quantity ?? 1}, ${item.unit_price_override ?? null}, ${item.discount_pct ?? 0}, ${i})
        `);
      }
    }
    const bundle = await db.execute(sql`SELECT * FROM product_bundles WHERE id = ${id} AND org_id = ${req.orgId}`);
    const fullItems = await db.execute(sql`
      SELECT pbi.*, p.name as product_name, p.unit_price as default_unit_price
      FROM product_bundle_items pbi JOIN products p ON p.id = pbi.product_id
      WHERE pbi.bundle_id = ${id} AND pbi.org_id = ${req.orgId} ORDER BY pbi.sort_order
    `);
    res.json({ ...bundle.rows[0], items: fullItems.rows });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Delete bundle
router.delete("/product-bundles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.execute(sql`DELETE FROM product_bundle_items WHERE bundle_id = ${id} AND org_id = ${req.orgId}`);
    await db.execute(sql`DELETE FROM product_bundles WHERE id = ${id} AND org_id = ${req.orgId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
