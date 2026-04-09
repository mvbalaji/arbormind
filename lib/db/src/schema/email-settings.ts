import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const emailSettingsTable = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  imapHost: text("imap_host").notNull().default("mail.spacemail.com"),
  imapPort: integer("imap_port").notNull().default(993),
  imapUser: text("imap_user"),
  imapPassword: text("imap_password"),
  imapSecure: boolean("imap_secure").notNull().default(true),
  smtpHost: text("smtp_host").notNull().default("mail.spacemail.com"),
  smtpPort: integer("smtp_port").notNull().default(465),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpSecure: boolean("smtp_secure").notNull().default(true),
  smtpFromName: text("smtp_from_name"),
  syncEnabled: boolean("sync_enabled").notNull().default(false),
  syncIntervalMinutes: integer("sync_interval_minutes").notNull().default(15),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"),
  lastSyncMessage: text("last_sync_message"),
  emailsProcessed: integer("emails_processed").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type EmailSettings = typeof emailSettingsTable.$inferSelect;
