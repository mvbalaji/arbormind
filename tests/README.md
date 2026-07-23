# arbormind.in — E2E Test Suite

Playwright tests covering the full CRM workflow against **https://arbormind.in**.

## Setup

```bash
cd tests
npm install
npx playwright install chromium
```

## Step 1 — Save a login session (run once)

Uses the app's built-in credentials (no Google account needed):

```powershell
cd tests
$env:BASE_URL = "https://arbormind.in"
npx playwright test specs/02-auth.spec.ts --reporter=list
```

Default credentials: `demo@arbormind.in` / `demo1234`

To use different credentials:
```powershell
$env:APP_USERNAME = "you@arbormind.in"
$env:APP_PASSWORD = "yourpassword"
```

This creates `.auth/session.json` which is automatically reused by all other tests.

## Step 2 — Run all tests

```powershell
$env:BASE_URL = "https://arbormind.in"
$env:API_URL  = "https://arbormind.in/api"
npm test
```

## Run against local dev server

```powershell
$env:BASE_URL = "http://localhost:5173"
$env:API_URL  = "http://localhost:8080/api"
npm test
```

## Run with browser visible

```powershell
npm run test:headed
```

## View HTML report after a run

```powershell
npm run test:report
```

## Test files

| File | What it tests |
|------|---------------|
| `01-landing.spec.ts` | Landing page loads, no JS errors, login reachable, < 5s response |
| `02-auth.spec.ts` | App username/password login, session save |
| `03-leads.spec.ts` | List newest-first, create lead, detail page, actions ⋯ menu |
| `04-contacts.spec.ts` | List loads, single-line rows, create contact |
| `05-accounts.spec.ts` | List loads, create account, detail page |
| `06-opportunities.spec.ts` | List, create opp, detail with stage timeline, kanban view |
| `07-quotes.spec.ts` | List and detail page |
| `08-email.spec.ts` | Email button visible on lead detail, composer opens |
| `09-api-health.spec.ts` | All 6 API endpoints respond (200 or 401), no 500s, newest-first order |
| `10-e2e-full-flow.spec.ts` | Full flow: Lead → Contact → Account → Opportunity, all pages error-free |
