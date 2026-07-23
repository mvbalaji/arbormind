import { pgTable, serial, text, boolean, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const approvalRolesTable = pgTable("approval_roles", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  name: text("name").notNull(),
  level: integer("level").notNull().default(1),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  nameIdx: uniqueIndex("approval_roles_name_idx").on(t.orgId, t.name),
}));

export const approvalConfigsTable = pgTable("approval_configs", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  entity: text("entity").notNull(),
  multiLevel: boolean("multi_level").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  entityIdx: uniqueIndex("approval_configs_entity_idx").on(t.orgId, t.entity),
}));

export const approvalCriteriaTable = pgTable("approval_criteria", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
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
