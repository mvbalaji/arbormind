import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { opportunitiesTable } from "./opportunities";
import { productsTable } from "./products";
import { priceBookEntriesTable } from "./price-book-entries";

export const opportunityItemsTable = pgTable("opportunity_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  opportunityId: integer("opportunity_id").notNull().references(() => opportunitiesTable.id),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  priceBookEntryId: integer("price_book_entry_id").references(() => priceBookEntriesTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 15, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOpportunityItemSchema = createInsertSchema(opportunityItemsTable).omit({ id: true, createdAt: true });
export type InsertOpportunityItem = z.infer<typeof insertOpportunityItemSchema>;
export type OpportunityItem = typeof opportunityItemsTable.$inferSelect;
