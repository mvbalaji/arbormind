import { db } from "@workspace/db";
import { priceBooksTable, priceBookEntriesTable, productsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export const STANDARD_PRICE_BOOK_NAME = "Standard Price Book";

const standardSeededOrgs = new Set<number>();

/**
 * Returns the singleton Standard Price Book for an org, creating it if necessary.
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
 * Returns the Standard Price Book id, creating the book if necessary. Use this to
 * default quote/opportunity selections when the user does not choose a price book.
 */
export async function getStandardPriceBookId(orgId: number): Promise<number> {
  const standard = await getStandardPriceBook(orgId);
  return standard.id;
}

/**
 * Upsert the Standard Price Book entry for a product so it always mirrors
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
 * Idempotent startup seed: ensure the Standard Price Book exists and that
 * every product has a matching standard entry derived from its unitPrice.
 */
export async function seedStandardPricing(orgId: number): Promise<void> {
  if (standardSeededOrgs.has(orgId)) return;
  try {
    const standard = await getStandardPriceBook(orgId);
    // Backfill: any product without a standard entry gets one from unitPrice.
    const missing = await db
      .select({ id: productsTable.id, unitPrice: productsTable.unitPrice, currency: productsTable.currency })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.orgId, orgId),
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
            orgId,
            priceBookId: standard.id,
            productId: p.id,
            listPrice: p.unitPrice,
            currency: p.currency,
            isActive: true,
          })),
        )
        .onConflictDoNothing();
    }
    standardSeededOrgs.add(orgId);
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
