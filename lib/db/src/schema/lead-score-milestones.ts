import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const leadScoreMilestonesTable = pgTable("lead_score_milestones", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  label: text("label").notNull(),
  minScore: integer("min_score").notNull(),
  maxScore: integer("max_score").notNull(),
  color: text("color").notNull().default("gray"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LeadScoreMilestone = typeof leadScoreMilestonesTable.$inferSelect;
export type InsertLeadScoreMilestone = typeof leadScoreMilestonesTable.$inferInsert;
