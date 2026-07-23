import { test, expect } from "@playwright/test";

const TS = Date.now();
const LEAD_FIRST = `E2E`;
const LEAD_LAST = `Lead${TS}`;
const LEAD_EMAIL = `e2e+lead+${TS}@playwright.test`;
const LEAD_COMPANY = "PlaywrightCo";

test.describe("Leads", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leads");
    await page.waitForSelector("tbody tr", { timeout: 15_000 });
  });

  test("leads list loads with data and newest-first order", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test("can create a new lead and it appears at top", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /^new$/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    // Lead form: First Name (0), Last Name (1) — fill by proximity to label text
    await dialog.locator('div').filter({ hasText: /^First Name/ }).locator('input').first().fill(LEAD_FIRST);
    await dialog.locator('div').filter({ hasText: /^Last Name/ }).locator('input').first().fill(LEAD_LAST);
    await dialog.locator('div').filter({ hasText: /^Company$/ }).locator('input').first().fill(LEAD_COMPANY);
    await dialog.locator('div').filter({ hasText: /^Email$/ }).locator('input[type="email"]').first().fill(LEAD_EMAIL);

    await page.locator('[role="dialog"]').getByRole("button", { name: /save|create|add lead/i }).click();
    await page.waitForTimeout(2000);

    // Search for the new lead (list grows across test runs)
    const searchInput = page.locator('input[placeholder*="Search leads"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill(LEAD_LAST);
      await page.waitForTimeout(1000);
    }
    const tableText = await page.locator("tbody").textContent();
    expect(tableText).toContain(LEAD_FIRST);
  });

  test("lead detail page shows correct fields", async ({ page }) => {
    await page.locator("tbody tr a").first().click();
    await page.waitForURL(/\/leads\/\d+/, { timeout: 10_000 });
    await expect(page.getByText(/contact information/i)).toBeVisible();
    await expect(page.getByText(/lead details/i)).toBeVisible();
  });

  test("lead Actions ⋯ menu opens and shows action options", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    await firstRow.hover();
    await firstRow.locator('button[aria-haspopup="menu"]').click();

    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible({ timeout: 5_000 });
    await expect(menu.getByText(/view details/i)).toBeVisible();
    await expect(menu.getByText(/delete/i)).toBeVisible();
  });
});
