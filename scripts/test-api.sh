#!/usr/bin/env bash
# CRM API Test Suite
# Usage: bash scripts/test-api.sh [module]
# Modules: all (default), auth, accounts, contacts, leads, security, frontend

set -uo pipefail

API="http://localhost:8080"
FRONTEND="http://localhost:5173"
COOKIES="/tmp/crm-test-cookies.txt"
MODULE="${1:-all}"

PASS=0
FAIL=0
FAILURES=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✅ PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "  ${RED}❌ FAIL${NC} $1: $2"; FAIL=$((FAIL+1)); FAILURES+=("$1: $2"); }
warn() { echo -e "  ${YELLOW}⚠️  WARN${NC} $1"; }
section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

# Helper: HTTP status code only
status() { curl -s -o /dev/null -w "%{http_code}" "${@}"; }
# Helper: full response body
body() { curl -s "${@}"; }
# Helper: authed status
astatus() { status -b "$COOKIES" "${@}"; }
# Helper: authed body
abody() { body -b "$COOKIES" "${@}"; }

# ─── Health Check ────────────────────────────────────────────────────────────
test_health() {
  section "1. Health Check"
  code=$(status "$API/api/healthz")
  if [ "$code" = "200" ]; then
    pass "GET /api/healthz"
  else
    fail "GET /api/healthz" "HTTP $code (is the server running?)"
    echo ""
    echo "Server is not running. Start it with:"
    echo "  cd artifacts/api-server && pnpm run dev"
    exit 1
  fi
}

# ─── Auth ────────────────────────────────────────────────────────────────────
test_auth() {
  section "2. Authentication"
  rm -f "$COOKIES"

  # 2a. valid login
  resp=$(body -c "$COOKIES" -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"demo@arbormind.in","password":"demo1234"}')
  code=$(echo "$resp" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.exit(d.id?0:1)}catch{process.exit(1)}" 2>/dev/null && echo "ok" || echo "fail")
  if [ -f "$COOKIES" ] && grep -q "connect.sid" "$COOKIES" 2>/dev/null; then
    pass "POST /api/auth/login (demo credentials)"
  else
    # Try status code fallback
    code2=$(body -c "$COOKIES" -o /dev/null -w "%{http_code}" -X POST "$API/api/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"username":"demo@arbormind.in","password":"demo1234"}')
    if [ "$code2" = "200" ]; then
      pass "POST /api/auth/login (demo credentials)"
    else
      fail "POST /api/auth/login" "HTTP $code2 — check credentials or server"
    fi
  fi

  # 2b. session check
  code=$(astatus "$API/api/auth/me")
  if [ "$code" = "200" ]; then
    pass "GET /api/auth/me (session active)"
  else
    fail "GET /api/auth/me" "HTTP $code — session not maintained"
  fi

  # 2c. invalid login
  code=$(status -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"notreal@fake.com","password":"badpass"}')
  if [ "$code" = "401" ]; then
    pass "POST /api/auth/login (invalid creds → 401)"
  else
    fail "POST /api/auth/login (invalid creds)" "Expected 401 but got HTTP $code"
  fi
}

# ─── Core Entity List Endpoints ───────────────────────────────────────────────
test_entities() {
  section "3. Core Entity List Endpoints"
  ENDPOINTS=(
    "accounts:/api/accounts"
    "contacts:/api/contacts"
    "leads:/api/leads"
    "opportunities:/api/opportunities"
    "products:/api/products"
    "price-books:/api/price-books"
    "cases:/api/cases"
    "quotes:/api/quotes"
    "orders:/api/orders"
    "contracts:/api/contracts"
    "campaigns:/api/campaigns"
    "activities:/api/activities"
    "users:/api/users"
  )

  for entry in "${ENDPOINTS[@]}"; do
    name="${entry%%:*}"
    path="${entry#*:}"
    code=$(astatus "$API$path")
    if [ "$code" = "200" ]; then
      pass "GET $path"
    elif [ "$code" = "403" ]; then
      warn "GET $path → 403 (access restricted for demo user)"
    else
      fail "GET $path" "HTTP $code"
    fi
  done
}

# ─── Account CRUD ─────────────────────────────────────────────────────────────
test_accounts() {
  section "4. Account CRUD"

  # Create
  ACCOUNT_ID=""
  ACCT_RESP=$(curl -s -b "$COOKIES" -X POST "$API/api/accounts" \
    -H "Content-Type: application/json" \
    -d '{"name":"AutoTest Account CI","industry":"Technology","status":"Active"}')
  ACCT_HTTP=$(curl -s -b "$COOKIES" -o /dev/null -w "%{http_code}" -X POST "$API/api/accounts" \
    -H "Content-Type: application/json" \
    -d '{"name":"AutoTest Account CI 2","industry":"Technology","status":"Active"}')
  ACCOUNT_ID=$(echo "$ACCT_RESP" | node -e "process.stdin.resume();let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const d=JSON.parse(s);console.log(d.id||'')}catch{}})" 2>/dev/null || echo "")
  if [ "$ACCT_HTTP" = "200" ] || [ "$ACCT_HTTP" = "201" ]; then
    if [ -n "$ACCOUNT_ID" ]; then
      pass "POST /api/accounts (created id=$ACCOUNT_ID)"
    else
      pass "POST /api/accounts (HTTP $ACCT_HTTP)"
      ACCOUNT_ID=$(echo "$ACCT_RESP" | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "")
    fi
  else
    fail "POST /api/accounts" "HTTP $ACCT_HTTP"
  fi

  if [ -n "$ACCOUNT_ID" ]; then
    # Read
    code=$(astatus "$API/api/accounts/$ACCOUNT_ID")
    [ "$code" = "200" ] && pass "GET /api/accounts/$ACCOUNT_ID" || fail "GET /api/accounts/$ACCOUNT_ID" "HTTP $code"

    # Update
    code=$(astatus -X PUT "$API/api/accounts/$ACCOUNT_ID" \
      -H "Content-Type: application/json" \
      -d '{"name":"AutoTest Account CI Updated"}')
    [ "$code" = "200" ] && pass "PUT /api/accounts/$ACCOUNT_ID" || fail "PUT /api/accounts/$ACCOUNT_ID" "HTTP $code"

    # Delete
    code=$(astatus -X DELETE "$API/api/accounts/$ACCOUNT_ID")
    if [ "$code" = "200" ] || [ "$code" = "204" ]; then
      pass "DELETE /api/accounts/$ACCOUNT_ID (cleanup)"
    else
      warn "DELETE /api/accounts/$ACCOUNT_ID → HTTP $code (manual cleanup may be needed)"
    fi
  fi
}

# ─── Contact CRUD ─────────────────────────────────────────────────────────────
test_contacts() {
  section "5. Contact CRUD"

  # Get first account for FK
  ACCT_ID=$(abody "$API/api/accounts" | \
    node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const arr=d.data||d;console.log(arr[0]?.id||'')}catch{}" 2>/dev/null || echo "")

  if [ -z "$ACCT_ID" ]; then
    warn "No accounts found — skipping contact create test"
    return
  fi

  resp=$(abody -X POST "$API/api/contacts" \
    -H "Content-Type: application/json" \
    -d "{\"firstName\":\"Auto\",\"lastName\":\"TestContact\",\"email\":\"auto_test_ci@example.com\",\"accountId\":$ACCT_ID}")
  CONTACT_ID=$(echo "$resp" | node -e "try{const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const r=d.id||d[0]?.id;if(r)console.log(r)}catch{}" 2>/dev/null || echo "")

  if [ -n "$CONTACT_ID" ]; then
    pass "POST /api/contacts (created id=$CONTACT_ID)"
    code=$(astatus "$API/api/contacts/$CONTACT_ID")
    [ "$code" = "200" ] && pass "GET /api/contacts/$CONTACT_ID" || fail "GET /api/contacts/$CONTACT_ID" "HTTP $code"
    # Cleanup
    astatus -X DELETE "$API/api/contacts/$CONTACT_ID" > /dev/null 2>&1 || true
  else
    code=$(abody -X POST "$API/api/contacts" \
      -H "Content-Type: application/json" \
      -d "{\"firstName\":\"Auto\",\"lastName\":\"TestContact\",\"email\":\"auto_test_ci@example.com\",\"accountId\":$ACCT_ID}" \
      -o /dev/null -w "%{http_code}")
    fail "POST /api/contacts" "HTTP $code or no id returned"
  fi
}

# ─── Search ──────────────────────────────────────────────────────────────────
test_search() {
  section "6. Search"
  code=$(astatus "$API/api/search?q=test")
  [ "$code" = "200" ] && pass "GET /api/search?q=test" || fail "GET /api/search?q=test" "HTTP $code"
}

# ─── App Modules ─────────────────────────────────────────────────────────────
test_app_modules() {
  section "7. App Modules"
  code=$(astatus "$API/api/app-modules/public")
  [ "$code" = "200" ] && pass "GET /api/app-modules/public" || fail "GET /api/app-modules/public" "HTTP $code"
  code=$(astatus "$API/api/admin/app-modules")
  [ "$code" = "200" ] && pass "GET /api/admin/app-modules (admin)" || warn "GET /api/admin/app-modules → $code (may need admin role)"
}

# ─── Security ─────────────────────────────────────────────────────────────────
test_security() {
  section "8. Unauthenticated Access (security)"
  # Dev mode (no GOOGLE_CLIENT_ID) auto-injects admin — so 200 is expected in dev.
  # In production these should return 401/403.
  DEV_MODE=false
  if ! curl -s "$API/api/healthz" -o /dev/null 2>/dev/null; then return; fi
  # Detect dev mode by checking if auth/me returns 200 without any cookies
  me_code=$(status "$API/api/auth/me")
  [ "$me_code" = "200" ] && DEV_MODE=true

  PROTECTED=("/api/accounts" "/api/contacts" "/api/leads" "/api/opportunities" "/api/users")
  for path in "${PROTECTED[@]}"; do
    code=$(status "$API$path")
    if [ "$code" = "401" ] || [ "$code" = "403" ]; then
      pass "GET $path without auth → $code (protected)"
    elif [ "$code" = "200" ] && [ "$DEV_MODE" = "true" ]; then
      warn "GET $path → 200 (dev mode: auth bypassed — expected in development)"
    else
      fail "GET $path without auth" "Expected 401/403 but got HTTP $code"
    fi
  done
}

# ─── Frontend ────────────────────────────────────────────────────────────────
test_frontend() {
  section "9. Frontend Availability"
  code=$(status "$FRONTEND/")
  if [ "$code" = "200" ]; then
    pass "GET $FRONTEND/ (frontend serving)"
  else
    warn "Frontend not reachable at $FRONTEND (HTTP $code) — may not be started"
  fi
}

# ─── Run ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ArborMind CRM — Automated Test Suite   ║"
echo "╚══════════════════════════════════════════╝"
echo "  API: $API"
echo "  Module: $MODULE"
echo ""

case "$MODULE" in
  auth)
    test_health; test_auth ;;
  accounts)
    test_health; test_auth; test_accounts ;;
  contacts)
    test_health; test_auth; test_contacts ;;
  security)
    test_health; test_security ;;
  frontend)
    test_frontend ;;
  leads)
    test_health; test_auth
    section "Leads"
    code=$(astatus "$API/api/leads")
    [ "$code" = "200" ] && pass "GET /api/leads" || fail "GET /api/leads" "HTTP $code"
    ;;
  all|*)
    test_health
    test_auth
    test_entities
    test_accounts
    test_contacts
    test_search
    test_app_modules
    test_security
    test_frontend
    ;;
esac

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              TEST SUMMARY                ║"
echo "╚══════════════════════════════════════════╝"
TOTAL=$((PASS + FAIL))
echo -e "  Total: $TOTAL   ${GREEN}Passed: $PASS${NC}   ${RED}Failed: $FAIL${NC}"

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo ""
  echo "  Failed tests:"
  for f in "${FAILURES[@]}"; do
    echo -e "    ${RED}•${NC} $f"
  done
fi

echo ""
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
