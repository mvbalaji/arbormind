import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productRulesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireScreenAccess } from "../lib/access-control";

const router: IRouter = Router();
router.use("/admin/product-rules", requireScreenAccess("products", "edit"));

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// GET /admin/product-rules
router.get("/admin/product-rules", async (req, res) => {
  try {
    const rules = await db.select().from(productRulesTable).orderBy(asc(productRulesTable.sortOrder), asc(productRulesTable.name));
    res.json({ rules });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load product rules" });
  }
});

// POST /admin/product-rules
router.post("/admin/product-rules", async (req, res) => {
  try {
    const { name, type, scope, conditionsMet, conditions, actions, errorMessage, active, sortOrder } = req.body as {
      name?: string; type?: string; scope?: string; conditionsMet?: string;
      conditions?: unknown[]; actions?: unknown[]; errorMessage?: string; active?: boolean; sortOrder?: number;
    };
    if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
    if (!type) { res.status(400).json({ error: "Type is required" }); return; }

    const [rule] = await db.insert(productRulesTable).values({
      name: name.trim(),
      type,
      scope: scope ?? "Product",
      conditionsMet: conditionsMet ?? "All",
      conditions: JSON.stringify(conditions ?? []),
      actions: JSON.stringify(actions ?? []),
      errorMessage: errorMessage ?? null,
      active: active ?? true,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(rule);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create product rule" });
  }
});

// GET /admin/product-rules/:id
router.get("/admin/product-rules/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [rule] = await db.select().from(productRulesTable).where(eq(productRulesTable.id, id));
    if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
    res.json(rule);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load rule" });
  }
});

// PUT /admin/product-rules/:id
router.put("/admin/product-rules/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
    const [existing] = await db.select().from(productRulesTable).where(eq(productRulesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Rule not found" }); return; }

    const { name, type, scope, conditionsMet, conditions, actions, errorMessage, active, sortOrder } = req.body as {
      name?: string; type?: string; scope?: string; conditionsMet?: string;
      conditions?: unknown[]; actions?: unknown[]; errorMessage?: string; active?: boolean; sortOrder?: number;
    };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) { if (!name.trim()) { res.status(400).json({ error: "Name cannot be empty" }); return; } update.name = name.trim(); }
    if (type !== undefined) update.type = type;
    if (scope !== undefined) update.scope = scope;
    if (conditionsMet !== undefined) update.conditionsMet = conditionsMet;
    if (conditions !== undefined) update.conditions = JSON.stringify(conditions);
    if (actions !== undefined) update.actions = JSON.stringify(actions);
    if (errorMessage !== undefined) update.errorMessage = errorMessage;
    if (active !== undefined) update.active = active;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const [rule] = await db.update(productRulesTable).set(update).where(eq(productRulesTable.id, id)).returning();
    res.json(rule);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update rule" });
  }
});

// DELETE /admin/product-rules/:id
router.delete("/admin/product-rules/:id", async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid ID" }); return; }
    await db.delete(productRulesTable).where(eq(productRulesTable.id, id));
    res.json({ success: true, id });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete rule" });
  }
});

export default router;
