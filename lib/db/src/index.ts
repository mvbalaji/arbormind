import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Idle clients emit 'error' on connection loss (e.g. a transient DNS blip). Without
// a listener here, that's an unhandled event and Node crashes the whole process —
// a single flaky network moment shouldn't take down the server.
pool.on("error", (err) => {
  console.error("[DB] Idle client error (connection will be replaced):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
