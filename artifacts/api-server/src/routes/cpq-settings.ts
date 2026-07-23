import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const DEFAULT_VOLUME_TIERS = [
  { min: 1, max: 10, disc: 0 },
  { min: 11, max: 25, disc: 5 },
  { min: 26, max: 50, disc: 10 },
  { min: 51, max: 100, disc: 15 },
  { min: 101, max: null, disc: 20 },
];

const DEFAULT_APPROVAL_THRESHOLDS = [
  { pct: 10, approver: "Team Lead" },
  { pct: 20, approver: "Manager" },
  { pct: 30, approver: "Director" },
  { pct: 40, approver: "VP" },
];

const DEFAULT_PARTNER_TIERS = [
  { tier: "Registered", disc: 5 },
  { tier: "Silver", disc: 10 },
  { tier: "Gold", disc: 15 },
  { tier: "Platinum", disc: 25 },
];

async function ensureAuditTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cpq_settings_audit (
      id SERIAL PRIMARY KEY,
      org_id INTEGER NOT NULL DEFAULT 1,
      setting_key TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_by_id INTEGER,
      changed_by_name TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE cpq_settings_audit ADD COLUMN IF NOT EXISTS org_id INTEGER NOT NULL DEFAULT 1`);
}

async function logAudit(orgId: number, key: string, oldVal: string | null, newVal: string, userId?: number, userName?: string) {
  try {
    await ensureAuditTable();
    await db.execute(sql`
      INSERT INTO cpq_settings_audit (org_id, setting_key, old_value, new_value, changed_by_id, changed_by_name)
      VALUES (${orgId}, ${key}, ${oldVal}, ${newVal}, ${userId ?? null}, ${userName ?? "System"})
    `);
  } catch (err) {
    console.error("[CPQ audit]", err);
  }
}

async function getSetting(orgId: number, key: string): Promise<string | null> {
  try {
    const rows = await db.execute(sql`SELECT value FROM admin_settings WHERE org_id = ${orgId} AND key = ${key} LIMIT 1`);
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setSetting(orgId: number, key: string, value: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO admin_settings (org_id, key, value) VALUES (${orgId}, ${key}, ${value})
    ON CONFLICT (org_id, key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `);
}

function isAdmin(req: any): boolean {
  const user = req.user ?? req.session?.user;
  const isDevMode = !process.env.GOOGLE_CLIENT_ID;
  if (isDevMode) return true;
  return user && (user.role === "admin" || user.role === "super_admin");
}

function getUser(req: any): { id?: number; name?: string } {
  const user = req.user ?? req.session?.user;
  if (!user) return {};
  return { id: user.id, name: user.name ?? user.email ?? "Admin" };
}

// GET /api/settings/cpq
router.get("/settings/cpq", async (req, res) => {
  try {
    const val = await getSetting(req.orgId as number, "cpq_enabled");
    res.json({ enabled: val === "true" });
  } catch {
    res.json({ enabled: false });
  }
});

// POST /api/settings/cpq
router.post("/settings/cpq", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") return res.status(400).json({ error: "enabled must be a boolean" });
  try {
    const orgId = req.orgId as number;
    const old = await getSetting(orgId, "cpq_enabled");
    await setSetting(orgId, "cpq_enabled", String(enabled));
    const { id, name } = getUser(req);
    await logAudit(orgId, "cpq_enabled", old, String(enabled), id, name);
    res.json({ enabled });
  } catch (err) {
    console.error("[CPQ settings]", err);
    res.status(500).json({ error: "Failed to update CPQ setting" });
  }
});

// GET /api/settings/cpq/pricing
router.get("/settings/cpq/pricing", async (req, res) => {
  try {
    const orgId = req.orgId as number;
    const [vt, at, pt] = await Promise.all([
      getSetting(orgId, "cpq_volume_tiers"),
      getSetting(orgId, "cpq_approval_thresholds"),
      getSetting(orgId, "cpq_partner_tiers"),
    ]);
    res.json({
      volumeTiers: vt ? JSON.parse(vt) : DEFAULT_VOLUME_TIERS,
      approvalThresholds: at ? JSON.parse(at) : DEFAULT_APPROVAL_THRESHOLDS,
      partnerTiers: pt ? JSON.parse(pt) : DEFAULT_PARTNER_TIERS,
    });
  } catch (err) {
    console.error("[CPQ pricing settings]", err);
    res.json({
      volumeTiers: DEFAULT_VOLUME_TIERS,
      approvalThresholds: DEFAULT_APPROVAL_THRESHOLDS,
      partnerTiers: DEFAULT_PARTNER_TIERS,
    });
  }
});

// POST /api/settings/cpq/pricing
router.post("/settings/cpq/pricing", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  const { volumeTiers, approvalThresholds, partnerTiers } = req.body;
  try {
    const orgId = req.orgId as number;
    const { id, name } = getUser(req);
    const tasks: Promise<void>[] = [];
    if (volumeTiers !== undefined) {
      const old = await getSetting(orgId, "cpq_volume_tiers");
      const newVal = JSON.stringify(volumeTiers);
      tasks.push(setSetting(orgId, "cpq_volume_tiers", newVal));
      tasks.push(logAudit(orgId, "cpq_volume_tiers", old, newVal, id, name));
    }
    if (approvalThresholds !== undefined) {
      const old = await getSetting(orgId, "cpq_approval_thresholds");
      const newVal = JSON.stringify(approvalThresholds);
      tasks.push(setSetting(orgId, "cpq_approval_thresholds", newVal));
      tasks.push(logAudit(orgId, "cpq_approval_thresholds", old, newVal, id, name));
    }
    if (partnerTiers !== undefined) {
      const old = await getSetting(orgId, "cpq_partner_tiers");
      const newVal = JSON.stringify(partnerTiers);
      tasks.push(setSetting(orgId, "cpq_partner_tiers", newVal));
      tasks.push(logAudit(orgId, "cpq_partner_tiers", old, newVal, id, name));
    }
    await Promise.all(tasks);
    res.json({ ok: true });
  } catch (err) {
    console.error("[CPQ pricing settings save]", err);
    res.status(500).json({ error: "Failed to save pricing settings" });
  }
});

// GET /api/settings/cpq/audit — returns recent change history
router.get("/settings/cpq/audit", async (req, res) => {
  if (!isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    await ensureAuditTable();
    const rows = await db.execute(sql`
      SELECT id, setting_key, old_value, new_value, changed_by_name, changed_at
      FROM cpq_settings_audit
      WHERE org_id = ${req.orgId}
      ORDER BY changed_at DESC
      LIMIT 50
    `);
    const list = ((rows as any).rows ?? rows) as any[];
    res.json({ entries: list });
  } catch (err) {
    console.error("[CPQ audit fetch]", err);
    res.json({ entries: [] });
  }
});

export default router;
