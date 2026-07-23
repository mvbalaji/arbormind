import { pgTable, serial, text, integer, timestamp, uniqueIndex, primaryKey, foreignKey } from "drizzle-orm/pg-core";

export const screensTable = pgTable("screens", {
  orgId: integer("org_id").notNull().default(1),
  key: text("key").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  sortOrder: integer("sort_order").notNull().default(100),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.key] }),
}));

export const rolesTable = pgTable("roles", {
  orgId: integer("org_id").notNull().default(1),
  key: text("key").notNull(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(100),
}, (t) => ({
  pk: primaryKey({ columns: [t.orgId, t.key] }),
}));

export const screenAccessTable = pgTable(
  "screen_access",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().default(1),
    screenKey: text("screen_key").notNull(),
    roleKey: text("role_key").notNull(),
    accessLevel: text("access_level").notNull().default("none"),
    updatedBy: integer("updated_by"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    screenRoleUnique: uniqueIndex("screen_access_screen_role_unique").on(t.orgId, t.screenKey, t.roleKey),
    screenFk: foreignKey({
      columns: [t.orgId, t.screenKey],
      foreignColumns: [screensTable.orgId, screensTable.key],
      name: "screen_access_screen_fk",
    }).onDelete("cascade"),
    roleFk: foreignKey({
      columns: [t.orgId, t.roleKey],
      foreignColumns: [rolesTable.orgId, rolesTable.key],
      name: "screen_access_role_fk",
    }).onDelete("cascade"),
  })
);

export const accessAuditLogTable = pgTable("access_audit_log", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
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
