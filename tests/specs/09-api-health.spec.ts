import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");
const hasAuth = fs.existsSync(AUTH_FILE);
const API = process.env.API_URL || "https://arbormind.in/api";

async function checkEndpoint(
  request: Parameters<Parameters<typeof test>[1]>[0]["request"],
  url: string
) {
  const res = await request.get(url);
  expect([200, 401], `Unexpected status from ${url}`).toContain(res.status());
  if (res.status() === 200) {
    const body = await res.json();
    expect(body).toHaveProperty("data");
  }
  return res;
}

test.describe("API Health", () => {
  test("GET /api/leads — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/leads?limit=5`);
  });

  test("GET /api/contacts — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/contacts?limit=5`);
  });

  test("GET /api/accounts — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/accounts?limit=5`);
  });

  test("GET /api/opportunities — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/opportunities?limit=5`);
  });

  test("GET /api/quotes — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/quotes?limit=5`);
  });

  test("GET /api/cases — endpoint responds", async ({ request }) => {
    await checkEndpoint(request, `${API}/cases?limit=5`);
  });

  test("leads are ordered newest-first (requires auth)", async ({ page }) => {
    test.fixme(true, "Sort order not yet deployed on live server — needs orderBy(desc(createdAt)) pushed to Replit");
    test.skip(!hasAuth, "Skipped: run 02-auth.spec.ts first to save session");
    // Use page (browser context) so session cookies are sent automatically
    await page.goto("/leads");
    await page.waitForSelector("tbody tr", { timeout: 10_000 });

    const dates = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll("tbody tr"));
      return rows
        .map((r) => {
          const text = r.textContent || "";
          // Look for date pattern like "Jul 9, 2026" or ISO string in data attr
          const match = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/g);
          return match ? match[0] : null;
        })
        .filter(Boolean)
        .slice(0, 10);
    });

    // Verify via API using the page's fetch (inherits session cookies)
    const body = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/leads?limit=10`, { credentials: "include" });
      return res.json();
    }, API);

    expect(body).toHaveProperty("data");
    const timestamps: number[] = (body.data as { createdAt?: string }[])
      .map((r) => r.createdAt ? new Date(r.createdAt).getTime() : 0)
      .filter((t) => t > 0);

    for (let i = 0; i < timestamps.length - 1; i++) {
      expect(timestamps[i], `Row ${i} should be newer than row ${i + 1}`).toBeGreaterThanOrEqual(timestamps[i + 1]);
    }
  });

  test("no API endpoint returns 500", async ({ request }) => {
    const endpoints = ["/leads", "/contacts", "/accounts", "/opportunities", "/quotes", "/cases"];
    for (const ep of endpoints) {
      const res = await request.get(`${API}${ep}?limit=1`);
      expect(res.status(), `${ep} returned 500`).not.toBe(500);
    }
  });
});
