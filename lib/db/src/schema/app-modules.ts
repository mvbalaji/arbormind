import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

// Natural-key PK (same caveat as screens/roles in access-control.ts) — global
// shared config, not per-tenant customizable. orgId added for DB accuracy only.
export const appModulesTable = pgTable("app_modules", {
  key: text("key").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isCore: boolean("is_core").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppModule = typeof appModulesTable.$inferSelect;
