import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

// screens/roles/screen_access are a single shared, global RBAC config (not
// per-tenant customizable — `screens`/`roles` are keyed by a fixed natural
// key, and `screen_access`'s uniqueness constraint doesn't include org_id).
// orgId is present here only so the TS schema matches the live DB column;
// these tables are intentionally excluded from tenant-scoped query filtering
// and RLS elsewhere in the app.
export const screensTable = pgTable("screens", {
  key: text("key").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const rolesTable = pgTable("roles", {
  key: text("key").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const screenAccessTable = pgTable(
  "screen_access",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
    screenKey: text("screen_key").notNull().references(() => screensTable.key, { onDelete: "cascade" }),
    roleKey: text("role_key").notNull().references(() => rolesTable.key, { onDelete: "cascade" }),
    accessLevel: text("access_level").notNull().default("none"),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    screenRoleUnique: uniqueIndex("screen_access_screen_role_unique").on(t.screenKey, t.roleKey),
  })
);

// access_audit_log genuinely is per-tenant (who changed access in which org) —
// normal serial PK, included in Phase 3/4 tenant scoping like any other table.
export const accessAuditLogTable = pgTable("access_audit_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  screenKey: text("screen_key").notNull(),
  roleKey: text("role_key").notNull(),
  previousLevel: text("previous_level"),
  newLevel: text("new_level").notNull(),
  changedByUserId: integer("changed_by_user_id"),
  changedByName: text("changed_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Screen = typeof screensTable.$inferSelect;
export type Role = typeof rolesTable.$inferSelect;
export type ScreenAccess = typeof screenAccessTable.$inferSelect;
export type AccessAuditLog = typeof accessAuditLogTable.$inferSelect;

export const ACCESS_LEVELS = ["none", "view", "read_only", "edit"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];
