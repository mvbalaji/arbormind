import { db } from "@workspace/db";
import { recordTypesTable, recordAccessTable, rolesTable, RECORD_PERMISSIONS, type RecordPermission } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export const SEED_RECORD_TYPES: Array<{ key: string; name: string; sortOrder: number }> = [
  { key: "leads", name: "Lead", sortOrder: 10 },
  { key: "contacts", name: "Contact", sortOrder: 20 },
  { key: "accounts", name: "Customer (Account)", sortOrder: 30 },
  { key: "opportunities", name: "Opportunity", sortOrder: 40 },
  { key: "quotes", name: "Quote", sortOrder: 50 },
  { key: "orders", name: "Order", sortOrder: 60 },
  { key: "activities", name: "Task / Activity", sortOrder: 70 },
  { key: "cases", name: "Case", sortOrder: 80 },
  { key: "products", name: "Product", sortOrder: 90 },
  { key: "campaigns", name: "Campaign", sortOrder: 100 },
];

export async function seedRecordAccess(): Promise<void> {
  try {
    // Seed record types (idempotent).
    for (const rt of SEED_RECORD_TYPES) {
      await db.insert(recordTypesTable).values(rt).onConflictDoNothing();
    }

    // Ensure admin has all permissions for every record type.
    for (const rt of SEED_RECORD_TYPES) {
      await db
        .insert(recordAccessTable)
        .values({
          recordTypeKey: rt.key,
          roleKey: "admin",
          canView: true,
          canReadOnly: true,
          canEdit: true,
          canCreate: true,
          canDelete: true,
        })
        .onConflictDoNothing();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[seedRecordAccess] failed:", err);
  }
}

export type PermissionsRow = {
  canView: boolean;
  canReadOnly: boolean;
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
};

const NO_PERMS: PermissionsRow = {
  canView: false,
  canReadOnly: false,
  canEdit: false,
  canCreate: false,
  canDelete: false,
};

const ALL_PERMS: PermissionsRow = {
  canView: true,
  canReadOnly: true,
  canEdit: true,
  canCreate: true,
  canDelete: true,
};

const COLUMN_BY_PERMISSION: Record<RecordPermission, keyof PermissionsRow> = {
  view: "canView",
  read_only: "canReadOnly",
  edit: "canEdit",
  create: "canCreate",
  delete: "canDelete",
};

export async function getRecordPermissionsForRole(roleKey: string): Promise<Record<string, PermissionsRow>> {
  if (roleKey === "admin") {
    return Object.fromEntries(SEED_RECORD_TYPES.map((rt) => [rt.key, ALL_PERMS]));
  }
  const rows = await db.select().from(recordAccessTable).where(eq(recordAccessTable.roleKey, roleKey));
  const out: Record<string, PermissionsRow> = {};
  for (const r of rows) {
    out[r.recordTypeKey] = {
      canView: r.canView,
      canReadOnly: r.canReadOnly,
      canEdit: r.canEdit,
      canCreate: r.canCreate,
      canDelete: r.canDelete,
    };
  }
  return out;
}

export async function userHasRecordPermission(
  roleKey: string | undefined | null,
  recordTypeKey: string,
  permission: RecordPermission,
): Promise<boolean> {
  if (!roleKey) return false;
  if (roleKey === "admin") return true;
  const [row] = await db
    .select()
    .from(recordAccessTable)
    .where(and(eq(recordAccessTable.recordTypeKey, recordTypeKey), eq(recordAccessTable.roleKey, roleKey)));
  if (!row) return false;
  const col = COLUMN_BY_PERMISSION[permission];
  return Boolean(row[col]);
}

// Map HTTP method → required record permission. GET = view; POST = create;
// PUT/PATCH = edit; DELETE = delete. Override via the second arg.
const METHOD_TO_PERMISSION: Record<string, RecordPermission> = {
  GET: "view",
  HEAD: "view",
  POST: "create",
  PUT: "edit",
  PATCH: "edit",
  DELETE: "delete",
};

/**
 * Express middleware that enforces record-level access. The required
 * permission is inferred from the HTTP method unless explicitly provided.
 *
 * Note: this is a defence-in-depth layer; the existing screen-level
 * `requireScreenAccess` middleware still runs first for each entity router.
 */
export function requireRecordPermission(recordTypeKey: string, permission?: RecordPermission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const sessionUser = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
    const roleKey = sessionUser?.role;
    if (!roleKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const required: RecordPermission = permission ?? METHOD_TO_PERMISSION[req.method] ?? "view";
    const allowed = await userHasRecordPermission(roleKey, recordTypeKey, required);
    if (!allowed) {
      res.status(403).json({ error: `Forbidden: ${required} on ${recordTypeKey} not allowed for role ${roleKey}` });
      return;
    }
    next();
  };
}

export { RECORD_PERMISSIONS };
export { NO_PERMS, ALL_PERMS };
