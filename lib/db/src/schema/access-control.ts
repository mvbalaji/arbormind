import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const screensTable = pgTable("screens", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const rolesTable = pgTable("roles", {
  key: text("key").primaryKey(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(100),
});

export const screenAccessTable = pgTable(
  "screen_access",
  {
    id: serial("id").primaryKey(),
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

export const accessAuditLogTable = pgTable("access_audit_log", {
  id: serial("id").primaryKey(),
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
