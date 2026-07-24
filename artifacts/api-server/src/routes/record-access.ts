import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  recordTypesTable,
  recordAccessTable,
  recordAccessAuditLogTable,
  rolesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin only" });
    return;
  }
  next();
}

router.use("/admin/record-access", requireAdmin);

const PERM_COLUMNS = ["canView", "canReadOnly", "canEdit", "canCreate", "canDelete"] as const;
type PermColumn = (typeof PERM_COLUMNS)[number];

function pickPerms(input: Record<string, unknown>) {
  const out: Partial<Record<PermColumn, boolean>> = {};
  for (const col of PERM_COLUMNS) {
    if (typeof input[col] === "boolean") out[col] = input[col] as boolean;
  }
  return out;
}

// GET /admin/record-access/matrix → { recordTypes, roles, matrix }
router.get("/admin/record-access/matrix", async (_req, res) => {
  try {
    const [recordTypes, roles, rows] = await Promise.all([
      db.select().from(recordTypesTable).orderBy(recordTypesTable.sortOrder, recordTypesTable.key),
      db.select().from(rolesTable).orderBy(rolesTable.sortOrder, rolesTable.key),
      db.select().from(recordAccessTable),
    ]);

    const matrix: Record<string, Record<string, Record<PermColumn, boolean>>> = {};
    for (const rt of recordTypes) {
      matrix[rt.key] = {};
      for (const role of roles) {
        if (role.key === "admin") {
          matrix[rt.key][role.key] = {
            canView: true, canReadOnly: true, canEdit: true, canCreate: true, canDelete: true,
          };
        } else {
          matrix[rt.key][role.key] = {
            canView: false, canReadOnly: false, canEdit: false, canCreate: false, canDelete: false,
          };
        }
      }
    }
    for (const r of rows) {
      if (matrix[r.recordTypeKey]?.[r.roleKey]) {
        matrix[r.recordTypeKey][r.roleKey] = {
          canView: r.canView,
          canReadOnly: r.canReadOnly,
          canEdit: r.canEdit,
          canCreate: r.canCreate,
          canDelete: r.canDelete,
        };
      }
    }

    res.json({ recordTypes, roles, matrix });
  } catch (err) {
    res.status(500).json({ error: "Failed to load record access matrix" });
  }
});

// PUT /admin/record-access/types/:recordTypeKey/roles/:roleKey
// Body: { canView?, canReadOnly?, canEdit?, canCreate?, canDelete? }
router.put("/admin/record-access/types/:recordTypeKey/roles/:roleKey", async (req, res) => {
  try {
    const { recordTypeKey, roleKey } = req.params;
    if (roleKey === "admin") {
      res.status(400).json({ error: "Administrator permissions cannot be modified" });
      return;
    }

    const perms = pickPerms(req.body ?? {});
    if (Object.keys(perms).length === 0) {
      res.status(400).json({ error: "No permission flags supplied" });
      return;
    }

    const [recordType] = await db.select().from(recordTypesTable).where(eq(recordTypesTable.key, recordTypeKey));
    if (!recordType) { res.status(404).json({ error: "Record type not found" }); return; }
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.key, roleKey));
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }

    const actor = (req.user || (req.session as any)?.user) as { id?: number; name?: string; email?: string } | undefined;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(recordAccessTable)
        .where(and(eq(recordAccessTable.recordTypeKey, recordTypeKey), eq(recordAccessTable.roleKey, roleKey)));

      const previous = existing
        ? {
            canView: existing.canView,
            canReadOnly: existing.canReadOnly,
            canEdit: existing.canEdit,
            canCreate: existing.canCreate,
            canDelete: existing.canDelete,
          }
        : { canView: false, canReadOnly: false, canEdit: false, canCreate: false, canDelete: false };

      const merged = { ...previous, ...perms };
      const unchanged = PERM_COLUMNS.every((c) => previous[c] === merged[c]);
      if (unchanged) return { unchanged: true, previous, merged };

      if (existing) {
        await tx
          .update(recordAccessTable)
          .set({ ...merged, updatedBy: actor?.id ?? null, updatedAt: new Date() })
          .where(eq(recordAccessTable.id, existing.id));
      } else {
        await tx.insert(recordAccessTable).values({
          recordTypeKey,
          roleKey,
          ...merged,
          updatedBy: actor?.id ?? null,
        });
      }

      await tx.insert(recordAccessAuditLogTable).values({
        recordTypeKey,
        roleKey,
        previousPermissions: previous,
        newPermissions: merged,
        changedByUserId: actor?.id ?? null,
        changedByName: actor?.name ?? actor?.email ?? "system",
      });

      return { unchanged: false, previous, merged };
    });

    res.json({
      recordTypeKey,
      roleKey,
      permissions: result.merged,
      previous: result.previous,
      unchanged: result.unchanged,
    });
  } catch (err) {
    req.log?.error?.(err);
    res.status(500).json({ error: "Failed to update record access" });
  }
});

// GET /admin/record-access/audit?limit=100
router.get("/admin/record-access/audit", async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
    const rows = await db
      .select()
      .from(recordAccessAuditLogTable)
      .orderBy(desc(recordAccessAuditLogTable.createdAt))
      .limit(limit);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;
