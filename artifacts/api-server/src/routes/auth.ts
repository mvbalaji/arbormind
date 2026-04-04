import { Router } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { db } from "@workspace/db";
import { allowedUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAILS = [
  "balaji.venkateswaran@gmail.com",
  "parthasarathisoundarrajan@gmail.com",
];

function getCallbackUrl() {
  if (process.env.GOOGLE_CALLBACK_URL) return process.env.GOOGLE_CALLBACK_URL;
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
    const redirectTo = typeof req.query.redirect === "string" && req.query.redirect.startsWith("/") ? req.query.redirect : "/dashboard";
    req.session.returnTo = redirectTo;
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
    // Ensure session is saved before redirecting
    req.session.save((err) => {
      if (err) {
        console.error("[OAuth Callback] Session save failed:", err);
        res.redirect("/?error=session-save-failed");
        return;
      }
      const redirectTo = typeof req.session.returnTo === "string" && req.session.returnTo.startsWith("/") ? req.session.returnTo : "/dashboard";
      console.log("[OAuth Callback] Session saved successfully, redirecting to", redirectTo, { sessionId: req.session.id, userId: (req.user as any)?.id, headers: res.getHeaders() });
      delete req.session.returnTo;
      res.redirect(redirectTo);
    });
  }
);

router.get("/auth/me", (req, res) => {
  console.log("[Auth/Me] Request - session:", { sessionId: req.session?.id, cookie: req.headers.cookie?.substring(0, 100), isAuth: req.isAuthenticated?.(), user: !!(req.user) });
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    res.json({ user: req.user });
    return;
  }
  // When Google OAuth is not configured, return a dev-mode admin user
  // so the CRM remains accessible during development without credentials.
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    res.json({
      user: {
        id: 0,
        email: "dev@crmai.local",
        name: "Dev Admin",
        role: "admin",
        avatarUrl: null,
      },
    });
    return;
  }
  res.status(401).json({ user: null });
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
  if (u?.role !== "admin") {
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
  if (u?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { email, name, role } = req.body as { email: string; name?: string; role?: string };
  if (!email) {
    res.status(400).json({ error: "Email required" });
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

router.delete("/auth/users/:id", async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const u = req.user as { role?: string } | undefined;
  if (u?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id);
  try {
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
