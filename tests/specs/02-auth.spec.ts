import { test, expect } from "@playwright/test";
import { loginWithCredentials, saveSession, APP_USERNAME, hasSession } from "./helpers/auth";

test.describe("Authentication", () => {
  test("can log in with app credentials and reach the dashboard", async ({ browser }) => {
    // Skip re-login if session already exists — run once to bootstrap
    if (hasSession()) {
      console.log(`Session already saved for ${APP_USERNAME} — skipping re-login`);
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    await loginWithCredentials(page);

    await expect(
      page.getByText(/dashboard|leads|accounts|opportunities/i).first()
    ).toBeVisible({ timeout: 10_000 });

    await saveSession(context);
    await context.close();
    console.log(`✅ Session saved for ${APP_USERNAME}`);
  });
});
