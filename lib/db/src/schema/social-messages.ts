import { pgTable, serial, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { leadsTable } from "./leads";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export type SocialPlatform = "linkedin" | "facebook" | "whatsapp" | "instagram";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export const socialMessagesTable = pgTable(
  "social_messages",
  {
    id: serial("id").primaryKey(),

    // CRM entity links
    leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "cascade" }),
    contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
    sentByUserId: integer("sent_by_user_id").references(() => usersTable.id, { onDelete: "set null" }),

    // Platform
    platform: text("platform").notNull(), // SocialPlatform
    direction: text("direction").notNull(), // MessageDirection

    // Message content
    content: text("content").notNull(),
    mediaUrl: text("media_url"),
    mediaType: text("media_type"), // image | video | document | audio

    // Sender info (for inbound messages from prospects)
    senderName: text("sender_name"),
    senderHandle: text("sender_handle"), // @username or profile URL
    senderAvatarUrl: text("sender_avatar_url"),

    // Platform identifiers
    platformMessageId: text("platform_message_id"),
    platformThreadId: text("platform_thread_id"),
    platformProfileUrl: text("platform_profile_url"),

    // Delivery state
    status: text("status").notNull().default("sent"), // MessageStatus
    isRead: boolean("is_read").notNull().default(false),
    deliveredAt: timestamp("delivered_at"),
    readAt: timestamp("read_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    leadIdx: index("sm_lead_id_idx").on(t.leadId),
    contactIdx: index("sm_contact_id_idx").on(t.contactId),
    platformIdx: index("sm_platform_idx").on(t.platform),
    createdIdx: index("sm_created_at_idx").on(t.createdAt),
  }),
);

export const insertSocialMessageSchema = createInsertSchema(socialMessagesTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export type InsertSocialMessage = z.infer<typeof insertSocialMessageSchema>;
export type SocialMessage = typeof socialMessagesTable.$inferSelect;
