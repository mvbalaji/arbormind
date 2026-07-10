import { pgTable, serial, text, integer, numeric, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";
import { contactsTable } from "./contacts";
import { opportunitiesTable } from "./opportunities";
import { priceBooksTable } from "./price-books";
import { productsTable } from "./products";
import { organizationsTable } from "./organizations";

export const CONTRACT_STATUSES = [
  "draft",
  "in_approval",
  "activated",
  "expired",
  "terminated",
  "cancelled",
] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export const contractsTable = pgTable("contracts", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().references(() => organizationsTable.id),
  contractNumber: text("contract_number").notNull().unique(),
  name: text("name").notNull(),
  accountId: integer("account_id").references(() => accountsTable.id),
  contactId: integer("contact_id").references(() => contactsTable.id),
  opportunityId: integer("opportunity_id").references(() => opportunitiesTable.id),
  priceBookId: integer("price_book_id").references(() => priceBooksTable.id, { onDelete: "set null" }),
  ownerId: integer("owner_id").references(() => usersTable.id),
  status: text("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  contractTermMonths: integer("contract_term_months"),
  endDate: timestamp("end_date"),
  signedDate: timestamp("signed_date"),
  companySignedById: integer("company_signed_by_id").references(() => usersTable.id),
  customerSignedByContactId: integer("customer_signed_by_contact_id").references(() => contactsTable.id),
  autoRenew: boolean("auto_renew").notNull().default(false),
  renewalTermMonths: integer("renewal_term_months"),
  specialTerms: text("special_terms"),
  description: text("description"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  discount: numeric("discount", { precision: 15, scale: 2 }).notNull().default("0"),
  tax: numeric("tax", { precision: 15, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  activatedAt: timestamp("activated_at"),
  terminatedAt: timestamp("terminated_at"),
  terminationReason: text("termination_reason"),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contractLineItemsTable = pgTable("contract_line_items", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id),
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  listPrice: numeric("list_price", { precision: 15, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contractDocumentsTable = pgTable("contract_documents", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").notNull().references(() => contractsTable.id),
  version: integer("version").notNull(),
  title: text("title"),
  content: text("content").notNull(),
  changeSummary: text("change_summary"),
  createdByUserId: integer("created_by_user_id").references(() => usersTable.id),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  contractVersionUnique: uniqueIndex("contract_documents_contract_version_unique").on(t.contractId, t.version),
}));

export const insertContractSchema = createInsertSchema(contractsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contractsTable.$inferSelect;
export type ContractLineItem = typeof contractLineItemsTable.$inferSelect;
export type ContractDocument = typeof contractDocumentsTable.$inferSelect;
