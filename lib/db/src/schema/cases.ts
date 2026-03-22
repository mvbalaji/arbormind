import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { accountsTable } from "./accounts";

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").notNull().default("new"),
  priority: text("priority").notNull().default("medium"),
  type: text("type"),
  origin: text("origin"),
  contactId: integer("contact_id").references(() => contactsTable.id),
  accountId: integer("account_id").references(() => accountsTable.id),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
