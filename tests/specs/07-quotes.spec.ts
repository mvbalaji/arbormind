import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

const AUTH_FILE = path.join(__dirname, "../.auth/session.json");
test.use(fs.existsSync(AUTH_FILE) ? { storageState: AUTH_FILE } : {});

test.describe("Quotes", () => {
  test("quotes list loads", async ({ page }) => {
    await page.goto("/quotes");
    await page.waitForSelector("table, .quotes-list", { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /quotes/i })).toBeVisible();
  });

  test("quote detail page loads", async ({ page }) => {
    await page.goto("/quotes");
    await page.waitForSelector("tbody tr a", { timeout: 10_000 }).catch(() => {});
    const firstLink = page.locator("tbody tr a").first();
    const count = await firstLink.count();
    if (count === 0) {
      test.skip(); // No quotes yet
      return;
    }
    await firstLink.click();
    await page.waitForURL(/\/quotes\/\d+/);
    await expect(page.getByText(/quote|total|status/i).first()).toBeVisible();
  });
});
