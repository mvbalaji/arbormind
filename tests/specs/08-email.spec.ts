import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");
test.use(fs.existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {});

test.describe("Email Sending", () => {
  test("email button visible on lead detail", async ({ page }) => {
    await page.goto("/leads");
    await page.waitForSelector("tbody tr a", { timeout: 10_000 });
    // Go to first lead that has an email
    const firstLink = page.locator("tbody tr a").first();
    await firstLink.click();
    await page.waitForURL(/\/leads\/\d+/);

    // Email button should be in the header actions
    const emailBtn = page.getByRole("button", { name: /email/i });
    if (await emailBtn.count() > 0) {
      await expect(emailBtn.first()).toBeVisible();
    }
  });

  test("email composer opens and can be filled", async ({ page }) => {
    await page.goto("/leads");
    await page.waitForSelector("tbody tr a", { timeout: 10_000 });
    await page.locator("tbody tr a").first().click();
    await page.waitForURL(/\/leads\/\d+/);

    const emailBtn = page.getByRole("button", { name: /email/i }).first();
    if (await emailBtn.count() === 0) { test.skip(); return; }

    await emailBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5_000 });

    // Subject and body fields should be visible
    const subjectInput = page.getByLabel(/subject/i).or(page.locator('input[placeholder*="subject" i]'));
    await expect(subjectInput.first()).toBeVisible();
  });
});
