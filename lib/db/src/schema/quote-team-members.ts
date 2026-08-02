import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { quotesTable } from "./quotes";
import { usersTable } from "./users";
import { organizationsTable } from "./organizations";

export const quoteTeamMembersTable = pgTable("quote_team_members", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  quoteId: integer("quote_id").notNull().references(() => quotesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("Team Member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type QuoteTeamMember = typeof quoteTeamMembersTable.$inferSelect;
