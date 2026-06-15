import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";

export const leadScoringRulesTable = pgTable("lead_scoring_rules", {
  id: serial("id").primaryKey(),
  ruleType: text("rule_type").notNull(),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  points: integer("points").notNull().default(0),
  params: jsonb("params"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LeadScoringRule = typeof leadScoringRulesTable.$inferSelect;
export type InsertLeadScoringRule = typeof leadScoringRulesTable.$inferInsert;
