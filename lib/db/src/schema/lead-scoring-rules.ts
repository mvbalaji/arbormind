import { pgTable, serial, text, integer, boolean, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const leadScoringRulesTable = pgTable("lead_scoring_rules", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  ruleType: text("rule_type").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  points: integer("points").notNull().default(0),
  params: jsonb("params"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Widened from a global-unique key to per-org, so each tenant can define its own rule keys.
  orgKeyUnique: uniqueIndex("lead_scoring_rules_org_key_unique").on(t.orgId, t.key),
}));

export type LeadScoringRule = typeof leadScoringRulesTable.$inferSelect;
export type InsertLeadScoringRule = typeof leadScoringRulesTable.$inferInsert;
