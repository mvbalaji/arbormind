import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { leadScoringRulesTable, leadScoreMilestonesTable, leadsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { FULL_ACCESS_ROLES } from "../lib/access-control";
import { computeLeadScoreFromRules, recalculateLeadScore } from "../lib/lead-scoring";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = (req.user || (req.session as Record<string, unknown>)?.user) as { role?: string } | undefined;
  if (!u?.role) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!FULL_ACCESS_ROLES.has(u.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const u = (req.user || (req.session as Record<string, unknown>)?.user) as { role?: string } | undefined;
  if (!u?.role) { res.status(401).json({ error: "Unauthorized" }); return; }
  next();
}

/* ── Scoring Rules CRUD ─────────────────────────────────────────────────── */

// GET /api/admin/lead-scoring/rules
router.get("/admin/lead-scoring/rules", requireAdmin, async (req, res) => {
  try {
    const rules = await db.select().from(leadScoringRulesTable).where(eq(leadScoringRulesTable.orgId, req.orgId!)).orderBy(asc(leadScoringRulesTable.sortOrder));
    res.json({ rules });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/lead-scoring/rules
router.post("/admin/lead-scoring/rules", requireAdmin, async (req, res) => {
  try {
    const { ruleType, key, label, description, points, params } = req.body as {
      ruleType: string; key: string; label: string; description?: string | null;
      points: number; params?: Record<string, number> | null;
    };
    if (!ruleType || !key || !label) { res.status(400).json({ error: "ruleType, key, and label are required" }); return; }
    const [rule] = await db.insert(leadScoringRulesTable).values({
      orgId: req.orgId!,
      ruleType, key: key.toLowerCase().replace(/\s+/g, "_"), label,
      description: description ?? null, points: points ?? 0,
      params: params ?? null, sortOrder: 999,
    }).returning();
    res.status(201).json({ rule });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "23505") {
      res.status(409).json({ error: "A rule with that key already exists" }); return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/lead-scoring/rules/:id
router.put("/admin/lead-scoring/rules/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["label", "description", "points", "isActive", "sortOrder"] as const;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) { if (k in req.body) update[k] = req.body[k]; }
    const [rule] = await db.update(leadScoringRulesTable).set(update).where(and(eq(leadScoringRulesTable.id, id), eq(leadScoringRulesTable.orgId, req.orgId!))).returning();
    if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
    res.json({ rule });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/lead-scoring/rules/:id
router.delete("/admin/lead-scoring/rules/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(leadScoringRulesTable).where(and(eq(leadScoringRulesTable.id, id), eq(leadScoringRulesTable.orgId, req.orgId!)));
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Milestones CRUD ────────────────────────────────────────────────────── */

// GET /api/admin/lead-scoring/milestones
router.get("/admin/lead-scoring/milestones", requireAdmin, async (req, res) => {
  try {
    const milestones = await db.select().from(leadScoreMilestonesTable).where(eq(leadScoreMilestonesTable.orgId, req.orgId!)).orderBy(asc(leadScoreMilestonesTable.sortOrder));
    res.json({ milestones });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/admin/lead-scoring/milestones/:id
router.put("/admin/lead-scoring/milestones/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const allowed = ["label", "minScore", "maxScore", "color", "sortOrder"] as const;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) { if (k in req.body) update[k] = req.body[k]; }
    const [milestone] = await db.update(leadScoreMilestonesTable).set(update).where(and(eq(leadScoreMilestonesTable.id, id), eq(leadScoreMilestonesTable.orgId, req.orgId!))).returning();
    if (!milestone) { res.status(404).json({ error: "Milestone not found" }); return; }
    res.json({ milestone });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Bulk recalculate ───────────────────────────────────────────────────── */

// POST /api/admin/lead-scoring/recalculate
router.post("/admin/lead-scoring/recalculate", requireAdmin, async (req, res) => {
  try {
    const leads = await db.select({ id: leadsTable.id }).from(leadsTable).where(eq(leadsTable.orgId, req.orgId!));
    let updated = 0;
    for (const lead of leads) {
      const score = await recalculateLeadScore(lead.id);
      if (score >= 0) updated++;
    }
    res.json({ ok: true, updated });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── Per-lead score breakdown (used by lead detail page) ─────────────────── */

// GET /api/leads/:id/score-breakdown
router.get("/leads/:id/score-breakdown", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [owned] = await db.select({ id: leadsTable.id }).from(leadsTable).where(and(eq(leadsTable.id, id), eq(leadsTable.orgId, req.orgId!)));
    if (!owned) { res.status(404).json({ error: "Lead not found" }); return; }
    const result = await computeLeadScoreFromRules(id);
    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
