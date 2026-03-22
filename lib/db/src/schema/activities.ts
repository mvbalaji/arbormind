import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { accountsTable } from "./accounts";
import { opportunitiesTable } from "./opportunities";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").notNull().default("planned"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  contactId: integer("contact_id").references(() => contactsTable.id),
  opportunityId: integer("opportunity_id").references(() => opportunitiesTable.id),
  accountId: integer("account_id").references(() => accountsTable.id),
  assignedTo: integer("assigned_to").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
