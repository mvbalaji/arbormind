import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailsTable = pgTable(
  "emails",
  {
    id: serial("id").primaryKey(),
    messageUid: text("message_uid"),
    // RFC 5322 Message-ID of this inbound message and the parent it replies to.
    // Used to thread replies back to the outbound activity that started the conversation.
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
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
    // Set the moment an automated reply is successfully dispatched. This is the canonical
    // "did we already auto-respond?" flag — independent of `status`, which an admin may
    // toggle back to "new" while triaging. Once set, it must NOT be cleared by admin flows,
    // so re-imports / UID changes / manual recreations cannot trigger a duplicate reply.
    autoRepliedAt: timestamp("auto_replied_at"),
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
