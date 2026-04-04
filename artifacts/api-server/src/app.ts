import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import pinoHttp from "pino-http";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";
import { setupPassport } from "./routes/auth";

setupPassport();

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  console.warn("[Auth] SESSION_SECRET not set — using insecure default for development only");
}
const sessionSecret = SESSION_SECRET || "crmai-dev-secret-change-in-production";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Detect if running in production
function isProductionMode() {
  return process.env.NODE_ENV === "production";
}

// Extract domain from Google callback URL or use REPLIT_DOMAINS
function getCookieDomain() {
  // Try to extract domain from Google callback URL
  if (process.env.GOOGLE_CALLBACK_URL) {
    try {
      const url = new URL(process.env.GOOGLE_CALLBACK_URL);
      return `.${url.hostname}`;
    } catch (e) {
      console.warn("[Session] Failed to parse GOOGLE_CALLBACK_URL");
    }
  }
  
  // Fallback to CUSTOM_DOMAIN
  if (process.env.CUSTOM_DOMAIN) return `.${process.env.CUSTOM_DOMAIN}`;
  
  return undefined;
}

const allowedOrigins: Set<string> = new Set(
  process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
    : []
);

// In production, also allow the domain from callback URL
const callbackDomain = getCookieDomain();
const inProduction = isProductionMode();

console.log("[Session] Production mode detected:", inProduction);
console.log("[Session] Cookie domain:", callbackDomain);
console.log("[Session] Cookie settings - secure:", inProduction, "sameSite:", inProduction ? "none" : "lax");

if (callbackDomain && process.env.GOOGLE_CALLBACK_URL) {
  try {
    const url = new URL(process.env.GOOGLE_CALLBACK_URL);
    allowedOrigins.add(`https://${url.hostname}`);
  } catch (e) {
    console.warn("[CORS] Failed to add callback domain");
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      if (process.env.NODE_ENV !== "production") { callback(null, true); return; }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        console.warn("[CORS] Blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: inProduction,
      sameSite: inProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: callbackDomain,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
const frontendPath = path.resolve(__dirname, "../../crmai/dist/public");
console.log("[Static] Serving frontend from:", frontendPath);
app.use(express.static(frontendPath));

// API routes
app.use("/api", router);

// SPA fallback: serve index.html for all non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  const indexPath = path.resolve(frontendPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("[SPA Fallback] Failed to serve index.html:", err);
      res.status(404).json({ error: "Not found" });
    }
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[Error Handler]", err);
  
  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    res.status(403).json({ error: "CORS not allowed" });
    return;
  }
  
  // Default error response
  res.status(err.statusCode || 500).json({
    error: err.message || "Internal server error",
  });
});

export default app;
