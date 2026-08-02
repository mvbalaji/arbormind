import { db } from "@workspace/db";
import { priceBooksTable, priceBookEntriesTable, productsTable, organizationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export const STANDARD_PRICE_BOOK_NAME = "Standard Price Book";

let standardSeeded = false;

/**
 * Returns the org's Standard Price Book, creating it if necessary. Each org has
 * its own (the is_standard flag is unique per org, not globally).
 */
export async function getStandardPriceBook(orgId: number) {
  const [existing] = await db
    .select()
    .from(priceBooksTable)
    .where(and(eq(priceBooksTable.orgId, orgId), eq(priceBooksTable.isStandard, true)))
    .limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(priceBooksTable)
    .values({
      orgId,
      name: STANDARD_PRICE_BOOK_NAME,
      description: "The standard list price for every product. Cannot be deleted.",
      isStandard: true,
      isActive: true,
    })
    .returning();
  return created;
}

/**
 * Returns the org's Standard Price Book id, creating the book if necessary. Use this
 * to default quote/opportunity selections when the user does not choose a price book.
 */
export async function getStandardPriceBookId(orgId: number): Promise<number> {
  const standard = await getStandardPriceBook(orgId);
  return standard.id;
}

/**
 * Upsert the org's Standard Price Book entry for a product so it always mirrors
 * the product's unitPrice (the canonical Standard Price).
 */
export async function syncStandardEntry(orgId: number, productId: number, unitPrice: string | number, currency = "GBP") {
  const standard = await getStandardPriceBook(orgId);
  const listPrice = unitPrice.toString();
  await db
    .insert(priceBookEntriesTable)
    .values({
      orgId,
      priceBookId: standard.id,
      productId,
      listPrice,
      currency,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [priceBookEntriesTable.priceBookId, priceBookEntriesTable.productId],
      set: { listPrice, currency, updatedAt: new Date() },
    });
}

/**
 * Idempotent startup seed: ensure every organization has a Standard Price Book
 * and that each of its products has a matching standard entry from its unitPrice.
 */
export async function seedStandardPricing(): Promise<void> {
  if (standardSeeded) return;
  try {
    const orgs = await db.select({ id: organizationsTable.id }).from(organizationsTable);
    for (const org of orgs) {
      const standard = await getStandardPriceBook(org.id);
      // Backfill: any product in this org without a standard entry gets one from unitPrice.
      const missing = await db
        .select({ id: productsTable.id, unitPrice: productsTable.unitPrice, currency: productsTable.currency })
        .from(productsTable)
        .where(
          and(
            eq(productsTable.orgId, org.id),
            sql`NOT EXISTS (
              SELECT 1 FROM ${priceBookEntriesTable}
              WHERE ${priceBookEntriesTable.priceBookId} = ${standard.id}
              AND ${priceBookEntriesTable.productId} = ${productsTable.id}
            )`,
          ),
        );
      if (missing.length > 0) {
        await db
          .insert(priceBookEntriesTable)
          .values(
            missing.map((p) => ({
              orgId: org.id,
              priceBookId: standard.id,
              productId: p.id,
              listPrice: p.unitPrice,
              currency: p.currency,
              isActive: true,
            })),
          )
          .onConflictDoNothing();
      }
    }
    standardSeeded = true;
  } catch (err) {
    console.error("[Pricing] Seed failed:", err);
  }
}

/**
 * Whether a product has a Standard Price entry (required before it can be
 * added to any custom price book).
 */
export async function productHasStandardEntry(orgId: number, productId: number): Promise<boolean> {
  const standard = await getStandardPriceBook(orgId);
  const [row] = await db
    .select({ id: priceBookEntriesTable.id })
    .from(priceBookEntriesTable)
    .where(
      and(
        eq(priceBookEntriesTable.priceBookId, standard.id),
        eq(priceBookEntriesTable.productId, productId),
      ),
    )
    .limit(1);
  return !!row;
}
