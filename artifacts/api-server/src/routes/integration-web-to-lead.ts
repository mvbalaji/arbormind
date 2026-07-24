/**
 * Public, unauthenticated Web-to-Lead endpoint — the classic "embed a plain
 * HTML <form> on any marketing site" pattern (à la Salesforce Web-to-Lead).
 *
 * Unlike routes/integration-webhooks.ts, a browser cannot safely hold an HMAC
 * secret, so this endpoint takes no signature. It is intentionally narrow to
 * limit blast radius:
 *   - lead creation only (never other entity types)
 *   - partner must explicitly opt in via allow_public_form
 *   - per-IP rate limiting
 *   - a hidden honeypot field silently discards obvious bot submissions
 *
 * POST /api/integrations/web-to-lead/:slug
 * Body: application/x-www-form-urlencoded or JSON. Optional `retURL` field —
 * if present, the browser is redirected there after submission (with the
 * visitor's own JS never seeing the response), matching plain <form> posts.
 */
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { runMappingPipeline, type MappingTemplateDefinition } from "../lib/integration-mapping-engine";
import { getEntityType } from "../lib/integration-entities";

const router: IRouter = Router();

const HONEYPOT_FIELD = "hp_website";
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour per IP
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

function isSafeRedirectUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

async function logRun(params: {
  partnerId: number | null;
  templateId: number | null;
  status: "success" | "validation_error" | "error";
  requestPayload: unknown;
  mappedOutput?: unknown;
  errors?: unknown;
  crmEntityId?: number | null;
  durationMs: number;
}): Promise<void> {
  await pool.query(
    `INSERT INTO integration_run_log
       (partner_id, template_id, entity_type, status, request_payload, mapped_output, errors, crm_entity_id, duration_ms, correlation_id)
     VALUES ($1,$2,'lead',$3,$4,$5,$6,$7,$8,$9)`,
    [
      params.partnerId, params.templateId, params.status,
      JSON.stringify(params.requestPayload ?? null), JSON.stringify(params.mappedOutput ?? null), JSON.stringify(params.errors ?? null),
      params.crmEntityId ?? null, params.durationMs, "web-to-lead",
    ],
  );
}

router.post("/integrations/web-to-lead/:slug", async (req, res) => {
  const started = Date.now();
  const { slug } = req.params;
  const body = (req.body ?? {}) as Record<string, unknown>;
  const retURL = typeof body.retURL === "string" && isSafeRedirectUrl(body.retURL) ? body.retURL : null;

  function respondSuccess() {
    if (retURL) { res.redirect(302, retURL); return; }
    res.status(200).json({ ok: true });
  }
  function respondFailure(status: number, error: string, errors?: unknown) {
    if (retURL) { res.redirect(302, `${retURL}${retURL.includes("?") ? "&" : "?"}error=1`); return; }
    res.status(status).json({ error, errors });
  }

  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (isRateLimited(ip)) {
    respondFailure(429, "Too many submissions — please try again later.");
    return;
  }

  const entityDescriptor = getEntityType("lead");
  if (!entityDescriptor) {
    respondFailure(500, "Internal server error");
    return;
  }

  let partner: { id: number; is_active: boolean; allow_public_form: boolean } | undefined;
  try {
    const r = await pool.query(
      `SELECT id, is_active, allow_public_form FROM integration_partners WHERE slug=$1`,
      [slug],
    );
    partner = r.rows[0];
  } catch (err) {
    req.log?.error(err);
    respondFailure(500, "Internal server error");
    return;
  }

  if (!partner || !partner.is_active || !partner.allow_public_form) {
    respondFailure(404, "Unknown form");
    return;
  }

  // Honeypot: real visitors never fill this hidden field. Pretend success so bots don't learn.
  if (typeof body[HONEYPOT_FIELD] === "string" && body[HONEYPOT_FIELD].trim() !== "") {
    await logRun({
      partnerId: partner.id, templateId: null, status: "error",
      requestPayload: body, errors: [{ message: "Honeypot field filled — likely spam" }],
      durationMs: Date.now() - started,
    });
    respondSuccess();
    return;
  }

  let templateRow: { id: number; definition: MappingTemplateDefinition } | undefined;
  try {
    const r = await pool.query(
      `SELECT id, definition FROM integration_mapping_templates
       WHERE partner_id=$1 AND entity_type='lead' AND status='active'
       ORDER BY version DESC LIMIT 1`,
      [partner.id],
    );
    templateRow = r.rows[0];
  } catch (err) {
    req.log?.error(err);
    respondFailure(500, "Internal server error");
    return;
  }

  if (!templateRow) {
    await logRun({
      partnerId: partner.id, templateId: null, status: "error",
      requestPayload: body, errors: [{ message: "No active lead mapping template configured" }],
      durationMs: Date.now() - started,
    });
    respondFailure(409, "This form is not fully configured yet.");
    return;
  }

  const result = runMappingPipeline(body, templateRow.definition);

  if (!result.valid) {
    await logRun({
      partnerId: partner.id, templateId: templateRow.id, status: "validation_error",
      requestPayload: body, mappedOutput: result.output, errors: result.errors,
      durationMs: Date.now() - started,
    });
    respondFailure(422, "Please check the form and try again.", result.errors);
    return;
  }

  try {
    const { id } = await entityDescriptor.upsert(result.output);
    await logRun({
      partnerId: partner.id, templateId: templateRow.id, status: "success",
      requestPayload: body, mappedOutput: result.output, crmEntityId: id,
      durationMs: Date.now() - started,
    });
    respondSuccess();
  } catch (err) {
    req.log?.error(err);
    await logRun({
      partnerId: partner.id, templateId: templateRow.id, status: "error",
      requestPayload: body, mappedOutput: result.output,
      errors: [{ message: (err as Error).message }],
      durationMs: Date.now() - started,
    });
    respondFailure(500, "Failed to save your submission.");
  }
});

export default router;
