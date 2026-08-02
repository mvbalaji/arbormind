/**
 * Public inbound webhook receiver for the Integration Framework.
 *
 * POST /api/integrations/webhooks/:slug/:entityType
 *
 * Body must be signed with the partner's webhook secret:
 *   X-Integration-Signature: sha256=<hmac-sha256 of the raw JSON body, hex>
 *
 * The payload is mapped to a CRM entity using the partner's active mapping
 * template for that entity type (configured via /api/admin/integrations),
 * then created/updated in the CRM. Every call is recorded in
 * integration_run_log regardless of outcome.
 */
import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { pool } from "@workspace/db";
import { decryptSecret, verifyHmacSignature } from "../lib/integration-crypto";
import { runMappingPipeline, type MappingTemplateDefinition } from "../lib/integration-mapping-engine";
import { getEntityType } from "../lib/integration-entities";

const router: IRouter = Router();

async function logRun(params: {
  orgId: number;
  partnerId: number | null;
  templateId: number | null;
  entityType: string;
  status: "success" | "validation_error" | "error";
  requestPayload: unknown;
  mappedOutput?: unknown;
  errors?: unknown;
  crmEntityId?: number | null;
  durationMs: number;
  correlationId: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO integration_run_log
       (partner_id, template_id, entity_type, status, request_payload, mapped_output, errors, crm_entity_id, duration_ms, correlation_id, org_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      params.partnerId, params.templateId, params.entityType, params.status,
      JSON.stringify(params.requestPayload ?? null), JSON.stringify(params.mappedOutput ?? null), JSON.stringify(params.errors ?? null),
      params.crmEntityId ?? null, params.durationMs, params.correlationId, params.orgId,
    ],
  );
}

router.post("/integrations/webhooks/:slug/:entityType", async (req, res) => {
  const started = Date.now();
  const correlationId = (req.headers["x-correlation-id"] as string) || crypto.randomUUID();
  const { slug, entityType } = req.params;

  const entityDescriptor = getEntityType(entityType);
  if (!entityDescriptor) {
    res.status(400).json({ error: `Unknown entity type: ${entityType}` });
    return;
  }

  let partner: { id: number; webhook_secret_encrypted: string; is_active: boolean; org_id: number } | undefined;
  try {
    const r = await pool.query(
      `SELECT id, webhook_secret_encrypted, is_active, org_id FROM integration_partners WHERE slug=$1`,
      [slug],
    );
    partner = r.rows[0];
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (!partner || !partner.is_active) {
    res.status(404).json({ error: "Unknown or inactive partner" });
    return;
  }

  let secret: string;
  try {
    secret = decryptSecret(partner.webhook_secret_encrypted);
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  const signature = req.headers["x-integration-signature"] as string | undefined;
  if (!verifyHmacSignature(JSON.stringify(req.body), signature, secret)) {
    await logRun({
      orgId: partner.org_id, partnerId: partner.id, templateId: null, entityType, status: "error",
      requestPayload: req.body, errors: [{ message: "Invalid or missing signature" }],
      durationMs: Date.now() - started, correlationId,
    });
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let templateRow: { id: number; definition: MappingTemplateDefinition } | undefined;
  try {
    const r = await pool.query(
      `SELECT id, definition FROM integration_mapping_templates
       WHERE partner_id=$1 AND entity_type=$2 AND status='active'
       ORDER BY version DESC LIMIT 1`,
      [partner.id, entityType],
    );
    templateRow = r.rows[0];
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  if (!templateRow) {
    await logRun({
      orgId: partner.org_id, partnerId: partner.id, templateId: null, entityType, status: "error",
      requestPayload: req.body, errors: [{ message: `No active mapping template for entity type ${entityType}` }],
      durationMs: Date.now() - started, correlationId,
    });
    res.status(409).json({ error: `No active mapping template configured for ${entityType}` });
    return;
  }

  const result = runMappingPipeline(req.body as Record<string, unknown>, templateRow.definition);

  if (!result.valid) {
    await logRun({
      orgId: partner.org_id, partnerId: partner.id, templateId: templateRow.id, entityType, status: "validation_error",
      requestPayload: req.body, mappedOutput: result.output, errors: result.errors,
      durationMs: Date.now() - started, correlationId,
    });
    res.status(422).json({ error: "Validation failed", errors: result.errors });
    return;
  }

  try {
    const { id, created } = await entityDescriptor.upsert(result.output, partner.org_id);
    await logRun({
      orgId: partner.org_id, partnerId: partner.id, templateId: templateRow.id, entityType, status: "success",
      requestPayload: req.body, mappedOutput: result.output, crmEntityId: id,
      durationMs: Date.now() - started, correlationId,
    });
    res.status(created ? 201 : 200).json({ ok: true, entityType, entityId: id, created, correlationId });
  } catch (err) {
    req.log?.error(err);
    await logRun({
      orgId: partner.org_id, partnerId: partner.id, templateId: templateRow.id, entityType, status: "error",
      requestPayload: req.body, mappedOutput: result.output,
      errors: [{ message: (err as Error).message }],
      durationMs: Date.now() - started, correlationId,
    });
    res.status(500).json({ error: "Failed to save CRM record" });
  }
});

export default router;
