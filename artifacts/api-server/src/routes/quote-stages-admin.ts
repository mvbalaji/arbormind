import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const DEFAULT_SYSTEM_STAGES = [
  { stageId: "draft", label: "Draft", description: "Initial draft, not yet submitted", position: 10 },
  { stageId: "needs_review", label: "Needs Review", description: "Submitted for internal review", position: 20 },
  { stageId: "in_review", label: "In Review", description: "Being reviewed by manager", position: 30 },
  { stageId: "approved", label: "Approved", description: "Internally approved", position: 40 },
  { stageId: "presented", label: "Presented", description: "Sent to customer", position: 50 },
  { stageId: "accepted", label: "Accepted", description: "Customer accepted", position: 60 },
  { stageId: "rejected", label: "Rejected", description: "Customer rejected", position: 70 },
];

// New orgs (created after the initial boot-time seed) start with no rows —
// bootstrap the standard pipeline on first access, same lazy-seed convention
// used by lib/pricing.ts's getStandardPriceBook().
async function ensureDefaultStages(orgId: number): Promise<void> {
  const existing = await db.execute(sql`SELECT 1 FROM quote_stage_config WHERE org_id = ${orgId} LIMIT 1`);
  if (existing.rows.length) return;
  for (const s of DEFAULT_SYSTEM_STAGES) {
    await db.execute(sql`
      INSERT INTO quote_stage_config (stage_id, label, description, position, is_active, is_system, org_id)
      VALUES (${s.stageId}, ${s.label}, ${s.description}, ${s.position}, TRUE, TRUE, ${orgId})
      ON CONFLICT (org_id, stage_id) DO NOTHING
    `);
  }
}

function requireAdmin(req: any, res: any): boolean {
  const user = req.session?.user ?? req.user ?? null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden — Admin only" }); return false;
  }
  return true;
}

// GET all stages (public — needed by frontend to build pipeline)
router.get("/admin/quote-stages", async (req, res) => {
  try {
    await ensureDefaultStages(req.orgId!);
    const rows = await db.execute(sql`
      SELECT id, stage_id, label, description, position, is_active, is_system
      FROM quote_stage_config
      WHERE org_id = ${req.orgId!}
      ORDER BY position ASC
    `);
    res.json({ data: rows.rows });
  } catch (err) {
    console.error("[QuoteStages] GET:", err);
    res.status(500).json({ error: "Failed to fetch stages" });
  }
});

// POST — add new stage (admin only)
router.post("/admin/quote-stages", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { stageId, label, description } = req.body as { stageId: string; label: string; description?: string };
    if (!stageId || !label) return res.status(400).json({ error: "stageId and label are required" });
    // Normalise: lowercase, underscores only
    const normalised = stageId.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    // Get max position
    const maxRes = await db.execute(sql`SELECT COALESCE(MAX(position), 0) AS max FROM quote_stage_config WHERE org_id = ${req.orgId!}`);
    const maxPos = Number((maxRes.rows[0] as any).max) + 10;
    const [row] = (await db.execute(sql`
      INSERT INTO quote_stage_config (stage_id, label, description, position, is_active, is_system, org_id)
      VALUES (${normalised}, ${label.trim()}, ${description?.trim() ?? ""}, ${maxPos}, TRUE, FALSE, ${req.orgId!})
      RETURNING *
    `)).rows;
    res.status(201).json({ data: row });
  } catch (err: any) {
    if (err?.message?.includes("unique") || err?.message?.includes("duplicate")) {
      return res.status(409).json({ error: "A stage with that ID already exists" });
    }
    console.error("[QuoteStages] POST:", err);
    res.status(500).json({ error: "Failed to create stage" });
  }
});

// PUT — update label / description / active / position
router.put("/admin/quote-stages/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    const { label, description, isActive, position } = req.body as {
      label?: string; description?: string; isActive?: boolean; position?: number;
    };
    const [row] = (await db.execute(sql`
      UPDATE quote_stage_config SET
        label       = COALESCE(${label ?? null}, label),
        description = COALESCE(${description ?? null}, description),
        is_active   = COALESCE(${isActive ?? null}, is_active),
        position    = COALESCE(${position ?? null}, position),
        updated_at  = NOW()
      WHERE id = ${id} AND org_id = ${req.orgId!}
      RETURNING *
    `)).rows;
    if (!row) return res.status(404).json({ error: "Stage not found" });
    res.json({ data: row });
  } catch (err) {
    console.error("[QuoteStages] PUT:", err);
    res.status(500).json({ error: "Failed to update stage" });
  }
});

// DELETE — only non-system stages
router.delete("/admin/quote-stages/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    const [existing] = (await db.execute(sql`SELECT is_system FROM quote_stage_config WHERE id = ${id} AND org_id = ${req.orgId!}`)).rows as any[];
    if (!existing) return res.status(404).json({ error: "Stage not found" });
    if (existing.is_system) return res.status(400).json({ error: "System stages cannot be deleted" });
    await db.execute(sql`DELETE FROM quote_stage_config WHERE id = ${id} AND org_id = ${req.orgId!}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[QuoteStages] DELETE:", err);
    res.status(500).json({ error: "Failed to delete stage" });
  }
});

// POST /reorder — bulk update positions
router.post("/admin/quote-stages/reorder", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { order } = req.body as { order: number[] }; // array of ids in new position order
    if (!Array.isArray(order)) return res.status(400).json({ error: "order array required" });
    for (let i = 0; i < order.length; i++) {
      await db.execute(sql`UPDATE quote_stage_config SET position = ${(i + 1) * 10} WHERE id = ${order[i]} AND org_id = ${req.orgId!}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error("[QuoteStages] reorder:", err);
    res.status(500).json({ error: "Failed to reorder stages" });
  }
});

export default router;
