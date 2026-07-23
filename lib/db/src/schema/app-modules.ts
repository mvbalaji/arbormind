import { pgTable, text, boolean, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const appModulesTable = pgTable("app_modules", {
  orgId: integer("org_id").notNull().default(1),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isCore: boolean("is_core").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.key] }),
}));

export type AppModule = typeof appModulesTable.$inferSelect;
