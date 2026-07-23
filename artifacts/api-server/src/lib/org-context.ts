import type { Request } from "express";
import { db, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      /** Resolved once per request by the org-context middleware in app.ts. */
      orgId?: number;
    }
  }
}

interface SessionLike {
  session?: { user?: { orgId?: number } };
  user?: { orgId?: number };
}

/** Pull the current request's org id from the session (or Passport `req.user` fallback). */
export function getOrgId(req: Request): number {
  const s = req as unknown as SessionLike;
  const orgId = s.session?.user?.orgId ?? s.user?.orgId;
  if (!orgId) {
    throw new Error("No organization context on this request — user is not associated with an organization.");
  }
  return orgId;
}

let cachedDefaultOrgId: number | null = null;

/** The "Default Organization" every pre-multitenancy row was backfilled into.
 *  Used for the demo login and the dev-mode auto-user, which don't have a real
 *  allowed_users row to read orgId from. */
export async function getDefaultOrgId(): Promise<number> {
  if (cachedDefaultOrgId !== null) return cachedDefaultOrgId;
  const [row] = await db.select({ id: organizationsTable.id }).from(organizationsTable).where(eq(organizationsTable.slug, "default"));
  if (!row) throw new Error("Default Organization not found — run the org migration first.");
  cachedDefaultOrgId = row.id;
  return row.id;
}

/** Non-throwing variant used by the app-wide middleware: resolves the session's
 *  orgId if present, otherwise falls back to the Default Organization only when
 *  Google OAuth isn't configured (dev-mode bypass, matching /auth/me). Leaves
 *  req.orgId undefined for genuinely unauthenticated requests so public routes
 *  (health check, static assets, login) aren't forced through a DB lookup. */
export async function resolveOrgId(req: Request): Promise<number | undefined> {
  const s = req as unknown as SessionLike;
  const sessionOrgId = s.session?.user?.orgId ?? s.user?.orgId;
  if (sessionOrgId != null) return sessionOrgId;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    try {
      return await getDefaultOrgId();
    } catch (err) {
      console.error("[OrgContext] Failed to resolve default org:", err);
    }
  }
  return undefined;
}
