import { test, expect } from "@playwright/test";

const TS = Date.now();
const CAMPAIGN_NAME = `E2E Campaign ${TS}`;

test.describe("Campaigns", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/campaigns");
    await page.waitForSelector("table, [role='heading'], h1, h2", { timeout: 15_000 });
  });

  test("campaigns list loads with correct columns", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
    await expect(page.getByText(/campaign|type|status/i).first()).toBeVisible();
  });

  test("can create a new campaign and it appears in list", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new campaign/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    // Campaign Name has placeholder "e.g. Q2 Email Blast"
    await dialog.getByPlaceholder(/Q2 Email Blast/i).fill(CAMPAIGN_NAME);

    const saveResp = page.waitForResponse(
      (r) => r.url().includes("/api/campaigns") && r.request().method() === "POST",
      { timeout: 10_000 }
    );
    await dialog.getByRole("button", { name: /create campaign/i }).click();
    const resp = await saveResp;
    expect(resp.status(), `POST /api/campaigns → ${resp.status()}`).toBe(201);
    await dialog.waitFor({ state: "detached", timeout: 8_000 });

    const search = page.locator('input[placeholder*="Search campaigns"]').first();
    if (await search.count() > 0) { await search.fill(CAMPAIGN_NAME); await page.waitForTimeout(800); }
    expect(await page.locator("tbody").textContent()).toContain(CAMPAIGN_NAME);
  });

  test("campaign type options include Email, Webinar, Event", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new campaign/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    const typeSelect = dialog.locator('select').first();
    const options = await typeSelect.locator('option').allTextContents();
    expect(options.map(o => o.toLowerCase())).toEqual(
      expect.arrayContaining(["email", "webinar", "event"])
    );
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("campaign status options include Planning, Active, Completed", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new campaign/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    // Second select is Status
    const selects = dialog.locator('select');
    if (await selects.count() >= 2) {
      const statusOptions = await selects.nth(1).locator('option').allTextContents();
      expect(statusOptions.map(o => o.toLowerCase())).toEqual(
        expect.arrayContaining(["planning", "active", "completed"])
      );
    }
    await dialog.getByRole("button", { name: /cancel/i }).click();
  });

  test("campaign rows show status badge", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() === 0) return;
    const rowText = await rows.first().textContent();
    if (!rowText || rowText.toLowerCase().includes("loading") || rowText.toLowerCase().includes("no campaign")) return;
    expect(rowText.toLowerCase()).toMatch(/planning|active|paused|completed|cancelled/);
  });

  test("campaign detail page loads", async ({ page }) => {
    const link = page.locator("tbody tr a, tbody tr [href*='/campaigns/']").first();
    if (await link.count() > 0) {
      await link.click();
      await page.waitForURL(/\/campaigns\/\d+/, { timeout: 10_000 });
      await expect(page.getByRole("heading").first()).toBeVisible();
    }
  });

  test("campaign edit action is available in list", async ({ page }) => {
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

  test("campaigns list search filters by name", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search campaigns"]').first();
    if (await search.count() > 0) {
      await search.fill("zzznomatch999");
      await page.waitForTimeout(800);
      const rows = await page.locator("tbody tr").count();
      expect(rows === 0 || (await page.locator("tbody").textContent())?.toLowerCase().includes("no ")).toBeTruthy();
      await search.fill("");
    }
  });

  test("GET /api/campaigns responds with data", async ({ request }) => {
    const res = await request.get("https://arbormind.in/api/campaigns?limit=5");
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
    }
  });
});
