---
name: CRMAI base-currency model
description: How money/currency works in CRMAI — single GBP base price, on-the-fly display conversion, server-side GBP enforcement.
---

# CRMAI currency model

CRMAI uses a SINGLE base currency (GBP). Every stored money amount (product
unitPrice, price_book_entries.listPrice, opportunity/quote/order amounts) is a
plain number interpreted as GBP — regardless of any `currency` text column value.

**Display conversion is on the fly.** The frontend converts the GBP number into a
user-selected display currency (GBP or USD) at render time using live rates.

**Why:** product decision — one canonical price, not per-currency stored prices.
This means the `currency` text columns are NOT a source of truth for display; they
are forced to "GBP" server-side for consistency only. Do not start branching display
logic on a row's `currency` column — trust the number-is-GBP convention.

## How to apply
- Frontend: format money via `useCurrency().format(baseAmount)` from
  `artifacts/crmai/src/context/currency.tsx` (+ helpers in `src/lib/currency.ts`).
  Display currency persists in localStorage key `crm-display-currency`.
  For recharts ticks/tooltips, convert with `convertFromBase` + `CURRENCY_META`
  to preserve "k"-style abbreviations.
- Backend rates: `GET /api/exchange-rates` (artifacts/api-server/src/routes/exchange-rates.ts)
  pulls from open.er-api.com/v6/latest/GBP, in-memory TTL cache + RETRY_TTL on stale,
  fallback `{GBP:1,USD:1.27}`. No API key. Client refetches hourly.
- Writes: products + price-books routes force `currency:"GBP"`; schema defaults GBP;
  `syncStandardEntry` defaults GBP. Keep new money-write paths consistent with this.
- Base-currency input fields are labelled "(£)" intentionally; approval thresholds in
  approvals.tsx are intentionally left in GBP.
