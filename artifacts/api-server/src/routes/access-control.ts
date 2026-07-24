import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  screensTable, rolesTable, screenAccessTable, accessAuditLogTable,
  ACCESS_LEVELS, type AccessLevel,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { isValidAccessLevel, FULL_ACCESS_ROLES } from "../lib/access-control";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
  if (!u?.role) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!FULL_ACCESS_ROLES.has(u.role)) {
    res.status(403).json({ error: "Forbidden — System Administrator role required" });
    return;
  }
  next();
}

router.get("/admin/access-control/roles", requireAdmin, async (_req, res) => {
  try {
    const rows = await db.select().from(rolesTable).orderBy(rolesTable.sortOrder);
    res.json({ data: rows });
  } catch (err) {
    _req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/access-control/screens", requireAdmin, async (req, res) => {
  try {
    const screens = await db.select().from(screensTable).orderBy(screensTable.sortOrder);
    const roles = await db.select().from(rolesTable).orderBy(rolesTable.sortOrder);
    const accessRows = await db.select().from(screenAccessTable);

    const matrix: Record<string, Record<string, AccessLevel>> = {};
    for (const s of screens) {
      matrix[s.key] = {};
      for (const r of roles) {
        // super_admin and admin always have full edit
        matrix[s.key][r.key] = FULL_ACCESS_ROLES.has(r.key) ? "edit" : "none";
      }
    }
    for (const row of accessRows) {
      if (matrix[row.screenKey] && isValidAccessLevel(row.accessLevel)) {
        matrix[row.screenKey][row.roleKey] = row.accessLevel;
      }
    }
    res.json({ screens, roles, matrix });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/admin/access-control/screens/:screenKey/roles/:roleKey", requireAdmin, async (req, res) => {
  try {
    const { screenKey, roleKey } = req.params;
    const { accessLevel } = req.body as { accessLevel?: unknown };
    if (!isValidAccessLevel(accessLevel)) {
      res.status(400).json({ error: `accessLevel must be one of: ${ACCESS_LEVELS.join(", ")}` });
      return;
    }
    if (FULL_ACCESS_ROLES.has(roleKey)) {
      res.status(400).json({ error: "Administrator roles always have full edit access and cannot be modified." });
      return;
    }
    // Verify FK targets exist for clearer errors.
    const [screen] = await db.select().from(screensTable).where(eq(screensTable.key, screenKey));
    if (!screen) { res.status(404).json({ error: "Screen not found" }); return; }
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.key, roleKey));
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }

    const actor = (req.user || (req.session as any)?.user) as { id?: number; name?: string; email?: string } | undefined;

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(screenAccessTable)
        .where(and(eq(screenAccessTable.screenKey, screenKey), eq(screenAccessTable.roleKey, roleKey)));
      const previousLevel = existing?.accessLevel ?? "none";

      if (previousLevel === accessLevel) {
        return { unchanged: true, previousLevel };
      }

      if (existing) {
        await tx.update(screenAccessTable)
          .set({ accessLevel, updatedBy: actor?.id ?? null, updatedAt: new Date() })
          .where(eq(screenAccessTable.id, existing.id));
      } else {
        await tx.insert(screenAccessTable).values({
          screenKey, roleKey, accessLevel,
          updatedBy: actor?.id ?? null,
        });
      }

      await tx.insert(accessAuditLogTable).values({
        screenKey, roleKey,
        previousLevel,
        newLevel: accessLevel,
        changedByUserId: actor?.id ?? null,
        changedByName: actor?.name ?? actor?.email ?? "system",
      });

      return { unchanged: false, previousLevel };
    });

    if (result.unchanged) {
      res.json({ screenKey, roleKey, accessLevel, unchanged: true });
      return;
    }
    res.json({ screenKey, roleKey, accessLevel, previousLevel: result.previousLevel });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/admin/access-control/audit", requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) || "100"), 500);
    const rows = await db.select().from(accessAuditLogTable)
      .orderBy(desc(accessAuditLogTable.createdAt))
      .limit(limit);
    res.json({ data: rows });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
