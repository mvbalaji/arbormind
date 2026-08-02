import { pgTable, serial, text, integer, timestamp, customType, index } from "drizzle-orm/pg-core";
import { emailTrackingTable } from "./email-tracking";
import { organizationsTable } from "./organizations";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const emailAttachmentsTable = pgTable(
  "email_attachments",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
    trackingId: integer("tracking_id")
      .notNull()
      .references(() => emailTrackingTable.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type"),
    sizeBytes: integer("size_bytes").notNull().default(0),
    content: bytea("content").notNull(),
    openCount: integer("open_count").notNull().default(0),
    openedAt: timestamp("opened_at"),
    lastOpenedAt: timestamp("last_opened_at"),
    lastIp: text("last_ip"),
    lastUserAgent: text("last_user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    trackingIdIdx: index("email_attachments_tracking_id_idx").on(table.trackingId),
  }),
);

export type EmailAttachment = typeof emailAttachmentsTable.$inferSelect;
