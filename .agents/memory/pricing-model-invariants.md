---
name: Salesforce-style pricing model invariants
description: Cross-cutting constraints introduced by the price-book / price-book-entry model that other features must respect.
---

# Pricing model invariants

Every product automatically gets a Standard Price Book entry (on create/update and
via a startup backfill seed). Line items (quote/opportunity/order/contract) snapshot
`productName` + `unitPrice` at creation, so the live links to product / price book /
price-book-entry are references only, not the source of truth for historical totals.

This creates several cross-cutting obligations:

1. **Deleting a product/book/entry that is in use must succeed, not FK-error.**
   Because line items snapshot their own name/price, the live FK links can be safely
   nulled. All *nullable* FK links use `onDelete: "set null"`: line-item `productId`
   and `priceBookEntryId` (quote/opportunity/order/contract items) and header
   `priceBookId` (quotes/opportunities/contracts). The two *NOT NULL* FKs on
   `price_book_entries` (`productId`, `priceBookId`) cannot be set-null, so the delete
   routes delete dependent `price_book_entries` rows first, then the product/book.
   **Why:** once the pricing model added auto-entries and book references, naive
   deletes regressed with FK violations across several tables (whack-a-mole). The
   snapshot-then-set-null pattern fixes the whole class. **How to apply:** any new
   table that references products/price_books/price_book_entries should either snapshot
   what it needs and use `onDelete: set null`, or be deleted-children-first in routes.

2. **Standard Price entries are protected.** `DELETE /price-books/:id/entries/:entryId`
   returns 400 for entries in the Standard Price Book (can't orphan a product from
   standard), and the Standard Price Book itself cannot be deleted. These are
   intentional guards, not FK failures.

3. **"No price book chosen" must default to the Standard Price Book server-side.**
   Quote and opportunity create/update resolve a null/omitted `priceBookId` to
   `getStandardPriceBookId()` (lib/pricing). A client-side price fallback to the
   product's unitPrice is NOT sufficient — the entity must actually reference the
   Standard Price Book id. **How to apply:** any new flow that persists `priceBookId`
   should default null/omitted to the Standard Price Book id.
