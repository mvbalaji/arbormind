import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";
import { contactsTable } from "./contacts";

export const leadContactsTable = pgTable("lead_contacts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
