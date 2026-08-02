import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");
const hasAuth = fs.existsSync(AUTH_FILE);
const API = process.env.API_URL || "https://arbormind.in/api";

// The saved session (see 02-auth.spec.ts) authenticates as the demo user,
// which always resolves to the "Default Organization" (org 1) — see
// getDefaultOrgId() in artifacts/api-server/src/lib/org-context.ts. There is
// currently no app-level login flow this test suite can drive to authenticate
// as a *different* tenant (Google OAuth requires a real account, and
// impersonation is deliberately org-scoped — see routes/auth.ts's
// POST /auth/impersonate, which now refuses to cross a tenant boundary).
//
// So this suite proves isolation from the one identity it can hold: an
// authenticated org-1 session must never see or reach "Acme Test Org" (org 2)
// data — not in list views, not in search, not by directly guessing an id.
// Both tenants are created by scripts/src/seed-crm.ts, whose two datasets use
// non-overlapping company/contact names on purpose (see that file's comment)
// so any leak in either direction is unambiguous.

// Distinctive strings that only exist in the "Acme Test Org" (org 2) seed
// dataset — see scripts/src/seed-crm.ts's ACME_ORG_DATA. If any of these ever
// show up in an org-1-authenticated response, tenant isolation has failed.
const ACME_MARKERS = [
  "Nimbus Retail Group",
  "Ferrovia Logistics",
  "Solstice Media Group",
  "Kestrel Biotech",
  "Ironwood Manufacturing",
  "acmetest.io",
  "nimbusretail.test",
  "ACME-CASE-",
  "ACME-QT-",
];

async function fetchJson(page: import("@playwright/test").Page, url: string) {
  return page.evaluate(
    async ({ url, apiBase }) => {
      const res = await fetch(`${apiBase}${url}`, { credentials: "include" });
      return { status: res.status, body: res.status !== 204 ? await res.json().catch(() => null) : null };
    },
    { url, apiBase: API },
  );
}

function assertNoAcmeLeak(payload: unknown, context: string) {
  const text = JSON.stringify(payload);
  for (const marker of ACME_MARKERS) {
    expect(text.includes(marker), `${context} leaked Acme Test Org data (found "${marker}")`).toBe(false);
  }
}

test.describe("Tenant isolation (org 1 session must never see org 2 data)", () => {
  test.skip(!hasAuth, "Skipped: run 02-auth.spec.ts first to save a session");

  test("account list never contains Acme Test Org accounts", async ({ page }) => {
    const { status, body } = await fetchJson(page, "/accounts?limit=200");
    expect(status).toBe(200);
    assertNoAcmeLeak(body, "GET /accounts");
  });

  test("contact list never contains Acme Test Org contacts", async ({ page }) => {
    const { status, body } = await fetchJson(page, "/contacts?limit=200");
    expect(status).toBe(200);
    assertNoAcmeLeak(body, "GET /contacts");
  });

  test("lead list never contains Acme Test Org leads", async ({ page }) => {
    const { status, body } = await fetchJson(page, "/leads?limit=200");
    expect(status).toBe(200);
    assertNoAcmeLeak(body, "GET /leads");
  });

  test("opportunity list never contains Acme Test Org opportunities", async ({ page }) => {
    const { status, body } = await fetchJson(page, "/opportunities?limit=200");
    expect(status).toBe(200);
    assertNoAcmeLeak(body, "GET /opportunities");
  });

  test("case list never contains Acme Test Org cases", async ({ page }) => {
    const { status, body } = await fetchJson(page, "/cases?limit=200");
    expect(status).toBe(200);
    assertNoAcmeLeak(body, "GET /cases");
  });

  test("global search never surfaces an Acme Test Org record", async ({ page }) => {
    for (const term of ["Nimbus", "Ferrovia", "Kestrel", "Ironwood"]) {
      const { status, body } = await fetchJson(page, `/search?q=${encodeURIComponent(term)}`);
      expect(status).toBe(200);
      assertNoAcmeLeak(body, `GET /search?q=${term}`);
    }
  });

  // Every id in this codebase is a single global sequence shared by all tenants
  // (Postgres SERIAL), so some of these ids genuinely belong to Acme Test Org
  // rows. The property under test: whichever ids those are, fetching them as
  // the org-1 session must return 404 (org-scoped WHERE clause + RLS), never
  // 200 with the other tenant's data.
  test("fetching accounts/contacts/leads by id never returns another tenant's record", async ({ page }) => {
    const entityPaths = ["/accounts", "/contacts", "/leads"];
    for (const entityPath of entityPaths) {
      let found200 = 0;
      for (let id = 1; id <= 60; id++) {
        const { status, body } = await fetchJson(page, `${entityPath}/${id}`);
        if (status === 200) {
          found200++;
          assertNoAcmeLeak(body, `GET ${entityPath}/${id}`);
        } else {
          expect([404, 400], `GET ${entityPath}/${id} returned unexpected status ${status}`).toContain(status);
        }
      }
      // Sanity check: the id sweep should find at least some of org 1's own
      // records — if it finds none at all, the test isn't actually exercising
      // anything (e.g. wrong base path) and would pass vacuously.
      expect(found200, `${entityPath}: expected to find at least one org-1 record in ids 1-60`).toBeGreaterThan(0);
    }
  });
});
