import { Page, BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

export const AUTH_FILE = path.join(__dirname, "../../.auth/session.json");

// App credentials — set via env vars or fall back to built-in demo account
export const APP_USERNAME = process.env.APP_USERNAME || "demo@arbormind.in";
export const APP_PASSWORD = process.env.APP_PASSWORD || "demo1234";

export function hasSession(): boolean {
  return fs.existsSync(AUTH_FILE);
}

/** Log in using the app's own username/password form at /login */
export async function loginWithCredentials(page: Page) {
  await page.goto("/login");

  // Fill username and password inputs
  await page.locator('input[placeholder*="Email"], input[autocomplete="username"]').fill(APP_USERNAME);
  await page.locator('input[type="password"], input[placeholder*="Password"]').fill(APP_PASSWORD);

  // Submit
  await page.locator('button[type="submit"]').or(page.getByRole("button", { name: /sign.?in|log.?in|continue/i })).first().click();

  // Wait for redirect to dashboard
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}

/** Save the browser session (cookies) to disk for reuse across test files */
export async function saveSession(context: BrowserContext) {
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await context.storageState({ path: AUTH_FILE });
}
