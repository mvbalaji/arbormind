---
name: Per-entity version/sequence allocation
description: How to allocate per-parent sequential numbers (e.g. document version per contract) safely
---

# Per-entity version/sequence allocation

When allocating a sequential number scoped to a parent row (e.g. `contract_documents.version`
per `contractId`, or any "next number for this entity" counter), `max(col)+1` at the
application layer is NOT enough on its own.

The rule:
- Add a **composite unique index** on `(parent_id, version)` in the drizzle schema
  (codebase uses the `(t) => ({ name: uniqueIndex("...").on(t.a, t.b) })` callback form).
- In the route, wrap the `select max + insert` in a **retry loop** that catches Postgres
  unique-violation `code === "23505"` and recomputes the next value (a few attempts), then
  falls back to HTTP 409 if it still can't allocate.

**Why:** two concurrent POSTs can read the same `max(version)` and insert duplicate version
numbers, corrupting history and breaking redline/diff logic. The unique index makes the race
fail loudly instead of silently duplicating; the retry loop makes the common case succeed.
Verified with 6 parallel revision POSTs producing unique, contiguous versions.

**How to apply:** any new "version per X" / "next number per X" feature. Note global
single-column counters (quote/order/contract numbers) already use `.unique()` on the number
column, which gives the same protection for the global case.

**FK cleanup reminder:** child tables like `contract_documents` have an FK to the parent;
the parent DELETE handler must delete children first (a missed child delete shows up as a
500 on delete-with-children).
