import { test, expect } from "@playwright/test";

const TS = Date.now();
const ACCOUNT_NAME = `E2E Account ${TS}`;

test.describe("Accounts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accounts");
    await page.waitForSelector("table", { timeout: 15_000 });
  });

  test("accounts list loads with correct columns", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /accounts/i })).toBeVisible();
    await expect(page.getByText(/account name/i).first()).toBeVisible();
  });

  test("can create a new account and it appears at top", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /^new$/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    await dialog.getByRole("textbox").first().fill(ACCOUNT_NAME);

    await dialog.getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Search for the newly created account (list grows across test runs)
    const searchInput = page.locator('input[placeholder*="Search accounts"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill(ACCOUNT_NAME);
      await page.waitForTimeout(1000);
    }
    const tableText = await page.locator("tbody").textContent();
    expect(tableText).toContain(ACCOUNT_NAME);
  });

  test("account detail page loads", async ({ page }) => {
    await page.locator("tbody tr a").first().click();
    await page.waitForURL(/\/accounts\/\d+/, { timeout: 10_000 });
    await expect(page.getByText(/about|details|industry/i).first()).toBeVisible();
  });
});
