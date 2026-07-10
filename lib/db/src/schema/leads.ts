import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { accountsTable } from "./accounts";
import { organizationsTable } from "./organizations";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  company: text("company"),
  title: text("title"),
  status: text("status").notNull().default("new"),
  source: text("source"),
  score: integer("score"),
  annualRevenue: numeric("annual_revenue", { precision: 15, scale: 2 }),
  employees: integer("employees"),
  industry: text("industry"),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  isConverted: boolean("is_converted").notNull().default(false),
  convertedContactId: integer("converted_contact_id").references(() => contactsTable.id),
  convertedAccountId: integer("converted_account_id").references(() => accountsTable.id),
  convertedOpportunityId: integer("converted_opportunity_id"),
  buyerClassification: text("buyer_classification"),
  insightsGeneratedAt: timestamp("insights_generated_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
