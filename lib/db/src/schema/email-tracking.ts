import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { activitiesTable } from "./activities";
import { organizationsTable } from "./organizations";

export const emailTrackingTable = pgTable(
  "email_tracking",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
    activityId: integer("activity_id").notNull().references(() => activitiesTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    // RFC 5322 Message-ID of the outbound email (as returned by nodemailer, including angle brackets).
    // Used to thread inbound replies whose In-Reply-To / References headers point back to this message.
    messageId: text("message_id"),
    toEmail: text("to_email"),
    subject: text("subject"),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    openedAt: timestamp("opened_at"),
    lastOpenedAt: timestamp("last_opened_at"),
    openCount: integer("open_count").notNull().default(0),
    lastIp: text("last_ip"),
    lastUserAgent: text("last_user_agent"),
  },
  (table) => ({
    messageIdIdx: index("email_tracking_message_id_idx").on(table.messageId),
  }),
);

export type EmailTracking = typeof emailTrackingTable.$inferSelect;
