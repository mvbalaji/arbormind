# CRM Application Testing Agent

You are an automated testing agent for the ArborMind CRM application. When invoked via `/test-app`, run a full suite of automated tests against the running API and UI, then report results clearly.

## Setup

The app has two parts:
- **API server**: `http://localhost:8080` (Express.js, session-based auth)
- **Frontend**: `http://localhost:5173` (Vite + React)
- **Demo credentials**: username `demo@arbormind.in`, password `demo1234`

## What to Test

Run all test groups below in order. For each test, report PASS ✅ or FAIL ❌ with the HTTP status or error detail.

---

### 1. Health Check
```bash
curl -s http://localhost:8080/api/healthz
```
Expected: 200 OK with `{ status: "ok" }`.

> **Dev mode note**: When `GOOGLE_CLIENT_ID` is not set, the server auto-injects a dev admin user for all `/api` requests — so auth tests may always pass. The demo login still works via session.

---

### 2. Authentication

**2a. Login with demo credentials**
```bash
curl -s -c /tmp/crm-cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo@arbormind.in","password":"demo1234"}'
```
Expected: 200 with user object containing `id`, `email`, `role`.

**2b. Get current user (session check)**
```bash
curl -s -b /tmp/crm-cookies.txt http://localhost:8080/api/auth/me
```
Expected: 200 with user info (not 401).

**2c. Invalid login**
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"wrong@test.com","password":"wrongpass"}'
```
Expected: 401 Unauthorized.

---

### 3. Core CRM Entities (all require auth cookie from step 2)

For each endpoint below, run a GET and check for 200 + array response:

| Module | Endpoint |
|--------|----------|
| Accounts | `GET /api/accounts` |
| Contacts | `GET /api/contacts` |
| Leads | `GET /api/leads` |
| Opportunities | `GET /api/opportunities` |
| Products | `GET /api/products` |
| Price Books | `GET /api/price-books` |
| Cases | `GET /api/cases` |
| Quotes | `GET /api/quotes` |
| Orders | `GET /api/orders` |
| Contracts | `GET /api/contracts` |
| Campaigns | `GET /api/campaigns` |
| Activities | `GET /api/activities` |
| Users | `GET /api/users` |

For each: `curl -s -b /tmp/crm-cookies.txt http://localhost:8080/api/<endpoint>`

Expected: 200 with JSON array (even if empty `[]`). A 401 means auth failed; a 500 means a server error.

---

### 4. CRUD Tests — Accounts

**4a. Create account**
```bash
curl -s -b /tmp/crm-cookies.txt -X POST http://localhost:8080/api/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account Auto","industry":"Technology","status":"Active"}'
```
Expected: 201 or 200 with account object containing `id`.

Save the `id` from response as `TEST_ACCOUNT_ID`.

**4b. Get single account**
```bash
curl -s -b /tmp/crm-cookies.txt http://localhost:8080/api/accounts/<TEST_ACCOUNT_ID>
```
Expected: 200 with account data matching what was created.

**4c. Update account**
```bash
curl -s -b /tmp/crm-cookies.txt -X PUT http://localhost:8080/api/accounts/<TEST_ACCOUNT_ID> \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Account Auto Updated","status":"Inactive"}'
```
Expected: 200 with updated data.

**4d. Delete account** (cleanup)
```bash
curl -s -b /tmp/crm-cookies.txt -X DELETE http://localhost:8080/api/accounts/<TEST_ACCOUNT_ID>
```
Expected: 200 or 204.

---

### 5. CRUD Tests — Contacts

**5a. Create contact** (requires a real account ID from the DB — fetch first account)
```bash
# First get an account id
ACCT_ID=$(curl -s -b /tmp/crm-cookies.txt http://localhost:8080/api/accounts | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const arr=JSON.parse(d); console.log(arr.data?arr.data[0]?.id:arr[0]?.id)")

curl -s -b /tmp/crm-cookies.txt -X POST http://localhost:8080/api/contacts \
  -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Contact\",\"email\":\"testcontact_auto@example.com\",\"accountId\":$ACCT_ID}"
```
Expected: 201 or 200 with contact object.

---

### 6. Search

```bash
curl -s -b /tmp/crm-cookies.txt "http://localhost:8080/api/search?q=test"
```
Expected: 200 with search results object.

---

### 7. App Modules

```bash
curl -s -b /tmp/crm-cookies.txt http://localhost:8080/api/app-modules
```
Expected: 200 with module config.

---

### 8. Unauthenticated Access (security check)

The following should return 401 (not 200) when called WITHOUT auth cookies:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/accounts
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/contacts
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/leads
```
Expected: all return `401`.

---

### 9. Frontend Availability

Check the frontend is serving:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/
```
Expected: 200.

---

## Execution Instructions

1. Run all tests using Bash curl commands. Use `-c /tmp/crm-cookies.txt` to save cookies and `-b /tmp/crm-cookies.txt` to send them.
2. After login, extract the session cookie automatically from the saved cookie file.
3. For each test, print a one-line result: `✅ PASS` or `❌ FAIL: <reason>`.
4. At the end, print a summary table:
   ```
   === TEST SUMMARY ===
   Total: N   Passed: N   Failed: N
   
   Failed tests:
   - <test name>: <reason>
   ```
5. If the API server is not running (health check fails), stop immediately and tell the user to start the server first with instructions.
6. If tests fail due to missing test data (e.g., no accounts exist), note it as a warning rather than a failure.

## When to Use

Invoke this skill with `/test-app` any time you want to:
- Verify the app still works after code changes
- Check that new API endpoints are functioning
- Validate auth and security controls
- Run a smoke test before committing or deploying

## Args

Optionally pass a module name to test only that module:
- `/test-app auth` — only run auth tests
- `/test-app accounts` — only run account CRUD tests
- `/test-app security` — only run unauthenticated access tests
- `/test-app all` (default) — run everything
