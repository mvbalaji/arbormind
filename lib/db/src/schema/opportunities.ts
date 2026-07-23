import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";
import { contactsTable } from "./contacts";
import { priceBooksTable } from "./price-books";

export const opportunitiesTable = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  name: text("name").notNull(),
  accountId: integer("account_id").references(() => accountsTable.id),
  contactId: integer("contact_id").references(() => contactsTable.id),
  stage: text("stage").notNull().default("prospecting"),
  amount: numeric("amount", { precision: 15, scale: 2 }),
  probability: integer("probability"),
  closeDate: timestamp("close_date"),
  description: text("description"),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  leadSource: text("lead_source"),
  nextStep: text("next_step"),
  forecastCategory: text("forecast_category"),
  teamMembers: text("team_members"),
  priceBookId: integer("price_book_id").references(() => priceBooksTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOpportunitySchema = createInsertSchema(opportunitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type Opportunity = typeof opportunitiesTable.$inferSelect;
