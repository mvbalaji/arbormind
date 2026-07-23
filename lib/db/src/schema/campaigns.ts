import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  name: text("name").notNull(),
  type: text("type").notNull().default("email"),
  status: text("status").notNull().default("planning"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: numeric("budget", { precision: 15, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),
  expectedRevenue: numeric("expected_revenue", { precision: 15, scale: 2 }),
  description: text("description"),
  targetAudience: text("target_audience"),
  channels: text("channels"),
  teamMembers: text("team_members"),
  goals: text("goals"),
  launchedAt: timestamp("launched_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
