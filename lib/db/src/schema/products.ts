import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().$defaultFn(() => 1).references(() => organizationsTable.id),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  costPrice: numeric("cost_price", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("GBP"),
  category: text("category"),
  quantityUnitOfMeasure: text("quantity_unit_of_measure"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

