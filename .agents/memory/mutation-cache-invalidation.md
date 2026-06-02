---
name: Mutation cache invalidation for side-effected entities
description: When a write endpoint also mutates a related entity, the client must invalidate that related query key
---

When a server write endpoint has a side effect on a *different* entity than the one
being mutated, the client mutation handler must invalidate the related query key in
addition to the primary entity's keys — otherwise the DB is correct but the UI serves
stale cached data.

**Why:** Editing a draft contract (`PUT /contracts/:id`) re-syncs that contract's
latest document row in place server-side. The edit dialog invalidated the contract
entity/list keys but not the contract-documents key, so downloads kept exporting the
old cached document content (e.g. £0.00 total, no line items) even though the DB row
was already updated. The bug looked like "document not regenerating" but was purely a
client cache miss.

**How to apply:** After any mutation whose backend touches a related resource, check
what query keys read that resource and invalidate all of them. For CRMAI contracts:
on successful update, invalidate `getListContractDocumentsQueryKey(id)` alongside the
contract keys.
