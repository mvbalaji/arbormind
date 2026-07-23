import { Page } from "@playwright/test";

/** Click the "New" button in the main content area (not the header duplicate) */
export async function clickNewButton(page: Page) {
  await page.locator("main").getByRole("button", { name: /^new$/i }).click();
}

/** Open the ⋯ actions dropdown on the first table row */
export async function openFirstRowMenu(page: Page) {
  const firstRow = page.locator("tbody tr").first();
  await firstRow.hover();
  // The ⋯ button is the last button in the row
  await firstRow.locator("button").last().click();
}
