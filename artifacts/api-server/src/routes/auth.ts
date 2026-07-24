import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { allowedUsersTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SessionData } from "express-session";

declare module "express-session" {
  interface SessionData {
    returnTo?: string;
    user?: {
      id: number;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
      username?: string;
      orgId?: number;
    };
    originalUser?: {
      id: number;
      email: string;
      name: string;
      role: string;
      avatarUrl: string | null;
    };
  }
}

const ADMIN_EMAILS = [
  "balaji.venkateswaran@gmail.com",
  "parthasarathisoundarrajan@gmail.com",
];

const DEMO_USERNAME = "demo@arbormind.in";
const DEMO_PASSWORD = "demo1234";

const FULL_ACCESS_ROLES = new Set(["admin", "super_admin"]);

function getCallbackUrl() {
  if (process.env.NODE_ENV === "production" && process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.CUSTOM_DOMAIN;
  if (domain) return `https://${domain}/api/auth/google/callback`;
  return "http://localhost:8080/api/auth/google/callback";
}

export function setupPassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("[Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth disabled");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: getCallbackUrl(),
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error("No email from Google"), undefined);

          const isAdmin = ADMIN_EMAILS.includes(email);

          let [user] = await db
            .select()
            .from(allowedUsersTable)
            .where(eq(allowedUsersTable.email, email));

          if (!user) {
            if (!isAdmin) return done(null, false);
            const [newUser] = await db
              .insert(allowedUsersTable)
              .values({
                email,
                name: profile.displayName,
                role: "admin",
                googleId: profile.id,
                avatarUrl: profile.photos?.[0]?.value,
                addedByEmail: "system",
              })
              .returning();
            user = newUser;
          } else {
            if (!user.isActive) return done(null, false);
            await db
              .update(allowedUsersTable)
              .set({
                googleId: profile.id,
                name: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(allowedUsersTable.email, email));
            user = { ...user, googleId: profile.id, name: profile.displayName, avatarUrl: profile.photos?.[0]?.value ?? null };
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name ?? profile.displayName,
            role: user.role,
            avatarUrl: user.avatarUrl ?? profile.photos?.[0]?.value ?? null,
          });
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, (user as any).id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      if (!id || typeof id !== 'number') {
        return done(null, false);
      }

      // Handle demo user (id: 1) without database lookup
      if (id === 1) {
        return done(null, {
          id: 1,
          email: DEMO_USERNAME,
          name: "Demo User",
          role: "admin",
          avatarUrl: null,
          username: DEMO_USERNAME,
        });
      }

      const [user] = await db
        .select()
        .from(allowedUsersTable)
        .where(eq(allowedUsersTable.id, id));
      
      if (!user) {
        return done(null, false);
      }
      
      const userData = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      };

      done(null, userData);
    } catch (err) {
      console.error("[Passport] Deserialize error:", err);
      done(null, false);
    }
  });
}

const router = Router();

router.get("/auth/google", (req, res, next) => {
  console.log("[Auth/Google] Endpoint hit - initiating OAuth flow");
  console.log("[Auth/Google] Callback URL will be:", getCallbackUrl());
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("[Auth/Google] Google OAuth not configured - missing CLIENT_ID or SECRET");
    res.status(503).json({ error: "Google OAuth not configured" });
    return;
  }
  try {
    console.log("[Auth/Google] Calling passport.authenticate");
    req.session.returnTo = typeof req.query.redirect === "string" && req.query.redirect.startsWith("/") ? req.query.redirect : "/dashboard";
    req.session.save(() => {
      passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
    });
  } catch (err) {
    console.error("[Auth/Google] Passport error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    console.log("[OAuth Callback] Hit - session exists:", !!req.session?.id, "cookies:", req.headers.cookie);
    passport.authenticate("google", { failureRedirect: "/?error=unauthorized" })(req, res, next);
  },
  (req, res) => {
    console.log("[OAuth Callback] After authenticate - user:", !!req.user, "req.isAuthenticated:", req.isAuthenticated?.());
    console.log("[OAuth Callback] Session before save:", { sessionId: req.session.id, userId: (req.user as any)?.id });
    req.session.save((err) => {
      if (err) {
        console.error("[OAuth Callback] Session save failed:", err);
        res.redirect("/?error=session-save-failed");
        return;
      }
      const redirectTo = typeof req.session.returnTo === "string" && req.session.returnTo.startsWith("/") ? req.session.returnTo : "/dashboard";
      const finalRedirect = redirectTo === "/" ? "/dashboard" : redirectTo;
      console.log("[OAuth Callback] Session saved successfully, redirecting to", finalRedirect, { sessionId: req.session.id, userId: (req.user as any)?.id, headers: res.getHeaders() });
      delete req.session.returnTo;
      res.redirect(finalRedirect);
    });
  }
);

router.get("/auth/me", async (req, res) => {
  const isAuth = req.isAuthenticated?.();
  const hasUser = !!(req.user);
  const sessionUser = !!(req.session?.user);
  console.log("[Auth/Me] Request - session:", { sessionId: req.session?.id, cookie: req.headers.cookie?.substring(0, 100), isAuth, hasUser, sessionUser, user: req.session?.user?.email || req.user || "none" });

  let userData: { role?: string; [k: string]: unknown } | null = null;
  if ((isAuth && req.user) || req.session?.user) {
    userData = (req.user || req.session.user) as { role?: string; [k: string]: unknown };
  } else if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    userData = {
      id: 0,
      email: "dev@crmai.local",
      name: "Dev Admin",
      role: "admin",
      avatarUrl: null,
      orgId: 1,
    };
  }

  if (!userData) {
    res.status(401).json({ user: null });
    return;
  }

  const impersonation = req.session?.originalUser
    ? {
        isImpersonating: true,
        originalUser: {
          id: req.session.originalUser.id,
          email: req.session.originalUser.email,
          name: req.session.originalUser.name,
          role: req.session.originalUser.role,
        },
      }
    : { isImpersonating: false };

  try {
    const { getScreenAccessForRole } = await import("../lib/access-control");
    const { getEnabledModules } = await import("../lib/app-modules");
    const [screenAccess, enabledModules] = await Promise.all([
      getScreenAccessForRole(userData.role ?? ""),
      getEnabledModules(),
    ]);
    res.json({ user: { ...userData, screenAccess, enabledModules, ...impersonation } });
  } catch {
    res.json({ user: { ...userData, ...impersonation } });
  }
});

/* ============================================================
 * IMPERSONATION — admin/super_admin "Login as" any user.
 * ============================================================ */

router.post("/auth/impersonate", async (req, res) => {
  const actor = (req.session?.originalUser ?? req.session?.user ?? req.user) as
    | { id: number; email: string; name: string; role: string; avatarUrl: string | null }
    | undefined;

  if (!actor) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!FULL_ACCESS_ROLES.has(actor.role)) {
    res.status(403).json({ error: "Only administrators can impersonate users" });
    return;
  }

  const { userId, email } = req.body as { userId?: number; email?: string };
  const targetId = userId != null ? Number(userId) : null;
  const targetEmail = typeof email === "string" ? email.trim().toLowerCase() : null;

  if ((!targetId || Number.isNaN(targetId)) && !targetEmail) {
    res.status(400).json({ error: "userId or email is required" });
    return;
  }

  try {
    type TargetShape = { id: number; email: string; name: string | null; role: string; avatarUrl: string | null; isActive: boolean };
    let target: TargetShape | undefined;

    if (targetId && !Number.isNaN(targetId)) {
      const [row] = await db.select().from(allowedUsersTable).where(eq(allowedUsersTable.id, targetId));
      if (row) target = { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatarUrl, isActive: row.isActive };
    }
    if (!target && targetEmail) {
      const [row] = await db.select().from(allowedUsersTable).where(eq(allowedUsersTable.email, targetEmail));
      if (row) target = { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatarUrl, isActive: row.isActive };
    }
    // Fallback: impersonate a CRM team member directly from the users table
    if (!target && targetEmail) {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.email, targetEmail));
      if (row) target = { id: row.id, email: row.email, name: row.name, role: row.role, avatarUrl: row.avatarUrl, isActive: row.isActive };
    }

    if (!target) {
      res.status(404).json({
        error: targetEmail
          ? `${targetEmail} was not found in app access or CRM team members.`
          : "User not found",
      });
      return;
    }
    if (!target.isActive) {
      res.status(400).json({ error: "That user is inactive." });
      return;
    }
    if (target.email === actor.email) {
      res.status(400).json({ error: "You are already this user" });
      return;
    }

    const originalUser = {
      id: actor.id,
      email: actor.email,
      name: actor.name,
      role: actor.role,
      avatarUrl: actor.avatarUrl ?? null,
    };

    const impersonated = {
      id: target.id,
      email: target.email,
      name: target.name ?? target.email,
      role: target.role,
      avatarUrl: target.avatarUrl ?? null,
    };

    req.session.originalUser = originalUser;
    req.session.user = impersonated;
    (req as unknown as { user: typeof impersonated }).user = impersonated;

    console.log(
      `[Impersonate] ${originalUser.email} (${originalUser.role}) -> ${impersonated.email} (${impersonated.role})`,
    );

    req.session.save((err) => {
      if (err) {
        res.status(500).json({ error: "Failed to start impersonation" });
        return;
      }
      res.json({ user: impersonated, originalUser, isImpersonating: true });
    });
  } catch (err) {
    console.error("[Impersonate] error:", err);
    res.status(500).json({ error: "Impersonation failed" });
  }
});

router.post("/auth/stop-impersonating", (req, res) => {
  const original = req.session?.originalUser;
  if (!original) {
    res.status(400).json({ error: "Not currently impersonating" });
    return;
  }
  const restored = { ...original, username: original.email };
  req.session.user = restored;
  (req as unknown as { user: typeof restored }).user = restored;
  delete req.session.originalUser;
  console.log(`[Impersonate] Restored to ${restored.email}`);
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Failed to stop impersonation" });
      return;
    }
    res.json({ user: restored, isImpersonating: false });
  });
});

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (username === DEMO_USERNAME && password === DEMO_PASSWORD) {
    const user = {
      id: 1,
      email: DEMO_USERNAME,
      name: "Demo User",
      role: "admin",
      avatarUrl: null,
      username: DEMO_USERNAME,
      orgId: 1,
    };
    req.session.user = user;
    (req as any).user = user;
    console.log("[Auth/Login] Session user set:", req.session.id, user.email);
    req.session.save((err) => {
      if (err) {
        console.error("[Auth/Login] Session save failed:", err);
        res.status(500).json({ error: "Login failed" });
        return;
      }
      console.log("[Auth/Login] Session saved successfully:", req.session.id);
      res.json({ user });
    });
    return;
  }
  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
});

router.get("/auth/users", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const u = req.user as { role?: string } | undefined;
  if (!FULL_ACCESS_ROLES.has(u?.role ?? "")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const users = await db.select().from(allowedUsersTable).orderBy(allowedUsersTable.createdAt);
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/auth/users", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const u = req.user as { role?: string; email?: string } | undefined;
  if (!FULL_ACCESS_ROLES.has(u?.role ?? "")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { email, name, role } = req.body as { email: string; name?: string; role?: string };
  if (!email) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  // Only super_admin can create another super_admin
  if (role === "super_admin" && u?.role !== "super_admin") {
    res.status(403).json({ error: "Only Super Administrators can create Super Admin users." });
    return;
  }

  try {
    const [user] = await db
      .insert(allowedUsersTable)
      .values({
        email: email.toLowerCase().trim(),
        name: name || null,
        role: role || "sales",
        addedByEmail: u?.email ?? "admin",
      })
      .onConflictDoUpdate({
        target: allowedUsersTable.email,
        set: { isActive: true, role: role || "sales", updatedAt: new Date() },
      })
      .returning();
    res.status(201).json({ user });
  } catch {
    res.status(500).json({ error: "Failed to add user" });
  }
});

// Update user details (name, role, isActive)
router.put("/auth/users/:id", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const actor = req.user as { role?: string; email?: string; id?: number } | undefined;
  if (!FULL_ACCESS_ROLES.has(actor?.role ?? "")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  try {
    const [existing] = await db.select().from(allowedUsersTable).where(eq(allowedUsersTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Protect super_admin users — only super_admin can modify them
    if (existing.role === "super_admin" && actor?.role !== "super_admin") {
      res.status(403).json({ error: "Only Super Administrators can modify Super Admin users." });
      return;
    }

    // Admin cannot promote someone to super_admin
    const { name, role, isActive } = req.body as { name?: string; role?: string; isActive?: boolean };
    if (role === "super_admin" && actor?.role !== "super_admin") {
      res.status(403).json({ error: "Only Super Administrators can assign the Super Admin role." });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db
      .update(allowedUsersTable)
      .set(updates)
      .where(eq(allowedUsersTable.id, id))
      .returning();

    res.json({ user: updated });
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/auth/users/:id", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const actor = req.user as { role?: string; id?: number } | undefined;
  if (!FULL_ACCESS_ROLES.has(actor?.role ?? "")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id);
  try {
    const [existing] = await db.select().from(allowedUsersTable).where(eq(allowedUsersTable.id, id));
    if (existing?.role === "super_admin" && actor?.role !== "super_admin") {
      res.status(403).json({ error: "Only Super Administrators can remove Super Admin users." });
      return;
    }

    await db
      .update(allowedUsersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(allowedUsersTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to remove user" });
  }
});

export default router;
