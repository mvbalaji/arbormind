import { pgTable, serial, text, boolean, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const approvalRolesTable = pgTable("approval_roles", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Widened from a global-unique name to per-org: each org can define its own
  // set of approval role names without colliding with another tenant's.
  nameIdx: uniqueIndex("approval_roles_name_idx").on(t.orgId, t.name),
}));

export const approvalConfigsTable = pgTable("approval_configs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  entity: text("entity").notNull(),
  multiLevel: boolean("multi_level").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Same widening: one approval config per (org, entity) instead of globally
  // one config per entity, so each tenant can configure approvals independently.
  entityIdx: uniqueIndex("approval_configs_entity_idx").on(t.orgId, t.entity),
}));

export const approvalCriteriaTable = pgTable("approval_criteria", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  entity: text("entity").notNull(),
  name: text("name").notNull(),
  field: text("field").notNull(),
  operator: text("operator").notNull(),
  threshold: numeric("threshold", { precision: 18, scale: 4 }),
  thresholdText: text("threshold_text"),
  level: integer("level").notNull().default(1),
  roleId: integer("role_id").references(() => approvalRolesTable.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertApprovalRoleSchema = createInsertSchema(approvalRolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalConfigSchema = createInsertSchema(approvalConfigsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalCriterionSchema = createInsertSchema(approvalCriteriaTable).omit({ id: true, createdAt: true, updatedAt: true });

export type ApprovalRole = typeof approvalRolesTable.$inferSelect;
export type InsertApprovalRole = z.infer<typeof insertApprovalRoleSchema>;
export type ApprovalConfig = typeof approvalConfigsTable.$inferSelect;
export type InsertApprovalConfig = z.infer<typeof insertApprovalConfigSchema>;
export type ApprovalCriterion = typeof approvalCriteriaTable.$inferSelect;
export type InsertApprovalCriterion = z.infer<typeof insertApprovalCriterionSchema>;
