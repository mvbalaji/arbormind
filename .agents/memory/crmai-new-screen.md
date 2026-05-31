---
name: Adding a new CRM screen/tab in CRMAI
description: The full set of places to wire a new authed screen so it appears in nav and is reachable, plus the public-vs-authed route ordering trick.
---

# Adding a new screen (e.g. "Website Visitors") to CRMAI

A new authed CRM screen must be wired in several places, and one of them is
non-obvious enough that forgetting it makes the nav tab silently invisible.

**Steps:**
1. DB table in `lib/db/src/schema/<name>.ts` + `export * from` in `schema/index.ts`; apply with `pnpm --filter @workspace/db run push`.
2. Route in `artifacts/api-server/src/routes/<name>.ts`, registered in `routes/index.ts`.
3. Frontend page in `artifacts/crmai/src/pages/<name>.tsx`, route in `App.tsx`, nav item in `components/layout.tsx` (`NAV_ITEMS`, with `screenKey`).
4. **MUST also add the screen to `SEED_SCREENS` in `artifacts/api-server/src/lib/access-control.ts`.**

**Why step 4 matters:** the sidebar filters `NAV_ITEMS` by `user.screenAccess[screenKey]`. Admins bypass the check, but non-admin roles only get access for screens present in `SEED_SCREENS` (seeded idempotently on API-server startup via `onConflictDoNothing`). Skip it and the tab is hidden for everyone except admins, and `requireScreenAccess(key)` 403s non-admins. Restart the api-server workflow so the seed runs.

# Public vs authed routes in one router file

To expose a PUBLIC ingest endpoint (e.g. visitor tracking from the marketing
site) alongside authed reads in the same route file: declare the public
`router.post(...)` BEFORE `router.use("/path", requireScreenAccess(...))`. Express
runs handlers in registration order, so the POST responds before the guard is
reached; GETs declared after the guard are protected. Mirrors `POST /enquiries`.

**Frontend → API URL:** use `` `${import.meta.env.BASE_URL}api/...` `` with `credentials: "include"` (BASE_URL has a trailing slash). Vite proxies `/api` to the api-server in dev.

**Untrusted ingest data:** public POST bodies are attacker-controllable. Never render a stored `referrer`/URL as a clickable `<a href>` without checking `protocol === http/https` first (stored link-injection / `javascript:` URL risk).
