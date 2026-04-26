import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailsTable = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    messageUid: text("message_uid"),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    bodyHtml: text("body_html"),
    status: text("status").notNull().default("new"), // new, replied, assigned
    relatedContactId: integer("related_contact_id"),
    relatedLeadId: integer("related_lead_id"),
    relatedOpportunityId: integer("related_opportunity_id"),
    isKnownCustomer: text("is_known_customer").notNull().default("false"), // true or false as string
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    messageUidUnique: uniqueIndex("emails_message_uid_unique").on(table.messageUid),
  }),
);

export const insertEmailSchema = createInsertSchema(emailsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEmail = z.infer<typeof insertEmailSchema>;
export type Email = typeof emailsTable.$inferSelect;
