import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const allowedUsersTable = pgTable("allowed_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: text("role").notNull().default("sales"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  addedByEmail: text("added_by_email"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type AllowedUser = typeof allowedUsersTable.$inferSelect;
export type InsertAllowedUser = typeof allowedUsersTable.$inferInsert;
