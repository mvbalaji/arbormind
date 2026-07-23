import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("loads successfully and shows key content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/arbormind/i);
    // Hero headline visible — use heading role to be precise
    await expect(page.getByRole("heading").first()).toBeVisible();
    // Some CTA or nav element visible
    await expect(page.getByRole("link").or(page.getByRole("button")).first()).toBeVisible();
  });

  test("has no critical JS errors on load (ignores expected 401s)", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filter known acceptable errors: 401 (auth required), favicon, third-party
    const appErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("google") &&
        !e.includes("ERR_BLOCKED") &&
        !e.includes("401") &&       // auth required — expected on public page
        !e.includes("status of 4")  // any 4xx is expected unauthenticated
    );
    expect(appErrors, `Unexpected JS errors:\n${appErrors.join("\n")}`).toHaveLength(0);
  });

  test("login route is reachable (no 404 or 500)", async ({ page }) => {
    const response = await page.goto("/login");
    // Accept any non-error status: 200 (login form) or 3xx redirect (already logged in)
    const status = response?.status() ?? 200;
    expect(status, `/login returned ${status}`).toBeLessThan(400);
    // Page should render something — not blank
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("page responds in under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;
    expect(elapsed, `Page took ${elapsed}ms to load`).toBeLessThan(5000);
  });
});
