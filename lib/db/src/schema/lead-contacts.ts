import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";
import { contactsTable } from "./contacts";
import { organizationsTable } from "./organizations";

export const leadContactsTable = pgTable("lead_contacts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
