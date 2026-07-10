import { pgTable, serial, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const entityNotesTable = pgTable("entity_notes", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  body: text("body").notNull().default(""),
  attachmentName: text("attachment_name"),
  attachmentUrl: text("attachment_url"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  entityIdx: index("entity_notes_entity_idx").on(t.entityType, t.entityId),
}));

export const insertEntityNoteSchema = createInsertSchema(entityNotesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type EntityNote = typeof entityNotesTable.$inferSelect;
export type InsertEntityNote = z.infer<typeof insertEntityNoteSchema>;
