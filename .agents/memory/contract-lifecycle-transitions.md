---
name: Contract lifecycle transitions with side effects
description: How CRMAI contract status transitions that trigger side effects (e.g. document generation) must be made race-safe.
---

# Contract lifecycle transitions that trigger side effects

When a contract status transition also produces a side effect (generating a
document, etc.), claim the transition atomically *before* doing the side effect.

**Pattern:** issue a guarded `UPDATE ... SET status=<next> WHERE id=? AND status=<expected>`
with `.returning()`. If it returns no row, another request already transitioned it
(or it doesn't exist) — return 400/404. Only the single request that wins the claim
proceeds to run the side effect. If the side effect then fails, roll the status back.

**Why:** submit-for-approval auto-generates a contract document. A naive
"read status -> generate -> insert doc -> update status" sequence let two concurrent
submits both pass the status check and generate duplicate document revisions.
The atomic claim guarantees exactly one document per transition (verified with a
concurrent double-submit smoke test: one 200, one 400, one doc).

**How to apply:** reuse this for any future contract lifecycle step that mutates
related data (e.g. customer-acceptance/freeze flow). The provider name in generated
documents is currently a hardcoded constant ("ArborMind") because there is no
org-settings table; if org settings are added, source it from there.
