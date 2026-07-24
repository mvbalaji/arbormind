/**
 * Admin API for the Integration Framework: partner profiles and versioned
 * mapping templates. Configuration changes here take effect immediately for
 * the public webhook receiver (routes/integration-webhooks.ts) — no
 * deployment required to add a partner or change a mapping.
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";
import { FULL_ACCESS_ROLES } from "../lib/access-control";
import { encryptSecret, generateWebhookSecret } from "../lib/integration-crypto";
import { runMappingPipeline, type MappingTemplateDefinition } from "../lib/integration-mapping-engine";
import { ENTITY_TYPES } from "../lib/integration-entities";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!process.env.GOOGLE_CLIENT_ID) { next(); return; }
  const u = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
  if (!u?.role) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!FULL_ACCESS_ROLES.has(u.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

function currentActor(req: Request): { id: number | null; name: string } {
  const u = (req.user || (req.session as any)?.user) as { id?: number; name?: string } | undefined;
  return { id: u?.id ?? null, name: u?.name ?? "System" };
}

async function writeAudit(
  actor: { id: number | null; name: string },
  action: string,
  resourceType: string,
  resourceId: string | number,
  beforeState: unknown,
  afterState: unknown,
): Promise<void> {
  await pool.query(
    `INSERT INTO integration_audit_log (actor_id, actor_name, action, resource_type, resource_id, before_state, after_state)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [actor.id, actor.name, action, resourceType, String(resourceId), JSON.stringify(beforeState ?? null), JSON.stringify(afterState ?? null)],
  );
}

router.use("/admin/integrations", requireAdmin);

// ─── Entity type registry (for mapping editor dropdowns) ────────────────────

router.get("/admin/integrations/entity-types", (_req, res) => {
  const entityTypes = Object.values(ENTITY_TYPES).map((e) => ({
    key: e.key, label: e.label, dedupeField: e.dedupeField, fields: e.fields,
  }));
  res.json({ entityTypes });
});

// ─── Partners ─────────────────────────────────────────────────────────────

router.get("/admin/integrations/partners", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, name, slug, description, is_active, allow_public_form, created_at, updated_at FROM integration_partners ORDER BY created_at DESC`,
    );
    res.json({ partners: r.rows });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load partners" });
  }
});

router.post("/admin/integrations/partners", async (req, res) => {
  const { name, slug, description } = req.body as { name?: string; slug?: string; description?: string };
  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens only" });
    return;
  }
  try {
    const plaintextSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plaintextSecret);
    const actor = currentActor(req);
    const r = await pool.query(
      `INSERT INTO integration_partners (name, slug, description, webhook_secret_encrypted, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, slug, description, is_active, allow_public_form, created_at, updated_at`,
      [name, slug, description ?? "", encrypted, actor.id],
    );
    const partner = r.rows[0];
    await writeAudit(actor, "CREATE", "partner", partner.id, null, partner);
    res.status(201).json({ partner, webhookSecret: plaintextSecret });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A partner with that slug already exists" });
      return;
    }
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create partner" });
  }
});

router.patch("/admin/integrations/partners/:id", async (req, res) => {
  const { name, description, isActive, allowPublicForm } = req.body as {
    name?: string; description?: string; isActive?: boolean; allowPublicForm?: boolean;
  };
  try {
    const [before] = (await pool.query(`SELECT * FROM integration_partners WHERE id=$1`, [req.params.id])).rows;
    if (!before) { res.status(404).json({ error: "Partner not found" }); return; }

    const r = await pool.query(
      `UPDATE integration_partners SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         is_active = COALESCE($3, is_active),
         allow_public_form = COALESCE($4, allow_public_form),
         updated_at = NOW()
       WHERE id=$5
       RETURNING id, name, slug, description, is_active, allow_public_form, created_at, updated_at`,
      [name ?? null, description ?? null, isActive ?? null, allowPublicForm ?? null, req.params.id],
    );
    const partner = r.rows[0];
    await writeAudit(currentActor(req), "UPDATE", "partner", partner.id, before, partner);
    res.json({ partner });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update partner" });
  }
});

router.post("/admin/integrations/partners/:id/rotate-secret", async (req, res) => {
  try {
    const [existing] = (await pool.query(`SELECT id FROM integration_partners WHERE id=$1`, [req.params.id])).rows;
    if (!existing) { res.status(404).json({ error: "Partner not found" }); return; }
    const plaintextSecret = generateWebhookSecret();
    const encrypted = encryptSecret(plaintextSecret);
    await pool.query(`UPDATE integration_partners SET webhook_secret_encrypted=$1, updated_at=NOW() WHERE id=$2`, [encrypted, req.params.id]);
    await writeAudit(currentActor(req), "UPDATE", "partner_credential", req.params.id, null, null);
    res.json({ webhookSecret: plaintextSecret });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to rotate secret" });
  }
});

router.delete("/admin/integrations/partners/:id", async (req, res) => {
  try {
    const [before] = (await pool.query(`SELECT * FROM integration_partners WHERE id=$1`, [req.params.id])).rows;
    if (!before) { res.status(404).json({ error: "Partner not found" }); return; }
    await pool.query(`DELETE FROM integration_partners WHERE id=$1`, [req.params.id]);
    await writeAudit(currentActor(req), "DELETE", "partner", req.params.id, before, null);
    res.json({ ok: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete partner" });
  }
});

// ─── Mapping templates ────────────────────────────────────────────────────

router.get("/admin/integrations/partners/:id/templates", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, partner_id, entity_type, version, status, definition, created_by, created_at, activated_at
       FROM integration_mapping_templates WHERE partner_id=$1 ORDER BY entity_type, version DESC`,
      [req.params.id],
    );
    res.json({ templates: r.rows });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

router.post("/admin/integrations/partners/:id/templates", async (req, res) => {
  const { entityType, definition } = req.body as { entityType?: string; definition?: MappingTemplateDefinition };
  if (!entityType || !ENTITY_TYPES[entityType]) {
    res.status(400).json({ error: "A valid entityType is required" });
    return;
  }
  if (!definition || !Array.isArray(definition.fields)) {
    res.status(400).json({ error: "definition.fields is required" });
    return;
  }
  try {
    const nextVersionRow = (await pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM integration_mapping_templates WHERE partner_id=$1 AND entity_type=$2`,
      [req.params.id, entityType],
    )).rows[0];
    const actor = currentActor(req);
    const r = await pool.query(
      `INSERT INTO integration_mapping_templates (partner_id, entity_type, version, status, definition, created_by)
       VALUES ($1,$2,$3,'draft',$4,$5)
       RETURNING id, partner_id, entity_type, version, status, definition, created_by, created_at, activated_at`,
      [req.params.id, entityType, nextVersionRow.next_version, JSON.stringify(definition), actor.id],
    );
    const template = r.rows[0];
    await writeAudit(actor, "CREATE", "mapping_template", template.id, null, template);
    res.status(201).json({ template });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create mapping template" });
  }
});

router.get("/admin/integrations/templates/:id", async (req, res) => {
  try {
    const [template] = (await pool.query(
      `SELECT id, partner_id, entity_type, version, status, definition, created_by, created_at, activated_at
       FROM integration_mapping_templates WHERE id=$1`,
      [req.params.id],
    )).rows;
    if (!template) { res.status(404).json({ error: "Template not found" }); return; }
    res.json({ template });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load template" });
  }
});

router.post("/admin/integrations/templates/:id/activate", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const [template] = (await client.query(`SELECT * FROM integration_mapping_templates WHERE id=$1 FOR UPDATE`, [req.params.id])).rows;
    if (!template) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const [previouslyActive] = (await client.query(
      `SELECT id FROM integration_mapping_templates WHERE partner_id=$1 AND entity_type=$2 AND status='active'`,
      [template.partner_id, template.entity_type],
    )).rows;
    if (previouslyActive) {
      await client.query(`UPDATE integration_mapping_templates SET status='archived' WHERE id=$1`, [previouslyActive.id]);
    }
    const r = await client.query(
      `UPDATE integration_mapping_templates SET status='active', activated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id],
    );
    await client.query("COMMIT");
    const activated = r.rows[0];
    await writeAudit(currentActor(req), "PROMOTE", "mapping_template", activated.id, { previouslyActiveId: previouslyActive?.id ?? null }, activated);
    res.json({ template: activated });
  } catch (err) {
    await client.query("ROLLBACK");
    req.log?.error(err);
    res.status(500).json({ error: "Failed to activate template" });
  } finally {
    client.release();
  }
});

router.post("/admin/integrations/templates/:id/test", async (req, res) => {
  const { samplePayload } = req.body as { samplePayload?: Record<string, unknown> };
  if (!samplePayload || typeof samplePayload !== "object") {
    res.status(400).json({ error: "samplePayload (object) is required" });
    return;
  }
  try {
    const [template] = (await pool.query(`SELECT definition FROM integration_mapping_templates WHERE id=$1`, [req.params.id])).rows;
    if (!template) { res.status(404).json({ error: "Template not found" }); return; }
    const result = runMappingPipeline(samplePayload, template.definition as MappingTemplateDefinition);
    res.json(result);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Test run failed" });
  }
});

// ─── Run log & audit log ──────────────────────────────────────────────────

router.get("/admin/integrations/runs", async (req, res) => {
  const { partnerId, limit = "50", offset = "0" } = req.query as Record<string, string>;
  try {
    const params: unknown[] = [];
    let where = "";
    if (partnerId) { params.push(partnerId); where = `WHERE r.partner_id = $${params.length}`; }
    params.push(Number(limit) || 50, Number(offset) || 0);
    const r = await pool.query(
      `SELECT r.id, r.partner_id, p.name AS partner_name, r.template_id, r.entity_type, r.status,
              r.mapped_output, r.errors, r.crm_entity_id, r.duration_ms, r.correlation_id, r.created_at
       FROM integration_run_log r
       LEFT JOIN integration_partners p ON p.id = r.partner_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json({ runs: r.rows });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load run log" });
  }
});

router.get("/admin/integrations/audit", async (req, res) => {
  const { limit = "50", offset = "0" } = req.query as Record<string, string>;
  try {
    const r = await pool.query(
      `SELECT id, actor_id, actor_name, action, resource_type, resource_id, before_state, after_state, created_at
       FROM integration_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [Number(limit) || 50, Number(offset) || 0],
    );
    res.json({ entries: r.rows });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;
