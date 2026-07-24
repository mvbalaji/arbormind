import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const appModulesTable = pgTable("app_modules", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  isEnabled: boolean("is_enabled").notNull().default(true),
  isCore: boolean("is_core").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(100),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AppModule = typeof appModulesTable.$inferSelect;
