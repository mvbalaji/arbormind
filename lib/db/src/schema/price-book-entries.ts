import { pgTable, serial, integer, text, numeric, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { priceBooksTable } from "./price-books";
import { productsTable } from "./products";

export const priceBookEntriesTable = pgTable("price_book_entries", {
  id: serial("id").primaryKey(),
  priceBookId: integer("price_book_id").notNull().references(() => priceBooksTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  listPrice: numeric("list_price", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniqBookProduct: unique("price_book_entries_book_product_unique").on(t.priceBookId, t.productId),
}));

export const insertPriceBookEntrySchema = createInsertSchema(priceBookEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPriceBookEntry = z.infer<typeof insertPriceBookEntrySchema>;
export type PriceBookEntry = typeof priceBookEntriesTable.$inferSelect;
