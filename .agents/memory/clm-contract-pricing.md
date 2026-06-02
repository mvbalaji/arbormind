---
name: CLM contract pricing & lifecycle
description: Determinism and lifecycle rules for the Contract Lifecycle Management (CLM) active-pricing helper in the api-server.
---

# Active contract pricing must be deterministic

When multiple activated contracts price the same product for an account, the
**most recently activated contract wins**. Do not rely on DB row return order:
line items are fetched with `inArray(...)` which has no guaranteed order. Compute
an explicit activation rank (contracts ordered by `activatedAt ASC, id ASC`) and
only override a product's price when the candidate's rank is higher.

**Why:** A first implementation iterated `inArray` line-item rows and let "later"
rows overwrite earlier ones, assuming row order matched activation order. It does
not, so the wrong contract price could be applied non-deterministically.

**How to apply:** Any change to `getActiveContractPricing` in
`artifacts/api-server/src/lib/contracts.ts` must preserve the rank-based winner
selection (or do the equivalent in SQL with an ordered join).

# Auto-expire is reconciled on read, not by a scheduler

There is no cron/scheduled job. `expireElapsedContracts(accountId?)` flips
`activated` contracts whose `endDate < now` to `expired`. It is idempotent and is
called at the start of the contracts list route and inside
`getActiveContractPricing`, so statuses self-heal whenever contracts are viewed
or pricing is computed.

**Why:** The lifecycle requires an "expired" state but the app has no background
worker; on-read reconciliation keeps status consistent without one.

# Conventions

- Contract numbering (`CNTR-####`) uses `max(contract_number)` text-parse +
  increment — the SAME pattern as quotes (`QT-`) and orders. Kept for codebase
  consistency; the unique constraint guards collisions.
- Opportunity owner column is `assignedTo` (not `ownerId`) when copying to a
  contract's `ownerId` in create-from-opportunity.
