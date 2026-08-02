import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

// Same caveat as screens/roles in access-control.ts: record_types/record_access
// are a single shared, global permission matrix (natural-key PK / uniqueness
// that doesn't include org_id). orgId added for DB accuracy only — excluded
// from tenant-scoped filtering and RLS.
export const recordTypesTable = pgTable("record_types", {
  key: text("key").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const recordAccessTable = pgTable(
  "record_access",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
    recordTypeKey: text("record_type_key").notNull().references(() => recordTypesTable.key, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull(),
    canView: boolean("can_view").notNull().default(false),
    canReadOnly: boolean("can_read_only").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    canCreate: boolean("can_create").notNull().default(false),
    canDelete: boolean("can_delete").notNull().default(false),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    recordTypeRoleUnique: uniqueIndex("record_access_type_role_unique").on(t.recordTypeKey, t.roleKey),
  })
);

// Genuinely per-tenant (audit trail of who changed access in which org) —
// normal serial PK, included in tenant scoping/RLS like any other table.
export const recordAccessAuditLogTable = pgTable("record_access_audit_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  recordTypeKey: text("record_type_key").notNull(),
  roleKey: text("role_key").notNull(),
  previousPermissions: jsonb("previous_permissions"),
  newPermissions: jsonb("new_permissions").notNull(),
  changedByUserId: integer("changed_by_user_id"),
  changedByName: text("changed_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type RecordType = typeof recordTypesTable.$inferSelect;
export type RecordAccess = typeof recordAccessTable.$inferSelect;
export type RecordAccessAuditLog = typeof recordAccessAuditLogTable.$inferSelect;

export const RECORD_PERMISSIONS = ["view", "read_only", "edit", "create", "delete"] as const;
export type RecordPermission = (typeof RECORD_PERMISSIONS)[number];
