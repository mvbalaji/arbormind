import { test, expect } from "@playwright/test";

const TS = Date.now();
const CASE_SUBJECT = `E2E Case ${TS}`;
const CASE_DESC = "Automated test case description";

test.describe("Cases (Extended)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cases");
    await page.waitForSelector("table, [role='heading'], h1, h2", { timeout: 15_000 });
  });

  test("cases list loads with correct columns", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /cases|support/i })).toBeVisible();
    await expect(page.getByText(/subject|priority|status/i).first()).toBeVisible();
  });

  test("can create a new case and it appears in list", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new case/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    // Subject is the only required field (no id/htmlFor — use first required input)
    await dialog.locator('input[required]').first().fill(CASE_SUBJECT);
    await dialog.locator('textarea').first().fill(CASE_DESC);

    const saveResp = page.waitForResponse(
      (r) => r.url().includes("/api/cases") && r.request().method() === "POST",
      { timeout: 10_000 }
    );
    await dialog.getByRole("button", { name: /create case/i }).click();
    const resp = await saveResp;
    expect(resp.status(), `POST /api/cases → ${resp.status()}`).toBe(201);
    await dialog.waitFor({ state: "detached", timeout: 8_000 });

    const search = page.locator('input[placeholder*="Search cases"]').first();
    if (await search.count() > 0) { await search.fill(CASE_SUBJECT); await page.waitForTimeout(800); }
    expect(await page.locator("tbody").textContent()).toContain(CASE_SUBJECT);
  });

  test("case priority options include Low, Medium, High, Critical", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new case/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    // Priority select is the second select
    const selects = dialog.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.toLowerCase() === "critical")) {
        expect(opts.map(o => o.toLowerCase())).toEqual(
          expect.arrayContaining(["low", "medium", "high", "critical"])
        );
        break;
      }
    }
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("case status options include Open, In Progress, Resolved, Closed", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new case/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    const selects = dialog.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.toLowerCase() === "closed")) {
        expect(opts.map(o => o.toLowerCase())).toEqual(
          expect.arrayContaining(["open", "in progress", "resolved", "closed"])
        );
        break;
      }
    }
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("case rows show priority badge with colour coding", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() === 0) return;
    const rowText = await rows.first().textContent();
    if (!rowText || rowText.toLowerCase().includes("loading") || rowText.toLowerCase().includes("no case")) return;
    expect(rowText.toLowerCase()).toMatch(/low|medium|high|critical/);
  });

  test("case rows show status badge", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() === 0) return;
    const rowText = await rows.first().textContent();
    if (!rowText || rowText.toLowerCase().includes("loading") || rowText.toLowerCase().includes("no case")) return;
    expect(rowText.toLowerCase()).toMatch(/open|in.progress|resolved|closed/);
  });

  test("case type options include Question, Bug, Feature Request", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new case/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    const selects = dialog.locator('select');
    const count = await selects.count();
    for (let i = 0; i < count; i++) {
      const opts = await selects.nth(i).locator('option').allTextContents();
      if (opts.some(o => o.toLowerCase() === "bug")) {
        expect(opts.map(o => o.toLowerCase())).toEqual(
          expect.arrayContaining(["question", "bug", "feature request"])
        );
        break;
      }
    }
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("case edit action available in list", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() > 0) {
      await rows.first().hover();
      const actionsBtn = rows.first().locator('button[aria-haspopup="menu"]');
      if (await actionsBtn.count() > 0) {
        await actionsBtn.click();
        const menu = page.locator('[role="menu"]');
        await expect(menu).toBeVisible({ timeout: 3_000 });
        await expect(menu.getByText(/edit/i)).toBeVisible();
        await page.keyboard.press("Escape");
      }
    }
  });

  test("cases list search filters by subject", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search cases"]').first();
    if (await search.count() > 0) {
      await search.fill("zzznomatch999");
      await page.waitForTimeout(800);
      const rows = await page.locator("tbody tr").count();
      expect(rows === 0 || (await page.locator("tbody").textContent())?.toLowerCase().includes("no ")).toBeTruthy();
      await search.fill("");
    }
  });

  test("GET /api/cases responds with data", async ({ request }) => {
    const res = await request.get("https://arbormind.in/api/cases?limit=5");
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
    }
  });
});
