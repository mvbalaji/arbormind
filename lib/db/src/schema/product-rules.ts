import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const productRulesTable = pgTable("product_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // Validation | Selection | Alert | Filter
  scope: text("scope").notNull().default("Product"), // Product | Quote | Bundle
  conditionsMet: text("conditions_met").notNull().default("All"), // All | Any | Custom
  conditions: text("conditions").notNull().default("[]"), // JSON array of condition objects
  actions: text("actions").notNull().default("[]"), // JSON array of action objects
  errorMessage: text("error_message"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProductRule = typeof productRulesTable.$inferSelect;
export type InsertProductRule = typeof productRulesTable.$inferInsert;
