import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import {
  screensTable, rolesTable, screenAccessTable,
  type AccessLevel, ACCESS_LEVELS,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const SEED_ROLES: Array<{ key: string; label: string; sortOrder: number }> = [
  { key: "admin", label: "System Administrator", sortOrder: 10 },
  { key: "md", label: "Managing Director", sortOrder: 20 },
  { key: "vp", label: "Vice President", sortOrder: 30 },
  { key: "sales_director", label: "Sales Director", sortOrder: 40 },
  { key: "sales_manager", label: "Sales Manager", sortOrder: 50 },
  { key: "sales_rep", label: "Sales Rep", sortOrder: 60 },
];

export const SEED_SCREENS: Array<{ key: string; name: string; category: string; sortOrder: number }> = [
  { key: "dashboard", name: "Dashboard", category: "Overview", sortOrder: 10 },
  { key: "leads", name: "Leads", category: "Sales", sortOrder: 20 },
  { key: "contacts", name: "Contacts", category: "Sales", sortOrder: 30 },
  { key: "accounts", name: "Accounts", category: "Sales", sortOrder: 40 },
  { key: "opportunities", name: "Opportunities", category: "Sales", sortOrder: 50 },
  { key: "quotes", name: "Quotes", category: "Sales", sortOrder: 60 },
  { key: "orders", name: "Orders", category: "Sales", sortOrder: 70 },
  { key: "activities", name: "Activities", category: "Engagement", sortOrder: 80 },
  { key: "campaigns", name: "Campaigns", category: "Marketing", sortOrder: 90 },
  { key: "products", name: "Products", category: "Catalog", sortOrder: 100 },
  { key: "cases", name: "Cases", category: "Service", sortOrder: 110 },
  { key: "reports", name: "Reports", category: "Insights", sortOrder: 120 },
  { key: "users", name: "Team & Data", category: "Admin", sortOrder: 130 },
  { key: "support", name: "Support", category: "Service", sortOrder: 140 },
  { key: "ai-assistant", name: "AI Assistant", category: "Insights", sortOrder: 150 },
  { key: "approvals", name: "Approvals", category: "Admin", sortOrder: 160 },
  { key: "access-control", name: "Access Control", category: "Admin", sortOrder: 170 },
];

let seeded = false;
export async function seedAccessControl(): Promise<void> {
  if (seeded) return;
  try {
    await db.insert(rolesTable).values(SEED_ROLES).onConflictDoNothing();
    await db.insert(screensTable).values(SEED_SCREENS).onConflictDoNothing();
    // Default admin → edit everywhere
    const adminRows = SEED_SCREENS.map((s) => ({
      screenKey: s.key, roleKey: "admin", accessLevel: "edit",
    }));
    await db.insert(screenAccessTable).values(adminRows).onConflictDoNothing();
    seeded = true;
  } catch (err) {
    console.error("[AccessControl] Seed failed:", err);
  }
}

export function isValidAccessLevel(v: unknown): v is AccessLevel {
  return typeof v === "string" && (ACCESS_LEVELS as readonly string[]).includes(v);
}

const LEVEL_RANK: Record<AccessLevel, number> = {
  none: 0,
  view: 1,
  read_only: 2,
  edit: 3,
};

export function levelMeets(actual: AccessLevel, required: AccessLevel): boolean {
  return LEVEL_RANK[actual] >= LEVEL_RANK[required];
}

export async function getScreenAccessForRole(role: string): Promise<Record<string, AccessLevel>> {
  // Admin always has full edit access regardless of stored rules.
  if (role === "admin") {
    const out: Record<string, AccessLevel> = {};
    for (const s of SEED_SCREENS) out[s.key] = "edit";
    return out;
  }
  const rows = await db.select({
    screenKey: screenAccessTable.screenKey,
    accessLevel: screenAccessTable.accessLevel,
  }).from(screenAccessTable).where(eq(screenAccessTable.roleKey, role));
  const out: Record<string, AccessLevel> = {};
  for (const r of rows) {
    if (isValidAccessLevel(r.accessLevel)) out[r.screenKey] = r.accessLevel;
  }
  return out;
}

export async function userHasScreenAccess(
  role: string, screenKey: string, required: AccessLevel
): Promise<boolean> {
  if (role === "admin") return true;
  const [row] = await db.select({ accessLevel: screenAccessTable.accessLevel })
    .from(screenAccessTable)
    .where(and(eq(screenAccessTable.roleKey, role), eq(screenAccessTable.screenKey, screenKey)));
  const lvl = (row?.accessLevel ?? "none") as AccessLevel;
  return levelMeets(isValidAccessLevel(lvl) ? lvl : "none", required);
}

export function requireScreenAccess(screenKey: string, required: AccessLevel = "view") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const u = (req.user || (req.session as any)?.user) as { role?: string } | undefined;
    if (!u?.role) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Methods imply the required level when caller passes default 'view'.
    const method = req.method.toUpperCase();
    const isMutation = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
    const effectiveRequired: AccessLevel = isMutation ? "edit" : required;
    try {
      const ok = await userHasScreenAccess(u.role, screenKey, effectiveRequired);
      if (!ok) {
        res.status(403).json({
          error: "Forbidden",
          detail: `Your role (${u.role}) does not have ${effectiveRequired} access to ${screenKey}.`,
        });
        return;
      }
      next();
    } catch (err) {
      req.log?.error(err);
      res.status(500).json({ error: "Access check failed" });
    }
  };
}
