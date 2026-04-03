import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import pinoHttp from "pino-http";
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

const allowedOrigins: Set<string> = new Set(
  process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(",").map((d) => `https://${d.trim()}`)
    : []
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) { callback(null, true); return; }
      if (process.env.NODE_ENV !== "production") { callback(null, true); return; }
      if (allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
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
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // In production, explicitly set domain for cross-subdomain cookies
      domain: process.env.NODE_ENV === "production" ? (process.env.CUSTOM_DOMAIN ? `.${process.env.CUSTOM_DOMAIN}` : undefined) : undefined,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

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
