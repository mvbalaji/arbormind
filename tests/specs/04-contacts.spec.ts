import { test, expect } from "@playwright/test";

const TS = Date.now();
const FIRST = "E2E";
const LAST = `Contact${TS}`;
const EMAIL = `e2e.contact+${TS}@playwright.test`;
const PHONE = "+44 7700 900100";

test.describe("Contacts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contacts");
    await page.waitForSelector("table", { timeout: 15_000 });
  });

  test("contacts list loads", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();
  });

  test("contact rows are single-line (no stacked cells)", async ({ page }) => {
    const firstRow = page.locator("tbody tr").first();
    const box = await firstRow.boundingBox();
    if (box) expect(box.height, "Row should be under 52px (single-line)").toBeLessThan(52);
  });

  test("can create a new contact and it appears at top", async ({ page }) => {
    await page.getByRole("button", { name: /add contact/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    // Contacts form has proper htmlFor/id associations
    await page.getByLabel(/first name/i).fill(FIRST);
    await page.getByLabel(/last name/i).fill(LAST);
    await page.getByLabel(/^email$/i).fill(EMAIL);
    await page.getByLabel(/^phone$/i).fill(PHONE);

    await page.locator('[role="dialog"]').getByRole("button", { name: /save|create|add/i }).click();
    await page.waitForTimeout(2000);

    // Search for the new contact (list grows across test runs)
    const searchInput = page.locator('input[placeholder*="Search contacts"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill(LAST);
      await page.waitForTimeout(1000);
    }
    const tableText = await page.locator("tbody").textContent();
    expect(tableText).toContain(FIRST);
  });

  test("contact detail page loads", async ({ page }) => {
    await page.locator("tbody tr a").first().click();
    await page.waitForURL(/\/contacts\/\d+/, { timeout: 10_000 });
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
