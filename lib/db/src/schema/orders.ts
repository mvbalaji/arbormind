import { pgTable, serial, text, integer, numeric, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quotesTable } from "./quotes";
import { opportunitiesTable } from "./opportunities";
import { contactsTable } from "./contacts";
import { accountsTable } from "./accounts";
import { productsTable } from "./products";
import { usersTable } from "./users";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  orderNumber: text("order_number").notNull(),
  quoteId: integer("quote_id").references(() => quotesTable.id),
  opportunityId: integer("opportunity_id").references(() => opportunitiesTable.id),
  contactId: integer("contact_id").references(() => contactsTable.id),
  accountId: integer("account_id").references(() => accountsTable.id),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  status: text("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  orgOrderNumberUnique: uniqueIndex("orders_org_order_number_unique").on(t.orgId, t.orderNumber),
}));

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().default(1),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
