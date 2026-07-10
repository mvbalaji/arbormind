import { db } from "@workspace/db";
import {
  approvalCriteriaTable,
  approvalConfigsTable,
  approvalRolesTable,
  approvalRequestsTable,
  approvalAuditEventsTable,
  usersTable,
} from "@workspace/db";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { getEmailSettingsRow, resolveSmtpConfig } from "./smtp-config";

export type ApprovalEntity = "account" | "opportunity" | "quote" | "order";

export interface ActorInfo {
  id: number | null;
  name: string | null;
  email: string | null;
}

type Operator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";

function compare(value: unknown, op: Operator, threshold: unknown): boolean {
  if (op === "contains") {
    return String(value ?? "").toLowerCase().includes(String(threshold ?? "").toLowerCase());
  }
  const a = Number(value);
  const b = Number(threshold);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  switch (op) {
    case "gt": return a > b;
    case "gte": return a >= b;
    case "lt": return a < b;
    case "lte": return a <= b;
    case "eq": return a === b;
    case "neq": return a !== b;
  }
}

// Map legacy / shorthand field names to the canonical snapshot keys.
const FIELD_ALIASES: Record<string, string> = {
  discountpct: "discountPercent",
  discountpercent: "discountPercent",
  discount: "discountPercent",
  marginpct: "marginPercent",
  marginpercent: "marginPercent",
  margin: "marginPercent",
  amount: "amount",
  total: "total",
  probability: "probability",
  creditscore: "creditScore",
};

function canonField(field: string): string {
  return FIELD_ALIASES[field.toLowerCase()] ?? field;
}

function ruleKey(c: { field: string; operator: string; threshold: string | null; thresholdText: string | null }) {
  // Identify a rule by its trigger condition (not by step name) so that
  // multi-level steps that share the same condition group together even
  // if administrators give each level a different display name.
  return [canonField(c.field), c.operator, c.threshold ?? "", c.thresholdText ?? ""].join("|");
}

/** Evaluate a criterion's trigger against a snapshot — used by both the
 *  request creator and the preview endpoint. Exposed so the frontend
 *  warning banner uses the exact same logic via the preview route. */
export function evaluateCriterion(
  c: { field: string; operator: string; threshold: string | null; thresholdText: string | null },
  snapshot: Record<string, number | string | null | undefined>,
): boolean {
  const value = snapshot[canonField(c.field)];
  return compare(value, c.operator as Operator, c.threshold ?? c.thresholdText);
}

/** Resolve emails of users who can act on this role: admins + managers + role-name matches. */
async function resolveApproverEmails(roleId: number | null): Promise<{ emails: string[]; roleName: string | null }> {
  let roleName: string | null = null;
  if (roleId != null) {
    const [r] = await db.select().from(approvalRolesTable).where(eq(approvalRolesTable.id, roleId));
    roleName = r?.name ?? null;
  }
  // Always include admins + managers as a safety net; add anyone whose user.role
  // matches the role name (case-insensitive, supports "Sales_Manager" → "sales").
  const orClauses = [
    eq(usersTable.role, "admin"),
    eq(usersTable.role, "manager"),
  ];
  if (roleName) {
    const lowered = roleName.toLowerCase();
    orClauses.push(sql`lower(${usersTable.role}) = ${lowered}`);
    // also match by prefix word (Sales_Manager → user.role 'sales' or 'manager')
    if (lowered.includes("manager")) orClauses.push(eq(usersTable.role, "manager"));
  }
  const rows = await db
    .select({ email: usersTable.email, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(or(...orClauses));
  const emails = Array.from(new Set(rows.map(r => r.email).filter((e): e is string => !!e)));
  return { emails, roleName };
}

interface EntitySummary {
  entity: ApprovalEntity;
  entityId: number;
  title: string;            // e.g. "Opportunity #42 — Acme Renewal"
  details: Array<[string, string]>; // rows shown in email
}

async function sendApprovalEmail(opts: {
  to: string[];
  summary: EntitySummary;
  ruleName: string;
  level: number;
  isMultiLevelNext: boolean;
  actor: ActorInfo;
  appUrl?: string;
}) {
  if (opts.to.length === 0) return { sent: false, reason: "no recipients" };
  const emailSettings = await getEmailSettingsRow();
  const smtp = resolveSmtpConfig(emailSettings, { defaultFromName: "arbormind.in" });
  if (!smtp) return { sent: false, reason: "smtp not configured" };
  const transporter = nodemailer.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  const subject = `${opts.isMultiLevelNext ? "Next-level " : ""}Approval needed — ${opts.summary.title} (L${opts.level})`;
  const detailRows = opts.summary.details
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee;">${k}</td><td style="padding:6px 10px;font-weight:600;border-bottom:1px solid #eee;">${v}</td></tr>`)
    .join("");
  const actorLine = opts.actor.name || opts.actor.email
    ? `<p style="margin:0 0 8px;color:#444;">Requested by <strong>${opts.actor.name ?? opts.actor.email}</strong>.</p>`
    : "";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;color:#222;">
      <h2 style="margin:0 0 8px;">Approval required — Level ${opts.level}</h2>
      <p style="margin:0 0 12px;color:#444;">Rule: <strong>${opts.ruleName}</strong></p>
      ${actorLine}
      <table style="width:100%;border-collapse:collapse;margin:12px 0;">${detailRows}</table>
      <p style="margin:16px 0 0;color:#444;">Open the CRM and go to the Approvals tab on the ${opts.summary.entity} to approve or reject this request.</p>
      <p style="color:#888;font-size:12px;margin-top:24px;">— arbormind.in CRM</p>
    </div>`;
  try {
    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.user}>`,
      to: opts.to.join(","),
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: (err as Error).message };
  }
}

async function loadEntitySummary(entity: ApprovalEntity, entityId: number, snapshot: Record<string, number | string | null | undefined>): Promise<EntitySummary> {
  const fmt = (n: unknown) => Number.isFinite(Number(n)) ? `£${Number(n).toFixed(2)}` : "—";
  const pct = (n: unknown) => Number.isFinite(Number(n)) ? `${Number(n).toFixed(2)}%` : "—";
  const details: Array<[string, string]> = [];
  if (snapshot.discountPercent != null) details.push(["Discount", pct(snapshot.discountPercent)]);
  if (snapshot.amount != null) details.push(["Amount", fmt(snapshot.amount)]);
  if (snapshot.total != null) details.push(["Total", fmt(snapshot.total)]);
  if (snapshot.marginPercent != null) details.push(["Margin", pct(snapshot.marginPercent)]);
  if (snapshot.probability != null) details.push(["Probability", pct(snapshot.probability)]);
  const title = typeof snapshot.title === "string" && snapshot.title
    ? snapshot.title
    : `${entity[0].toUpperCase()}${entity.slice(1)} #${entityId}`;
  return { entity, entityId, title, details };
}

/**
 * Evaluate all active criteria for the given entity against `snapshot` and,
 * for each matching rule (grouped by ruleKey), create one open approval
 * request at the lowest unsatisfied level. Idempotent: if an open request
 * already exists for the same (entity, entityId, ruleKey) it is skipped.
 */
export async function evaluateApprovalsForEntity(
  entity: ApprovalEntity,
  entityId: number,
  snapshot: Record<string, number | string | null | undefined>,
  actor: ActorInfo,
  log?: { error: (...args: any[]) => void; info?: (...args: any[]) => void },
): Promise<{ created: number; emailed: number }> {
  try {
    const [config] = await db.select().from(approvalConfigsTable).where(eq(approvalConfigsTable.entity, entity));
    if (config && config.enabled === false) return { created: 0, emailed: 0 };

    const criteria = await db.select().from(approvalCriteriaTable)
      .where(and(eq(approvalCriteriaTable.entity, entity), eq(approvalCriteriaTable.active, true)));
    if (criteria.length === 0) return { created: 0, emailed: 0 };

    // Group by ruleKey
    const groups = new Map<string, typeof criteria>();
    for (const c of criteria) {
      const key = ruleKey(c);
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }

    // Pre-load open requests for this entity record (to skip already-pending rules)
    const existingOpen = await db.select({ ruleKey: approvalRequestsTable.ruleKey, level: approvalRequestsTable.level })
      .from(approvalRequestsTable)
      .where(and(
        eq(approvalRequestsTable.entity, entity),
        eq(approvalRequestsTable.entityId, entityId),
        eq(approvalRequestsTable.status, "open"),
      ));
    const openByRule = new Set(existingOpen.map(r => r.ruleKey).filter(Boolean) as string[]);

    let created = 0, emailed = 0;
    for (const [key, steps] of groups) {
      if (openByRule.has(key)) continue;
      const first = steps[0];
      const matched = evaluateCriterion(first, snapshot);
      if (!matched) continue;
      // Find the lowest level
      const sorted = [...steps].sort((a, b) => a.level - b.level);
      const stepToOpen = sorted[0];

      const [reqRow] = await db.insert(approvalRequestsTable).values({
        entity,
        entityId,
        status: "open",
        level: stepToOpen.level,
        roleId: stepToOpen.roleId ?? null,
        criterionId: stepToOpen.id,
        ruleKey: key,
        requestedBy: actor.id,
        comment: `Auto-created by rule "${stepToOpen.name}"`,
      }).returning();
      await db.insert(approvalAuditEventsTable).values({
        requestId: reqRow.id,
        event: "submitted",
        actorUserId: actor.id,
        actorName: actor.name ?? actor.email,
        comment: `Triggered by rule "${stepToOpen.name}" (L${stepToOpen.level})`,
      });
      created++;

      const summary = await loadEntitySummary(entity, entityId, snapshot);
      const { emails } = await resolveApproverEmails(stepToOpen.roleId ?? null);
      const result = await sendApprovalEmail({
        to: emails,
        summary,
        ruleName: stepToOpen.name,
        level: stepToOpen.level,
        isMultiLevelNext: false,
        actor,
      });
      if (result.sent) emailed++;
    }
    return { created, emailed };
  } catch (err) {
    log?.error?.({ err }, "evaluateApprovalsForEntity failed");
    return { created: 0, emailed: 0 };
  }
}

/**
 * After an approval is granted, if the source rule has more levels AND the
 * entity's config has multiLevel enabled, create the next-level request.
 */
export async function advanceMultiLevelApproval(
  approvedRequestId: number,
  actor: ActorInfo,
  log?: { error: (...args: any[]) => void; info?: (...args: any[]) => void },
): Promise<{ advanced: boolean; nextRequestId?: number }> {
  try {
    const [req] = await db.select().from(approvalRequestsTable).where(eq(approvalRequestsTable.id, approvedRequestId));
    if (!req) return { advanced: false };
    if (req.status !== "approved") return { advanced: false };
    if (!req.ruleKey) return { advanced: false };

    const [config] = await db.select().from(approvalConfigsTable).where(eq(approvalConfigsTable.entity, req.entity));
    if (!config?.multiLevel) return { advanced: false };

    // Find all active criteria for this rule signature
    const criteria = await db.select().from(approvalCriteriaTable)
      .where(and(eq(approvalCriteriaTable.entity, req.entity), eq(approvalCriteriaTable.active, true)));
    const sameRule = criteria.filter(c => ruleKey(c) === req.ruleKey).sort((a, b) => a.level - b.level);
    const next = sameRule.find(c => c.level > req.level);
    if (!next) return { advanced: false };

    // Skip if a request for this rule at next level is already open
    const [existing] = await db.select().from(approvalRequestsTable).where(and(
      eq(approvalRequestsTable.entity, req.entity),
      eq(approvalRequestsTable.entityId, req.entityId),
      eq(approvalRequestsTable.ruleKey, req.ruleKey),
      eq(approvalRequestsTable.status, "open"),
    ));
    if (existing) return { advanced: false };

    const [created] = await db.insert(approvalRequestsTable).values({
      entity: req.entity,
      entityId: req.entityId,
      status: "open",
      level: next.level,
      roleId: next.roleId ?? null,
      criterionId: next.id,
      ruleKey: req.ruleKey,
      requestedBy: actor.id,
      comment: `Escalated from L${req.level} approval`,
    }).returning();
    await db.insert(approvalAuditEventsTable).values({
      requestId: created.id,
      event: "submitted",
      actorUserId: actor.id,
      actorName: actor.name ?? actor.email,
      comment: `Auto-escalated to L${next.level} after L${req.level} approval`,
    });

    const summary = await loadEntitySummary(req.entity as ApprovalEntity, req.entityId, {
      title: `${req.entity[0].toUpperCase()}${req.entity.slice(1)} #${req.entityId}`,
    });
    const { emails } = await resolveApproverEmails(next.roleId ?? null);
    await sendApprovalEmail({
      to: emails,
      summary,
      ruleName: next.name,
      level: next.level,
      isMultiLevelNext: true,
      actor,
    });

    return { advanced: true, nextRequestId: created.id };
  } catch (err) {
    log?.error?.({ err }, "advanceMultiLevelApproval failed");
    return { advanced: false };
  }
}
