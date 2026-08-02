import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { approvalRolesTable, approvalCriteriaTable } from "./approvals";
import { organizationsTable } from "./organizations";

export const approvalRequestsTable = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  entity: text("entity").notNull(),
  entityId: integer("entity_id").notNull(),
  status: text("status").notNull().default("open"),
  level: integer("level").notNull().default(1),
  roleId: integer("role_id").references(() => approvalRolesTable.id, { onDelete: "set null" }),
  criterionId: integer("criterion_id").references(() => approvalCriteriaTable.id, { onDelete: "set null" }),
  ruleKey: text("rule_key"),
  requestedBy: integer("requested_by").references(() => usersTable.id, { onDelete: "set null" }),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  decidedBy: integer("decided_by").references(() => usersTable.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("approval_requests_entity_idx").on(t.entity, t.entityId),
  statusIdx: index("approval_requests_status_idx").on(t.status),
}));

export const approvalAuditEventsTable = pgTable("approval_audit_events", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  requestId: integer("request_id").notNull().references(() => approvalRequestsTable.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  actorUserId: integer("actor_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  actorName: text("actor_name"),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  requestIdx: index("approval_audit_events_request_idx").on(t.requestId),
}));

export const insertApprovalRequestSchema = createInsertSchema(approvalRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalAuditEventSchema = createInsertSchema(approvalAuditEventsTable).omit({ id: true, createdAt: true });

export type ApprovalRequest = typeof approvalRequestsTable.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalAuditEvent = typeof approvalAuditEventsTable.$inferSelect;
export type InsertApprovalAuditEvent = z.infer<typeof insertApprovalAuditEventSchema>;
