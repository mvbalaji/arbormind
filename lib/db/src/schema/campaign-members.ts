import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { campaignsTable } from "./campaigns";
import { contactsTable } from "./contacts";
import { leadsTable } from "./leads";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const campaignMembersTable = pgTable("campaign_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  leadId: integer("lead_id").references(() => leadsTable.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  source: text("source").notNull().default("manual"),
  addedBy: integer("added_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCampaignMemberSchema = createInsertSchema(campaignMembersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaignMember = z.infer<typeof insertCampaignMemberSchema>;
export type CampaignMember = typeof campaignMembersTable.$inferSelect;
