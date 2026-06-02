---
name: Salesforce-style pricing model invariants
description: Cross-cutting constraints introduced by the price-book / price-book-entry model that other features must respect.
---

# Pricing model invariants

Every product automatically gets a Standard Price Book entry (on create/update and
via a startup backfill seed). This creates two cross-cutting obligations:

1. **Product deletion must remove dependent price_book_entries first.**
   `price_book_entries.productId` is a NOT NULL FK to products, so deleting a product
   without first deleting its entries fails with a FK violation. This is easy to miss
   because the dependency is created implicitly, not by the delete path.
   **Why:** product delete regressed silently once the pricing model added the FK +
   auto-entry. **How to apply:** any handler that deletes products (or that adds new
   FKs onto products) must clear `price_book_entries` for that product first.

2. **"No price book chosen" must default to the Standard Price Book server-side.**
   Quote and opportunity create/update resolve a null/omitted `priceBookId` to
   `getStandardPriceBookId()` (lib/pricing). A client-side price fallback to the
   product's unitPrice is NOT sufficient — the entity must actually reference the
   Standard Price Book id. **How to apply:** any new flow that persists `priceBookId`
   should default null/omitted to the Standard Price Book id.
