import { pgTable, serial, text, integer, boolean, timestamp, jsonb, uniqueIndex, primaryKey, foreignKey } from "drizzle-orm/pg-core";

export const recordTypesTable = pgTable("record_types", {
  orgId: integer("org_id").notNull().default(1),
  key: text("key").notNull(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(100),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.key] }),
}));

export const recordAccessTable = pgTable(
  "record_access",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().default(1),
    recordTypeKey: text("record_type_key").notNull(),
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
    recordTypeRoleUnique: uniqueIndex("record_access_type_role_unique").on(t.orgId, t.recordTypeKey, t.roleKey),
    recordTypeFk: foreignKey({
      columns: [t.orgId, t.recordTypeKey],
      foreignColumns: [recordTypesTable.orgId, recordTypesTable.key],
      name: "record_access_type_fk",
    }).onDelete("cascade"),
  })
);

export const recordAccessAuditLogTable = pgTable("record_access_audit_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
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
