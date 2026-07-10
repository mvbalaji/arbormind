import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organizationsTable, allowedUsersTable } from "@workspace/db";
import { eq, and, or, inArray } from "drizzle-orm";
import { getOrgId } from "../lib/org-context";

const router: IRouter = Router();

interface SessionUser { role?: string; orgId?: number }

function getUser(req: any): SessionUser | undefined {
  return (req.session?.user ?? req.user) as SessionUser | undefined;
}

function requireAuth(req: any, res: any): SessionUser | null {
  const user = getUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}

function requireOrgAdmin(req: any, res: any): SessionUser | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "admin" && user.role !== "super_admin") {
    res.status(403).json({ error: "Only organization administrators can do this" });
    return null;
  }
  return user;
}

function requireSuperAdmin(req: any, res: any): SessionUser | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== "super_admin") {
    res.status(403).json({ error: "Only Super Administrators can manage organizations" });
    return null;
  }
  return user;
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";
}

const ADMIN_ROLES = ["admin", "super_admin"];

/* ============================================================
 * Self-service — any org member can read their own org's name;
 * an org admin (or super_admin) can rename it. No cross-org access.
 * ========================================================== */

router.get("/organizations/current", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const orgId = getOrgId(req);
    const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, orgId));
    if (!org) { res.status(404).json({ error: "Organization not found" }); return; }
    res.json({ organization: org });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch organization" });
  }
});

router.put("/organizations/current", async (req, res) => {
  if (!requireOrgAdmin(req, res)) return;
  try {
    const orgId = getOrgId(req);
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [org] = await db.update(organizationsTable)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(organizationsTable.id, orgId))
      .returning();
    if (!org) { res.status(404).json({ error: "Organization not found" }); return; }
    res.json({ organization: org });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

/* ============================================================
 * Super-admin — maintains every org and their admins across the
 * whole platform. This is the one place cross-tenant reads/writes
 * are intentional: managing tenants is inherently platform-level.
 * ========================================================== */

// GET /api/admin/organizations — list every org, each with its admin users
router.get("/admin/organizations", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const orgs = await db.select().from(organizationsTable).orderBy(organizationsTable.createdAt);
    const orgIds = orgs.map((o) => o.id);
    const admins = orgIds.length > 0
      ? await db.select({
          id: allowedUsersTable.id,
          orgId: allowedUsersTable.orgId,
          email: allowedUsersTable.email,
          name: allowedUsersTable.name,
          role: allowedUsersTable.role,
          isActive: allowedUsersTable.isActive,
        }).from(allowedUsersTable).where(and(inArray(allowedUsersTable.orgId, orgIds), or(...ADMIN_ROLES.map((r) => eq(allowedUsersTable.role, r)))))
      : [];
    const adminsByOrg = new Map<number, typeof admins>();
    for (const a of admins) {
      if (!adminsByOrg.has(a.orgId)) adminsByOrg.set(a.orgId, []);
      adminsByOrg.get(a.orgId)!.push(a);
    }
    res.json({ organizations: orgs.map((o) => ({ ...o, admins: adminsByOrg.get(o.id) ?? [] })) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// POST /api/admin/organizations — create a new org, optionally seeding its first admin.
// This is the only way today to get a second tenant — there is no self-serve signup.
router.post("/admin/organizations", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const { name, adminEmail, adminName } = req.body as { name?: string; adminEmail?: string; adminName?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    let slug = slugify(name);
    const [existing] = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [org] = await db.insert(organizationsTable).values({ name: name.trim(), slug }).returning();

    let admin = null;
    if (adminEmail && adminEmail.trim()) {
      const [row] = await db
        .insert(allowedUsersTable)
        .values({
          email: adminEmail.toLowerCase().trim(),
          name: adminName || null,
          role: "admin",
          addedByEmail: "system",
          orgId: org.id,
        })
        .returning();
      admin = row;
    }

    res.status(201).json({ organization: org, admin });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create organization" });
  }
});

// PUT /api/admin/organizations/:id — rename any org
router.put("/admin/organizations/:id", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid organization id" }); return; }
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [org] = await db.update(organizationsTable)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(organizationsTable.id, id))
      .returning();
    if (!org) { res.status(404).json({ error: "Organization not found" }); return; }
    res.json({ organization: org });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update organization" });
  }
});

// GET /api/admin/organizations/:id/admins — list admins of a specific org
router.get("/admin/organizations/:id/admins", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid organization id" }); return; }
    const admins = await db.select().from(allowedUsersTable)
      .where(and(eq(allowedUsersTable.orgId, id), or(...ADMIN_ROLES.map((r) => eq(allowedUsersTable.role, r)))))
      .orderBy(allowedUsersTable.createdAt);
    res.json({ admins });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// POST /api/admin/organizations/:id/admins — add an admin to a specific org
router.post("/admin/organizations/:id/admins", async (req, res) => {
  if (!requireSuperAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid organization id" }); return; }
    const [org] = await db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.id, id));
    if (!org) { res.status(404).json({ error: "Organization not found" }); return; }

    const { email, name } = req.body as { email?: string; name?: string };
    if (!email || !email.trim()) {
      res.status(400).json({ error: "email is required" });
      return;
    }

    const [admin] = await db
      .insert(allowedUsersTable)
      .values({
        email: email.toLowerCase().trim(),
        name: name || null,
        role: "admin",
        addedByEmail: "system",
        orgId: id,
      })
      .onConflictDoUpdate({
        target: allowedUsersTable.email,
        set: { role: "admin", orgId: id, isActive: true, updatedAt: new Date() },
      })
      .returning();

    res.status(201).json({ admin });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to add admin" });
  }
});

export default router;
