import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { appModulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { FULL_ACCESS_ROLES } from "../lib/access-control";
import { getDefaultOrgId } from "../lib/org-context";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // In dev mode (no Google OAuth), allow all requests through
  if (!process.env.GOOGLE_CLIENT_ID) { next(); return; }
  const u = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
  if (!u?.role) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!FULL_ACCESS_ROLES.has(u.role)) { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

// GET /admin/app-modules — list all modules with their current state
router.get("/admin/app-modules", requireAdmin, async (req, res) => {
  try {
    const modules = await db
      .select()
      .from(appModulesTable)
      .where(eq(appModulesTable.orgId, req.orgId as number))
      .orderBy(appModulesTable.sortOrder);
    res.json({ modules });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to load modules" });
  }
});

// PUT /admin/app-modules/:key — toggle a module on/off
router.put("/admin/app-modules/:key", requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { isEnabled } = req.body as { isEnabled?: boolean };

  if (typeof isEnabled !== "boolean") {
    res.status(400).json({ error: "isEnabled (boolean) is required" });
    return;
  }

  try {
    const orgId = req.orgId as number;
    const [existing] = await db.select().from(appModulesTable).where(and(eq(appModulesTable.orgId, orgId), eq(appModulesTable.key, key)));
    if (!existing) {
      res.status(404).json({ error: "Module not found" });
      return;
    }
    if (existing.isCore && !isEnabled) {
      res.status(400).json({ error: "Core modules cannot be disabled." });
      return;
    }

    const [updated] = await db
      .update(appModulesTable)
      .set({ isEnabled, updatedAt: new Date() })
      .where(and(eq(appModulesTable.orgId, orgId), eq(appModulesTable.key, key)))
      .returning();

    // Keep admin_settings in sync for CPQ feature flag
    if (key === "cpq") {
      await db.execute(sql`
        INSERT INTO admin_settings (org_id, key, value) VALUES (${orgId}, 'cpq_enabled', ${String(isEnabled)})
        ON CONFLICT (org_id, key) DO UPDATE SET value = ${String(isEnabled)}, updated_at = NOW()
      `);
    }

    res.json({ module: updated });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update module" });
  }
});

// Public endpoint — used by unauthenticated fallback if needed, but primarily returns module state
router.get("/app-modules/public", async (req, res) => {
  try {
    const orgId = req.orgId ?? (await getDefaultOrgId());
    const modules = await db.select({
      key: appModulesTable.key,
      isEnabled: appModulesTable.isEnabled,
    }).from(appModulesTable).where(eq(appModulesTable.orgId, orgId));
    const enabledModules: Record<string, boolean> = {};
    for (const m of modules) enabledModules[m.key] = m.isEnabled;
    enabledModules["crm_sales"] = true; // always on
    res.json({ enabledModules });
  } catch {
    res.json({ enabledModules: { crm_sales: true, quotes: true, orders: true, contracts: true } });
  }
});

export default router;
