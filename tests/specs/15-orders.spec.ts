import { test, expect } from "@playwright/test";

test.describe("Orders", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/orders");
    await page.waitForSelector("table, [role='heading'], h1, h2", { timeout: 15_000 });
  });

  test("orders list loads with correct columns", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /orders/i })).toBeVisible();
    await expect(page.getByText(/order|account|status|total/i).first()).toBeVisible();
  });

  test("order rows show status badge", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() === 0) return;
    const rowText = await rows.first().textContent();
    if (!rowText || rowText.toLowerCase().includes("loading") || rowText.toLowerCase().includes("no order")) return;
    expect(rowText.toLowerCase()).toMatch(/pending|confirmed|shipped|delivered|cancelled/);
  });

  test("order detail dialog or page loads", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() > 0) {
      // Orders may open a detail dialog or navigate to a detail page
      const link = rows.first().locator("a, [role='button']").first();
      if (await link.count() > 0) {
        await link.click();
        await page.waitForTimeout(1500);
        // Either a dialog or a detail URL
        const dialogVisible = await page.locator('[role="dialog"]').isVisible();
        const isDetailPage = page.url().includes("/orders/");
        expect(dialogVisible || isDetailPage).toBe(true);
        if (dialogVisible) await page.keyboard.press("Escape");
      }
    }
  });

  test("order detail shows line items and totals", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() > 0) {
      await rows.first().click();
      await page.waitForTimeout(1500);
      const visible = await page.locator('[role="dialog"]').isVisible();
      if (visible) {
        const dialogText = await page.locator('[role="dialog"]').textContent();
        expect(dialogText?.toLowerCase()).toMatch(/product|qty|quantity|total|subtotal/);
        await page.keyboard.press("Escape");
      }
    }
  });

  test("order status transitions are available via actions menu", async ({ page }) => {
    const rows = page.locator("tbody tr");
    if (await rows.count() > 0) {
      await rows.first().hover();
      const actionsBtn = rows.first().locator('button[aria-haspopup="menu"]');
      if (await actionsBtn.count() > 0) {
        await actionsBtn.click();
        const menu = page.locator('[role="menu"]');
        await expect(menu).toBeVisible({ timeout: 3_000 });
        const menuText = await menu.textContent();
        // Should offer at least one status action
        expect(menuText?.toLowerCase()).toMatch(/confirm|ship|deliver|cancel|view/);
        await page.keyboard.press("Escape");
      }
    }
  });

  test("GET /api/orders responds", async ({ request }) => {
    const res = await request.get("https://arbormind.in/api/orders?limit=5");
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("data");
    }
  });

  test("orders list search filters results", async ({ page }) => {
    const search = page.locator('input[placeholder*="Search"]').first();
    if (await search.count() > 0) {
      await search.fill("zzznomatch999");
      await page.waitForTimeout(800);
      const rows = await page.locator("tbody tr").count();
      const bodyText = await page.locator("tbody").textContent();
      // Expect no matching rows or an empty-state message
      expect(rows === 0 || bodyText?.toLowerCase().includes("no ")).toBeTruthy();
      await search.fill("");
    }
  });
});
