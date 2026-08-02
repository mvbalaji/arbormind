import { pgTable, serial, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const priceBooksTable = pgTable("price_books", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  isStandard: boolean("is_standard").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  // Widened to per-org: each tenant can have its own "standard" price book
  // instead of only one existing across the whole database.
  uniqStandard: uniqueIndex("price_books_single_standard_unique")
    .on(t.orgId, t.isStandard)
    .where(sql`${t.isStandard} = true`),
}));

export const insertPriceBookSchema = createInsertSchema(priceBooksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPriceBook = z.infer<typeof insertPriceBookSchema>;
export type PriceBook = typeof priceBooksTable.$inferSelect;

