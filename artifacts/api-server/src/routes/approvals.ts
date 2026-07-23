import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  approvalRolesTable,
  approvalConfigsTable,
  approvalCriteriaTable,
  approvalRequestsTable,
  approvalAuditEventsTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { advanceMultiLevelApproval, evaluateCriterion } from "../lib/approvals-engine";

const router: IRouter = Router();

const ENTITIES = ["account", "opportunity", "quote", "order"] as const;
type Entity = (typeof ENTITIES)[number];
const isEntity = (s: unknown): s is Entity => typeof s === "string" && (ENTITIES as readonly string[]).includes(s);

const OPERATORS = ["gt", "gte", "lt", "lte", "eq", "neq", "contains"] as const;
const isOperator = (s: unknown): s is (typeof OPERATORS)[number] =>
  typeof s === "string" && (OPERATORS as readonly string[]).includes(s);

function getSessionUser(req: any) {
  if (req.session?.user) return req.session.user;
  if (req.user) return req.user;
  // Dev fallback: when no Google OAuth is configured, treat all requests as admin
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return { id: null, email: "dev@crmai.local", name: "Dev Admin", role: "admin", orgId: 1 };
  }
  return null;
}

function requireAuth(req: any, res: any): boolean {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

function requireAdmin(req: any, res: any): boolean {
  const user = getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return false; }
  if (user.role !== "admin") { res.status(403).json({ error: "Forbidden — Admin only" }); return false; }
  return true;
}

function parseId(raw: string, res: any): number | null {
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "Invalid id" }); return null; }
  return id;
}

function parseBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

const DEFAULT_ROLES = [
  { name: "Sales_Manager", level: 1, description: "First-line sales approver" },
  { name: "Sales_Director", level: 2, description: "Mid-level sales approver" },
  { name: "VP_Sales", level: 3, description: "Executive sales approver" },
  { name: "Finance_Manager", level: 1, description: "Finance first-line approver" },
  { name: "Finance_Controller", level: 2, description: "Finance escalation approver" },
  { name: "Senior_Account_Director", level: 2, description: "High-value account approver" },
  { name: "Pricing_Team", level: 1, description: "Pricing review" },
  { name: "Operations_Manager", level: 1, description: "Operations approval" },
  { name: "Logistics_Lead", level: 1, description: "Logistics approval" },
];

async function ensureSeed(orgId: number) {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(approvalRolesTable)
    .where(eq(approvalRolesTable.orgId, orgId));
  if (Number(count) === 0) {
    await db.insert(approvalRolesTable).values(DEFAULT_ROLES.map((r) => ({ ...r, orgId })));
  }
  for (const entity of ENTITIES) {
    const [existing] = await db.select().from(approvalConfigsTable)
      .where(and(eq(approvalConfigsTable.entity, entity), eq(approvalConfigsTable.orgId, orgId)));
    if (!existing) {
      await db.insert(approvalConfigsTable).values({ orgId, entity, multiLevel: entity === "opportunity", enabled: true });
    }
  }
}

function serializeCriterion(c: typeof approvalCriteriaTable.$inferSelect) {
  return { ...c, threshold: c.threshold === null ? null : Number(c.threshold) };
}

function handleDbError(req: any, res: any, err: any) {
  req.log.error(err);
  const code = (err && (err.code || err?.cause?.code)) as string | undefined;
  if (code === "23505") { res.status(409).json({ error: "Duplicate value (unique constraint)" }); return; }
  if (code === "23503") { res.status(400).json({ error: "Referenced record not found" }); return; }
  res.status(500).json({ error: "Internal server error" });
}

// Roles
router.get("/approvals/roles", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const orgId = req.orgId as number;
    await ensureSeed(orgId);
    const data = await db.select().from(approvalRolesTable)
      .where(eq(approvalRolesTable.orgId, orgId))
      .orderBy(approvalRolesTable.level, approvalRolesTable.name);
    res.json({ data });
  } catch (err) { handleDbError(req, res, err); }
});

router.post("/approvals/roles", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { name, level, description } = req.body ?? {};
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const lvl = Number(level);
    const [role] = await db.insert(approvalRolesTable).values({
      orgId: req.orgId as number,
      name: name.trim(),
      level: Number.isFinite(lvl) && lvl > 0 ? lvl : 1,
      description: description ?? null,
    }).returning();
    res.status(201).json(role);
  } catch (err) { handleDbError(req, res, err); }
});

router.patch("/approvals/roles/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseId(req.params.id, res); if (id == null) return;
    const { name, level, description } = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Invalid name" }); return; }
      patch.name = name.trim();
    }
    if (level !== undefined) {
      const lvl = Number(level);
      if (!Number.isFinite(lvl) || lvl <= 0) { res.status(400).json({ error: "Invalid level" }); return; }
      patch.level = lvl;
    }
    if (description !== undefined) patch.description = description;
    const [role] = await db.update(approvalRolesTable).set(patch)
      .where(and(eq(approvalRolesTable.id, id), eq(approvalRolesTable.orgId, req.orgId as number)))
      .returning();
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }
    res.json(role);
  } catch (err) { handleDbError(req, res, err); }
});

router.delete("/approvals/roles/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseId(req.params.id, res); if (id == null) return;
    await db.delete(approvalRolesTable)
      .where(and(eq(approvalRolesTable.id, id), eq(approvalRolesTable.orgId, req.orgId as number)));
    res.json({ success: true, id });
  } catch (err) { handleDbError(req, res, err); }
});

// Configs
router.get("/approvals/configs", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const orgId = req.orgId as number;
    await ensureSeed(orgId);
    const data = await db.select().from(approvalConfigsTable).where(eq(approvalConfigsTable.orgId, orgId));
    res.json({ data });
  } catch (err) { handleDbError(req, res, err); }
});

router.put("/approvals/configs/:entity", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const orgId = req.orgId as number;
    const entity = req.params.entity;
    if (!isEntity(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    const { multiLevel, enabled } = req.body ?? {};
    const mlParsed = parseBool(multiLevel);
    const enParsed = parseBool(enabled);
    if (multiLevel !== undefined && mlParsed === undefined) { res.status(400).json({ error: "multiLevel must be boolean" }); return; }
    if (enabled !== undefined && enParsed === undefined) { res.status(400).json({ error: "enabled must be boolean" }); return; }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (mlParsed !== undefined) patch.multiLevel = mlParsed;
    if (enParsed !== undefined) patch.enabled = enParsed;
    const [config] = await db.update(approvalConfigsTable).set(patch)
      .where(and(eq(approvalConfigsTable.entity, entity), eq(approvalConfigsTable.orgId, orgId)))
      .returning();
    if (!config) {
      const [created] = await db.insert(approvalConfigsTable).values({
        orgId,
        entity,
        multiLevel: mlParsed ?? false,
        enabled: enParsed ?? true,
      }).returning();
      res.json(created);
      return;
    }
    res.json(config);
  } catch (err) { handleDbError(req, res, err); }
});

// Criteria
router.get("/approvals/criteria", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const orgId = req.orgId as number;
    const entity = req.query.entity as string | undefined;
    if (entity !== undefined && !isEntity(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    const q = db.select().from(approvalCriteriaTable);
    const data = entity
      ? await q.where(and(eq(approvalCriteriaTable.entity, entity), eq(approvalCriteriaTable.orgId, orgId))).orderBy(approvalCriteriaTable.level, approvalCriteriaTable.name)
      : await q.where(eq(approvalCriteriaTable.orgId, orgId)).orderBy(approvalCriteriaTable.entity, approvalCriteriaTable.level, approvalCriteriaTable.name);
    res.json({ data: data.map(serializeCriterion) });
  } catch (err) { handleDbError(req, res, err); }
});

// Preview: given an entity + draft snapshot, return the rules that would
// require approval. Used by the frontend to show a live warning banner
// while the user edits a discount/amount.
router.post("/approvals/preview", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const orgId = req.orgId as number;
    const { entity, snapshot } = req.body ?? {};
    if (!isEntity(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    if (!snapshot || typeof snapshot !== "object") { res.status(400).json({ error: "snapshot required" }); return; }
    const [config] = await db.select().from(approvalConfigsTable).where(and(eq(approvalConfigsTable.entity, entity), eq(approvalConfigsTable.orgId, orgId)));
    if (config && config.enabled === false) { res.json({ data: [] }); return; }
    const rows = await db.select().from(approvalCriteriaTable)
      .where(and(eq(approvalCriteriaTable.entity, entity), eq(approvalCriteriaTable.active, true), eq(approvalCriteriaTable.orgId, orgId)));
    const seen = new Set<string>();
    const matches: Array<{ name: string; field: string; operator: string; threshold: string | null; levels: number }> = [];
    for (const c of rows) {
      const sig = `${c.field}|${c.operator}|${c.threshold ?? ""}|${c.thresholdText ?? ""}`;
      if (seen.has(sig)) continue;
      if (!evaluateCriterion(c, snapshot as Record<string, number | string | null | undefined>)) continue;
      seen.add(sig);
      const levels = rows.filter(r =>
        r.field === c.field && r.operator === c.operator &&
        (r.threshold ?? "") === (c.threshold ?? "") &&
        (r.thresholdText ?? "") === (c.thresholdText ?? "")
      ).length;
      matches.push({ name: c.name, field: c.field, operator: c.operator, threshold: c.threshold, levels });
    }
    res.json({ data: matches });
  } catch (err) { handleDbError(req, res, err); }
});

router.post("/approvals/criteria", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { entity, name, field, operator, threshold, thresholdText, level, roleId, active } = req.body ?? {};
    if (!isEntity(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    if (!name || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name is required" }); return; }
    if (!field || typeof field !== "string") { res.status(400).json({ error: "field is required" }); return; }
    if (!isOperator(operator)) { res.status(400).json({ error: "Invalid operator" }); return; }
    const lvl = level === undefined ? 1 : Number(level);
    if (!Number.isFinite(lvl) || lvl <= 0) { res.status(400).json({ error: "Invalid level" }); return; }
    const activeParsed = active === undefined ? true : parseBool(active);
    if (activeParsed === undefined) { res.status(400).json({ error: "active must be boolean" }); return; }
    const [criterion] = await db.insert(approvalCriteriaTable).values({
      orgId: req.orgId as number,
      entity,
      name: name.trim(),
      field,
      operator,
      threshold: threshold === null || threshold === undefined || threshold === "" ? null : String(threshold),
      thresholdText: thresholdText ?? null,
      level: lvl,
      roleId: roleId ?? null,
      active: activeParsed,
    }).returning();
    res.status(201).json(serializeCriterion(criterion));
  } catch (err) { handleDbError(req, res, err); }
});

router.patch("/approvals/criteria/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseId(req.params.id, res); if (id == null) return;
    const { name, field, operator, threshold, thresholdText, level, roleId, active } = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "Invalid name" }); return; }
      patch.name = name.trim();
    }
    if (field !== undefined) {
      if (typeof field !== "string" || !field) { res.status(400).json({ error: "Invalid field" }); return; }
      patch.field = field;
    }
    if (operator !== undefined) {
      if (!isOperator(operator)) { res.status(400).json({ error: "Invalid operator" }); return; }
      patch.operator = operator;
    }
    if (threshold !== undefined) patch.threshold = threshold === null || threshold === "" ? null : String(threshold);
    if (thresholdText !== undefined) patch.thresholdText = thresholdText;
    if (level !== undefined) {
      const lvl = Number(level);
      if (!Number.isFinite(lvl) || lvl <= 0) { res.status(400).json({ error: "Invalid level" }); return; }
      patch.level = lvl;
    }
    if (roleId !== undefined) patch.roleId = roleId;
    if (active !== undefined) {
      const a = parseBool(active);
      if (a === undefined) { res.status(400).json({ error: "active must be boolean" }); return; }
      patch.active = a;
    }
    const [criterion] = await db.update(approvalCriteriaTable).set(patch)
      .where(and(eq(approvalCriteriaTable.id, id), eq(approvalCriteriaTable.orgId, req.orgId as number)))
      .returning();
    if (!criterion) { res.status(404).json({ error: "Criterion not found" }); return; }
    res.json(serializeCriterion(criterion));
  } catch (err) { handleDbError(req, res, err); }
});

router.delete("/approvals/criteria/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseId(req.params.id, res); if (id == null) return;
    await db.delete(approvalCriteriaTable)
      .where(and(eq(approvalCriteriaTable.id, id), eq(approvalCriteriaTable.orgId, req.orgId as number)));
    res.json({ success: true, id });
  } catch (err) { handleDbError(req, res, err); }
});

// ---------- Approval Requests (workflow instances + audit trail) ----------

const REQUEST_STATUSES = ["open", "approved", "rejected", "cancelled"] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];
const isStatus = (s: unknown): s is RequestStatus =>
  typeof s === "string" && (REQUEST_STATUSES as readonly string[]).includes(s);

async function loadRequestWithAudit(requestId: number, orgId: number) {
  const [request] = await db
    .select({
      id: approvalRequestsTable.id,
      entity: approvalRequestsTable.entity,
      entityId: approvalRequestsTable.entityId,
      status: approvalRequestsTable.status,
      level: approvalRequestsTable.level,
      roleId: approvalRequestsTable.roleId,
      roleName: approvalRolesTable.name,
      requestedBy: approvalRequestsTable.requestedBy,
      requestedAt: approvalRequestsTable.requestedAt,
      requestedByName: sql<string | null>`req_user.name`,
      decidedBy: approvalRequestsTable.decidedBy,
      decidedAt: approvalRequestsTable.decidedAt,
      decidedByName: sql<string | null>`dec_user.name`,
      comment: approvalRequestsTable.comment,
      createdAt: approvalRequestsTable.createdAt,
      updatedAt: approvalRequestsTable.updatedAt,
    })
    .from(approvalRequestsTable)
    .leftJoin(approvalRolesTable, eq(approvalRolesTable.id, approvalRequestsTable.roleId))
    .leftJoin(sql`${usersTable} as req_user`, sql`req_user.id = ${approvalRequestsTable.requestedBy}`)
    .leftJoin(sql`${usersTable} as dec_user`, sql`dec_user.id = ${approvalRequestsTable.decidedBy}`)
    .where(and(eq(approvalRequestsTable.id, requestId), eq(approvalRequestsTable.orgId, orgId)));

  if (!request) return null;

  const events = await db
    .select({
      id: approvalAuditEventsTable.id,
      event: approvalAuditEventsTable.event,
      actorUserId: approvalAuditEventsTable.actorUserId,
      actorName: approvalAuditEventsTable.actorName,
      comment: approvalAuditEventsTable.comment,
      createdAt: approvalAuditEventsTable.createdAt,
    })
    .from(approvalAuditEventsTable)
    .where(and(eq(approvalAuditEventsTable.requestId, requestId), eq(approvalAuditEventsTable.orgId, orgId)))
    .orderBy(approvalAuditEventsTable.createdAt, approvalAuditEventsTable.id);

  return { ...request, events };
}

// List approval requests for an entity record (with audit trail per request)
router.get("/approvals/requests", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const sessionUser = getSessionUser(req);
  const orgId = req.orgId as number;
  try {
    const { entity, entityId, status, scope } = req.query as Record<string, string | undefined>;
    const scopeVal = scope === "mine" || scope === "team" || scope === "all" ? scope : null;

    const filters: any[] = [eq(approvalRequestsTable.orgId, orgId)];

    if (scopeVal) {
      // List mode for the global Approvals page.
      if (entity && isEntity(entity)) filters.push(eq(approvalRequestsTable.entity, entity));

      if (scopeVal === "mine") {
        const meId = sessionUser?.id ?? 0;
        filters.push(sql`(${approvalRequestsTable.requestedBy} = ${meId} OR ${approvalRequestsTable.decidedBy} = ${meId})`);
      } else if (scopeVal === "team") {
        const meId = sessionUser?.id ?? 0;
        const [me] = await db.select({ team: usersTable.team }).from(usersTable).where(eq(usersTable.id, meId));
        const teamName = me?.team ?? null;
        if (!teamName) { res.json({ data: [] }); return; }
        const teammates = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.team, teamName));
        const teamIds = teammates.map((t) => t.id);
        if (teamIds.length === 0) { res.json({ data: [] }); return; }
        filters.push(inArray(approvalRequestsTable.requestedBy, teamIds));
      }
      // scopeVal === "all" → no extra filter
    } else {
      // Legacy entity-detail mode used by the per-record Approvals tab.
      if (!isEntity(entity)) { res.status(400).json({ error: "entity is required and must be one of " + ENTITIES.join(", ") }); return; }
      const idNum = Number.parseInt(String(entityId ?? ""), 10);
      if (!Number.isFinite(idNum) || idNum <= 0) { res.status(400).json({ error: "entityId is required" }); return; }
      filters.push(eq(approvalRequestsTable.entity, entity), eq(approvalRequestsTable.entityId, idNum));
    }

    if (status === "open") filters.push(eq(approvalRequestsTable.status, "open"));
    else if (status === "closed") filters.push(sql`${approvalRequestsTable.status} <> 'open'`);

    const rows = await db
      .select({
        id: approvalRequestsTable.id,
        entity: approvalRequestsTable.entity,
        entityId: approvalRequestsTable.entityId,
        status: approvalRequestsTable.status,
        level: approvalRequestsTable.level,
        roleId: approvalRequestsTable.roleId,
        roleName: approvalRolesTable.name,
        requestedBy: approvalRequestsTable.requestedBy,
        requestedAt: approvalRequestsTable.requestedAt,
        requestedByName: sql<string | null>`req_user.name`,
        decidedBy: approvalRequestsTable.decidedBy,
        decidedAt: approvalRequestsTable.decidedAt,
        decidedByName: sql<string | null>`dec_user.name`,
        comment: approvalRequestsTable.comment,
        createdAt: approvalRequestsTable.createdAt,
        updatedAt: approvalRequestsTable.updatedAt,
      })
      .from(approvalRequestsTable)
      .leftJoin(approvalRolesTable, eq(approvalRolesTable.id, approvalRequestsTable.roleId))
      .leftJoin(sql`${usersTable} as req_user`, sql`req_user.id = ${approvalRequestsTable.requestedBy}`)
      .leftJoin(sql`${usersTable} as dec_user`, sql`dec_user.id = ${approvalRequestsTable.decidedBy}`)
      .where(and(...filters))
      .orderBy(desc(approvalRequestsTable.requestedAt));

    if (rows.length === 0) { res.json({ data: [] }); return; }

    const ids = rows.map((r) => r.id);
    const allEvents = await db
      .select({
        id: approvalAuditEventsTable.id,
        requestId: approvalAuditEventsTable.requestId,
        event: approvalAuditEventsTable.event,
        actorUserId: approvalAuditEventsTable.actorUserId,
        actorName: approvalAuditEventsTable.actorName,
        comment: approvalAuditEventsTable.comment,
        createdAt: approvalAuditEventsTable.createdAt,
      })
      .from(approvalAuditEventsTable)
      .where(and(inArray(approvalAuditEventsTable.requestId, ids), eq(approvalAuditEventsTable.orgId, orgId)))
      .orderBy(approvalAuditEventsTable.createdAt, approvalAuditEventsTable.id);

    const eventsByRequest = new Map<number, typeof allEvents>();
    for (const e of allEvents) {
      const arr = eventsByRequest.get(e.requestId) ?? [];
      arr.push(e);
      eventsByRequest.set(e.requestId, arr);
    }

    res.json({ data: rows.map((r) => ({ ...r, events: eventsByRequest.get(r.id) ?? [] })) });
  } catch (err) { handleDbError(req, res, err); }
});

// Submit a new approval request
router.post("/approvals/requests", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req);
  const orgId = req.orgId as number;
  try {
    const { entity, entityId, level, roleId, comment } = req.body ?? {};
    if (!isEntity(entity)) { res.status(400).json({ error: "Invalid entity" }); return; }
    const idNum = Number.parseInt(String(entityId ?? ""), 10);
    if (!Number.isFinite(idNum) || idNum <= 0) { res.status(400).json({ error: "Invalid entityId" }); return; }

    const lvl = Number.isFinite(Number(level)) && Number(level) > 0 ? Number(level) : 1;
    let roleIdNum = roleId != null && Number.isFinite(Number(roleId)) ? Number(roleId) : null;
    const trimmedComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;

    // Default approver group when none specified: "Manager and above"
    // (managers + admins). Find or create the role on demand so the UI's
    // "Assigned To" column reflects the default approver pool.
    if (roleIdNum == null) {
      const DEFAULT_ROLE = "Manager and above";
      const [existingRole] = await db
        .select({ id: approvalRolesTable.id })
        .from(approvalRolesTable)
        .where(and(eq(approvalRolesTable.name, DEFAULT_ROLE), eq(approvalRolesTable.orgId, orgId)));
      if (existingRole) {
        roleIdNum = existingRole.id;
      } else {
        const [createdRole] = await db
          .insert(approvalRolesTable)
          .values({
            orgId,
            name: DEFAULT_ROLE,
            level: 1,
            description: "Default approver group — managers and admins.",
          })
          .returning({ id: approvalRolesTable.id });
        roleIdNum = createdRole?.id ?? null;
      }
    }

    const [created] = await db.insert(approvalRequestsTable).values({
      orgId,
      entity,
      entityId: idNum,
      status: "open",
      level: lvl,
      roleId: roleIdNum,
      requestedBy: user.id ?? null,
      comment: trimmedComment,
    }).returning();

    await db.insert(approvalAuditEventsTable).values({
      orgId,
      requestId: created.id,
      event: "submitted",
      actorUserId: user.id ?? null,
      actorName: user.name ?? user.email ?? null,
      comment: trimmedComment,
    });

    const full = await loadRequestWithAudit(created.id, orgId);
    res.status(201).json({ data: full });
  } catch (err) { handleDbError(req, res, err); }
});

// Approve / reject an open request (admin-only; atomic guard against double-decision)
router.post("/approvals/requests/:id/decision", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req);
  if (user.role !== "admin" && user.role !== "manager") { res.status(403).json({ error: "Forbidden — only managers and admins can approve or reject" }); return; }
  const orgId = req.orgId as number;
  try {
    const id = parseId(req.params.id, res);
    if (id == null) return;
    const { decision, comment } = req.body ?? {};
    if (decision !== "approved" && decision !== "rejected") {
      res.status(400).json({ error: "decision must be 'approved' or 'rejected'" });
      return;
    }
    const trimmedComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;
    if (decision === "rejected" && !trimmedComment) {
      res.status(400).json({ error: "A comment is required when rejecting an approval request." });
      return;
    }
    const [existing] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, id), eq(approvalRequestsTable.orgId, orgId)));
    if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
    const now = new Date();

    const finalId = await db.transaction(async (tx) => {
      const updated = await tx.update(approvalRequestsTable)
        .set({ status: decision, decidedBy: user.id ?? null, decidedAt: now, updatedAt: now })
        .where(and(eq(approvalRequestsTable.id, id), eq(approvalRequestsTable.status, "open"), eq(approvalRequestsTable.orgId, orgId)))
        .returning({ id: approvalRequestsTable.id });
      if (updated.length === 0) return null;
      await tx.insert(approvalAuditEventsTable).values({
        orgId,
        requestId: id,
        event: decision,
        actorUserId: user.id ?? null,
        actorName: user.name ?? user.email ?? null,
        comment: trimmedComment,
      });
      return updated[0].id;
    });

    if (finalId == null) { res.status(409).json({ error: "Request is already closed" }); return; }

    // If the rule has further levels and the entity has multi-level enabled,
    // auto-create the next request and notify approvers.
    if (decision === "approved") {
      void advanceMultiLevelApproval(
        id,
        { id: user.id ?? null, name: user.name ?? null, email: user.email ?? null },
        req.log,
      );
    }

    const full = await loadRequestWithAudit(id, orgId);
    res.json({ data: full });
  } catch (err) { handleDbError(req, res, err); }
});

// Add a comment to a request (without changing status)
router.post("/approvals/requests/:id/comment", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req);
  const orgId = req.orgId as number;
  try {
    const id = parseId(req.params.id, res);
    if (id == null) return;
    const { comment } = req.body ?? {};
    if (typeof comment !== "string" || !comment.trim()) {
      res.status(400).json({ error: "comment is required" });
      return;
    }
    const [existing] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, id), eq(approvalRequestsTable.orgId, orgId)));
    if (!existing) { res.status(404).json({ error: "Request not found" }); return; }

    await db.insert(approvalAuditEventsTable).values({
      orgId,
      requestId: id,
      event: "commented",
      actorUserId: user.id ?? null,
      actorName: user.name ?? user.email ?? null,
      comment: comment.trim(),
    });

    const full = await loadRequestWithAudit(id, orgId);
    res.json({ data: full });
  } catch (err) { handleDbError(req, res, err); }
});

// Cancel an open request (by requester or admin)
router.post("/approvals/requests/:id/cancel", async (req, res) => {
  if (!requireAuth(req, res)) return;
  const user = getSessionUser(req);
  const orgId = req.orgId as number;
  try {
    const id = parseId(req.params.id, res);
    if (id == null) return;
    const [existing] = await db.select().from(approvalRequestsTable)
      .where(and(eq(approvalRequestsTable.id, id), eq(approvalRequestsTable.orgId, orgId)));
    if (!existing) { res.status(404).json({ error: "Request not found" }); return; }
    if (existing.requestedBy !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Only the requester or an admin can cancel" });
      return;
    }

    const { comment } = req.body ?? {};
    const trimmedComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;
    const now = new Date();

    const finalId = await db.transaction(async (tx) => {
      const updated = await tx.update(approvalRequestsTable)
        .set({ status: "cancelled", decidedBy: user.id ?? null, decidedAt: now, updatedAt: now })
        .where(and(eq(approvalRequestsTable.id, id), eq(approvalRequestsTable.status, "open"), eq(approvalRequestsTable.orgId, orgId)))
        .returning({ id: approvalRequestsTable.id });
      if (updated.length === 0) return null;
      await tx.insert(approvalAuditEventsTable).values({
        orgId,
        requestId: id,
        event: "cancelled",
        actorUserId: user.id ?? null,
        actorName: user.name ?? user.email ?? null,
        comment: trimmedComment,
      });
      return updated[0].id;
    });

    if (finalId == null) { res.status(409).json({ error: "Request is already closed" }); return; }

    const full = await loadRequestWithAudit(id, orgId);
    res.json({ data: full });
  } catch (err) { handleDbError(req, res, err); }
});

// Silence unused warning when isStatus isn't used directly (kept for symmetry)
void isStatus;

export default router;
