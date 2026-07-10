import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const accountsTable = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  country: text("country"),
  employees: integer("employees"),
  annualRevenue: numeric("annual_revenue", { precision: 15, scale: 2 }),
  description: text("description"),
  status: text("status").default("active"),
  stage: text("stage"),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  closeDate: text("close_date"),
  probability: integer("probability"),
  forecastCategory: text("forecast_category"),
  nextStep: text("next_step"),
  optyOwner: text("opty_owner"),
  optyTeam: text("opty_team"),
  clmEnabled: boolean("clm_enabled").notNull().default(false),
  ownerId: integer("owner_id").references(() => usersTable.id),
  createdBy: integer("created_by").references(() => usersTable.id),
  modifiedBy: integer("modified_by").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
