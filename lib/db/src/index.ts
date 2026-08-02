import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Owner connection: full table-owner privileges, bypasses Row-Level Security by
// default. Used directly by migrations, the seed script, and background jobs
// (email poller, auto-reply) that legitimately need cross-tenant reach. Every
// route file's `db`/`pool` import (below) transparently swaps to the per-request
// RLS-enforced connection when one is active for the current request — these
// owner instances are the fallback for everything else.
export const ownerPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Idle clients emit 'error' on connection loss (e.g. a transient DNS blip). Without
// a listener here, that's an unhandled event and Node crashes the whole process —
// a single flaky network moment shouldn't take down the server.
ownerPool.on("error", (err) => {
  console.error("[DB] Idle client error (connection will be replaced):", err.message);
});

const ownerDb = drizzle(ownerPool, { schema });

// Per-request, RLS-enforced connection. Connects as `app_runtime` — a plain,
// non-owner Postgres role with no BYPASSRLS — so Postgres actually enforces the
// tenant_isolation policies (see routes/index.ts's RLS migration block)
// independent of whether application code remembered to filter by org_id.
// `app.current_org_id` is set on the leased connection by the org-scoping
// middleware in app.ts before any query runs. APP_DATABASE_URL is optional so
// environments that haven't provisioned the role yet keep working unchanged
// (every request simply falls back to the owner connection below).
export const runtimePool = process.env.APP_DATABASE_URL
  ? new Pool({
      connectionString: process.env.APP_DATABASE_URL,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    })
  : null;

runtimePool?.on("error", (err) => {
  console.error("[DB] app_runtime idle client error (connection will be replaced):", err.message);
});

export interface RequestDbContext {
  client: pg.PoolClient;
  db: NodePgDatabase<typeof schema>;
}

// Populated for the lifetime of a single request by app.ts's org-scoping
// middleware, via requestDbContext.run(bindRequestClient(client), next).
export const requestDbContext = new AsyncLocalStorage<RequestDbContext>();

export function bindRequestClient(client: pg.PoolClient): RequestDbContext {
  return { client, db: drizzle(client, { schema }) };
}

// Every route file imports `db` exactly as before — no per-file changes needed.
// Outside a request (migrations, seed script, background jobs) or when no
// app_runtime context is active for this request (public/unauthenticated
// endpoints, dev bypass without APP_DATABASE_URL configured), reads/writes
// transparently fall through to the owner connection, matching today's
// behavior exactly.
export const db = new Proxy(ownerDb, {
  get(target, prop, receiver) {
    const ctx = requestDbContext.getStore();
    const active = ctx ? ctx.db : target;
    return Reflect.get(active as object, prop, active);
  },
}) as unknown as NodePgDatabase<typeof schema>;

// Some routes talk to Postgres directly via `pool.query(...)` / `pool.connect()`
// (raw SQL not expressed through Drizzle). Mirror the same transparent swap here.
// `.connect()` is special-cased: within a request context there is already
// exactly one leased, RLS-configured client for the whole request (so a
// multi-statement "transaction" via connect()/BEGIN/COMMIT/release() reuses it
// instead of grabbing a second, unconfigured connection) — release() is a no-op
// since the middleware owns this client's real lifecycle.
export const pool = new Proxy(ownerPool, {
  get(target, prop, receiver) {
    const ctx = requestDbContext.getStore();
    if (!ctx) return Reflect.get(target, prop, receiver);
    if (prop === "connect") {
      return async () => ({
        query: ctx.client.query.bind(ctx.client),
        release: () => {},
      });
    }
    return Reflect.get(ctx.client as object, prop, ctx.client);
  },
}) as unknown as pg.Pool;

export * from "./schema";
