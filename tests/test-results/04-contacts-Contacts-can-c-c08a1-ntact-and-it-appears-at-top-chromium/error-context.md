# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 04-contacts.spec.ts >> Contacts >> can create a new contact and it appears at top
- Location: specs\04-contacts.spec.ts:25:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "E2E"
Received string:    ""
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - generic [ref=e8]: arbormind.in
          - generic [ref=e9]: /
          - generic "Default Organization" [ref=e10]
        - generic [ref=e11]:
          - img
          - textbox "Search leads, opportunities, accounts…" [ref=e12]
      - generic [ref=e13]:
        - button "£ GBP" [ref=e14]:
          - generic [ref=e15]: £
          - generic [ref=e16]: GBP
        - button "Switch to dark mode" [ref=e17]:
          - img
        - button "Notifications" [ref=e18]:
          - img
        - button "New" [ref=e19]:
          - img
          - text: New
          - img
        - generic [ref=e21] [cursor=pointer]: DU
    - navigation [ref=e22]:
      - generic:
        - generic:
          - img
          - text: Dashboard
        - generic:
          - img
          - text: Leads
        - generic:
          - img
          - text: Contacts
        - generic:
          - img
          - text: Accounts
        - generic:
          - img
          - text: Opportunities
        - generic:
          - img
          - text: Campaigns
        - generic:
          - img
          - text: Website Visitors
        - generic:
          - img
          - text: Activities
        - generic:
          - img
          - text: Products
        - generic:
          - img
          - text: Product Bundles
        - generic:
          - img
          - text: Price Books
        - generic:
          - img
          - text: Quotes
        - generic:
          - img
          - text: Orders
        - generic:
          - img
          - text: Contracts
        - generic:
          - img
          - text: CLM Templates
        - generic:
          - img
          - text: CLM Renewals
        - generic:
          - img
          - text: CLM Workflow
        - generic:
          - img
          - text: CLM Alerts
        - generic:
          - img
          - text: Cases
        - generic:
          - img
          - text: Reports
        - generic:
          - img
          - text: AI Assistant
        - generic:
          - img
          - text: Approvals
        - generic:
          - img
          - text: Support
        - generic:
          - img
          - text: Product Rules
        - generic:
          - img
          - text: System Admin
        - generic:
          - img
          - text: Sales Performance
        - generic:
          - img
          - text: Target Cycles
        - generic:
          - img
          - text: Incentive Plans
        - generic:
          - img
          - text: Calc Runs & Payouts
        - generic:
          - img
          - text: Comp Admin
      - generic [ref=e23]:
        - generic "Drag to reorder" [ref=e24]:
          - link "Dashboard" [ref=e25] [cursor=pointer]:
            - /url: /
            - generic [ref=e26]:
              - img [ref=e27]
              - text: Dashboard
        - generic "Drag to reorder" [ref=e32]:
          - link "Leads" [ref=e33] [cursor=pointer]:
            - /url: /leads
            - generic [ref=e34]:
              - img [ref=e35]
              - text: Leads
        - generic "Drag to reorder" [ref=e38]:
          - link "Contacts" [ref=e39] [cursor=pointer]:
            - /url: /contacts
            - generic [ref=e40]:
              - img [ref=e41]
              - text: Contacts
        - generic "Drag to reorder" [ref=e47]:
          - link "Accounts" [ref=e48] [cursor=pointer]:
            - /url: /accounts
            - generic [ref=e49]:
              - img [ref=e50]
              - text: Accounts
        - generic "Drag to reorder" [ref=e54]:
          - link "Opportunities" [ref=e55] [cursor=pointer]:
            - /url: /opportunities
            - generic [ref=e56]:
              - img [ref=e57]
              - text: Opportunities
        - generic "Drag to reorder" [ref=e60]:
          - link "Campaigns" [ref=e61] [cursor=pointer]:
            - /url: /campaigns
            - generic [ref=e62]:
              - img [ref=e63]
              - text: Campaigns
        - generic "Drag to reorder" [ref=e66]:
          - link "Website Visitors" [ref=e67] [cursor=pointer]:
            - /url: /website-visitors
            - generic [ref=e68]:
              - img [ref=e69]
              - text: Website Visitors
        - generic "Drag to reorder" [ref=e72]:
          - link "Activities" [ref=e73] [cursor=pointer]:
            - /url: /activities
            - generic [ref=e74]:
              - img [ref=e75]
              - text: Activities
        - generic "Drag to reorder" [ref=e77]:
          - link "Products" [ref=e78] [cursor=pointer]:
            - /url: /products
            - generic [ref=e79]:
              - img [ref=e80]
              - text: Products
        - generic "Drag to reorder" [ref=e84]:
          - link "Product Bundles" [ref=e85] [cursor=pointer]:
            - /url: /product-bundles
            - generic [ref=e86]:
              - img [ref=e87]
              - text: Product Bundles
        - generic "Drag to reorder" [ref=e91]:
          - link "Price Books" [ref=e92] [cursor=pointer]:
            - /url: /price-books
            - generic [ref=e93]:
              - img [ref=e94]
              - text: Price Books
        - generic [ref=e96] [cursor=pointer]:
          - img [ref=e97]
          - text: More
          - img [ref=e101]
    - main [ref=e103]:
      - generic [ref=e105]:
        - generic [ref=e106]:
          - generic [ref=e107]:
            - img [ref=e109]
            - generic [ref=e114]:
              - heading "Contacts" [level=1] [ref=e115]
              - button "All Contacts" [ref=e116]:
                - text: All Contacts
                - img [ref=e117]
          - generic [ref=e119]:
            - generic [ref=e120]:
              - img [ref=e121]
              - textbox "Search contacts..." [active] [ref=e124]: Contact1783884428523
            - button "AI Insights" [ref=e125]:
              - img
            - button "Add Contact" [ref=e126]
        - generic [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]: Rows per page
                - combobox [ref=e132]:
                  - generic: "25"
                  - img [ref=e133]
              - generic [ref=e135]:
                - generic [ref=e136]: 1–1 of 1
                - generic [ref=e137]:
                  - button "First page" [disabled]:
                    - img
                  - button "Previous page" [disabled]:
                    - img
                  - generic [ref=e138]: Page 1 of 1
                  - button "Next page" [disabled]:
                    - img
                  - button "Last page" [disabled]:
                    - img
            - button "Columns" [ref=e139]:
              - img [ref=e140]
              - text: Columns
              - img [ref=e142]
          - table [ref=e145]:
            - rowgroup [ref=e152]:
              - row "Name Drag to resize Contact Info Drag to resize Account / Title Drag to resize Owner Drag to resize Actions Drag to resize" [ref=e153]:
                - columnheader "Name Drag to resize" [ref=e154]:
                  - text: Name
                  - separator "Drag to resize" [ref=e155]
                - columnheader "Contact Info Drag to resize" [ref=e156]:
                  - text: Contact Info
                  - separator "Drag to resize" [ref=e157]
                - columnheader "Account / Title Drag to resize" [ref=e158]:
                  - text: Account / Title
                  - separator "Drag to resize" [ref=e159]
                - columnheader "Owner Drag to resize" [ref=e160]:
                  - text: Owner
                  - separator "Drag to resize" [ref=e161]
                - columnheader "Actions Drag to resize" [ref=e162]:
                  - text: Actions
                  - separator "Drag to resize" [ref=e163]
            - rowgroup [ref=e164]:
              - row "EC E2E Contact1783884428523 e2e.contact+1783884428523@playwright.test +44 7700 900100 No Account - -" [ref=e165]:
                - cell "EC E2E Contact1783884428523" [ref=e166]:
                  - generic [ref=e167]:
                    - generic [ref=e168]: EC
                    - link "E2E Contact1783884428523" [ref=e170] [cursor=pointer]:
                      - /url: /contacts/47
                      - generic [ref=e171]:
                        - text: E2E Contact1783884428523
                        - img [ref=e172]
                - cell "e2e.contact+1783884428523@playwright.test +44 7700 900100" [ref=e176]:
                  - generic [ref=e177]:
                    - generic [ref=e178]:
                      - img [ref=e179]
                      - generic [ref=e182]: e2e.contact+1783884428523@playwright.test
                    - generic [ref=e183]:
                      - img [ref=e184]
                      - generic [ref=e186]: +44 7700 900100
                - cell "No Account -" [ref=e187]:
                  - generic [ref=e188]:
                    - generic [ref=e189]:
                      - img [ref=e190]
                      - generic [ref=e194]: No Account
                    - generic [ref=e195]: "-"
                - cell "-" [ref=e196]
                - cell [ref=e197]:
                  - button [ref=e198]:
                    - img
  - button [ref=e199]:
    - img [ref=e200]
  - region "Notifications (F8)":
    - list [ref=e204]:
      - listitem [ref=e205]:
        - generic [ref=e206]:
          - generic [ref=e207]: Contact created
          - generic [ref=e208]: The contact has been added successfully.
        - button [ref=e209]:
          - img [ref=e210]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const TS = Date.now();
  4  | const FIRST = "E2E";
  5  | const LAST = `Contact${TS}`;
  6  | const EMAIL = `e2e.contact+${TS}@playwright.test`;
  7  | const PHONE = "+44 7700 900100";
  8  | 
  9  | test.describe("Contacts", () => {
  10 |   test.beforeEach(async ({ page }) => {
  11 |     await page.goto("/contacts");
  12 |     await page.waitForSelector("table", { timeout: 15_000 });
  13 |   });
  14 | 
  15 |   test("contacts list loads", async ({ page }) => {
  16 |     await expect(page.getByRole("heading", { name: /contacts/i })).toBeVisible();
  17 |   });
  18 | 
  19 |   test("contact rows are single-line (no stacked cells)", async ({ page }) => {
  20 |     const firstRow = page.locator("tbody tr").first();
  21 |     const box = await firstRow.boundingBox();
  22 |     if (box) expect(box.height, "Row should be under 52px (single-line)").toBeLessThan(52);
  23 |   });
  24 | 
  25 |   test("can create a new contact and it appears at top", async ({ page }) => {
  26 |     await page.getByRole("button", { name: /add contact/i }).click();
  27 |     await page.waitForSelector('[role="dialog"]', { timeout: 8_000 });
  28 | 
  29 |     // Contacts form has proper htmlFor/id associations
  30 |     await page.getByLabel(/first name/i).fill(FIRST);
  31 |     await page.getByLabel(/last name/i).fill(LAST);
  32 |     await page.getByLabel(/^email$/i).fill(EMAIL);
  33 |     await page.getByLabel(/^phone$/i).fill(PHONE);
  34 | 
  35 |     await page.locator('[role="dialog"]').getByRole("button", { name: /save|create|add/i }).click();
  36 |     await page.waitForTimeout(2000);
  37 | 
  38 |     // Search for the new contact (list grows across test runs)
  39 |     const searchInput = page.locator('input[placeholder*="Search contacts"]').first();
  40 |     if (await searchInput.count() > 0) {
  41 |       await searchInput.fill(LAST);
  42 |       await page.waitForTimeout(1000);
  43 |     }
  44 |     const tableText = await page.locator("tbody").textContent();
> 45 |     expect(tableText).toContain(FIRST);
     |                       ^ Error: expect(received).toContain(expected) // indexOf
  46 |   });
  47 | 
  48 |   test("contact detail page loads", async ({ page }) => {
  49 |     await page.locator("tbody tr a").first().click();
  50 |     await page.waitForURL(/\/contacts\/\d+/, { timeout: 10_000 });
  51 |     await expect(page.getByRole("heading").first()).toBeVisible();
  52 |   });
  53 | });
  54 | 
```