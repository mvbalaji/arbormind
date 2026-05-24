import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { activitiesTable } from "./activities";

export const emailTrackingTable = pgTable("email_tracking", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().references(() => activitiesTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  toEmail: text("to_email"),
  subject: text("subject"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
  lastOpenedAt: timestamp("last_opened_at"),
  openCount: integer("open_count").notNull().default(0),
  lastIp: text("last_ip"),
  lastUserAgent: text("last_user_agent"),
});

export type EmailTracking = typeof emailTrackingTable.$inferSelect;
