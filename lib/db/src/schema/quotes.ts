import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { accountsTable } from "./accounts";
import { opportunitiesTable } from "./opportunities";
import { productsTable } from "./products";
import { priceBooksTable } from "./price-books";
import { priceBookEntriesTable } from "./price-book-entries";

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  quoteNumber: text("quote_number").notNull(),
  name: text("name").notNull(),
  version: integer("version").notNull().default(1),
  parentQuoteId: integer("parent_quote_id"),
  clonedFromQuoteId: integer("cloned_from_quote_id"),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  createdByName: text("created_by_name"),
  createdByEmail: text("created_by_email"),
  opportunityId: integer("opportunity_id").references(() => opportunitiesTable.id),
  contactId: integer("contact_id").references(() => contactsTable.id),
  accountId: integer("account_id").references(() => accountsTable.id),
  priceBookId: integer("price_book_id").references(() => priceBooksTable.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"),
  validUntil: timestamp("valid_until"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  orgQuoteNumberUnique: uniqueIndex("quotes_org_quote_number_unique").on(t.orgId, t.quoteNumber),
}));

export const quoteItemsTable = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  quoteId: integer("quote_id").notNull().references(() => quotesTable.id),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  priceBookEntryId: integer("price_book_entry_id").references(() => priceBookEntriesTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 15, scale: 2 }),
  marginPct: numeric("margin_pct", { precision: 8, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotesTable.$inferSelect;
export type QuoteItem = typeof quoteItemsTable.$inferSelect;
