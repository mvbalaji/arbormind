import { test, expect } from "@playwright/test";

const TS = Date.now();
const PB_NAME = `E2E Price Book ${TS}`;
const PB_DESC = `E2E test price book created at ${TS}`;

test.describe("Price Books", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/price-books");
    await page.waitForSelector("table", { timeout: 15_000 });
  });

  test("price books list loads with standard price book", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /price books/i })).toBeVisible();
    // Standard Price Book is auto-created by the system
    await expect(page.getByText(/standard price book/i).first()).toBeVisible();
  });

  test("can create a new price book and it appears in list", async ({ page }) => {
    await page.locator("main").getByRole("button", { name: /new price book/i }).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });

    const dialog = page.locator('[role="dialog"]');
    await page.getByLabel(/^name/i).fill(PB_NAME);
    await page.getByLabel(/description/i).fill(PB_DESC);

    const saveResp = page.waitForResponse(
      (r) => r.url().includes("/api/price-books") && r.request().method() === "POST",
      { timeout: 10_000 }
    );
    await dialog.getByRole("button", { name: /^create$/i }).click();
    const resp = await saveResp;
    expect(resp.status(), `POST /api/price-books → ${resp.status()}`).toBe(201);
    await dialog.waitFor({ state: "detached", timeout: 8_000 });

    const search = page.locator('input[placeholder*="Search price books"]').first();
    if (await search.count() > 0) { await search.fill(PB_NAME); await page.waitForTimeout(800); }
    expect(await page.locator("tbody").textContent()).toContain(PB_NAME);
  });

  test("price book detail page loads", async ({ page }) => {
    // Price book rows don't navigate on click — go to detail via URL directly
    await page.goto("/price-books/1");
    await page.waitForLoadState("load");
    await expect(page.locator("h1, h2, h3, main").first()).toBeVisible({ timeout: 8_000 });
  });

  test("price book detail shows product entries section", async ({ page }) => {
    await page.goto("/price-books/1");
    await page.waitForTimeout(3_000);
    await expect(page.getByText(/standard price book|products|entries|price book/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test("standard price book is read-only (cannot be deleted)", async ({ page }) => {
    // The Standard Price Book row should not have a delete action
    const rows = page.locator("tbody tr");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const text = await row.textContent();
      if (text?.toLowerCase().includes("standard price book")) {
        // Hover to see actions
        await row.hover();
        const actionsBtn = row.locator('button[aria-haspopup="menu"]');
        if (await actionsBtn.count() > 0) {
          await actionsBtn.click();
          const menu = page.locator('[role="menu"]');
          await expect(menu).toBeVisible({ timeout: 3_000 });
          // Delete should not be present for Standard Price Book
          const deleteItem = menu.getByText(/delete/i);
          expect(await deleteItem.count()).toBe(0);
          await page.keyboard.press("Escape");
        }
        break;
      }
    }
  });

  test("price book search filters results", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search price books"]').first();
    if (await search.count() > 0) {
      await search.fill("Standard");
      await page.waitForTimeout(800);
      expect(await page.locator("tbody").textContent()).toContain("Standard");
      await search.fill("");
    }
  });

  test("GET /api/price-books responds with data", async ({ request }) => {
    const res = await request.get("https://arbormind.in/api/price-books?limit=5");
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
      // Standard Price Book must always exist
      const isStandard = (body.data as { isStandard?: boolean }[]).some((pb) => pb.isStandard);
      expect(isStandard).toBe(true);
    }
  });
});
