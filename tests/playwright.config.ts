import { defineConfig, devices } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.BASE_URL || "https://arbormind.in";
const AUTH_FILE = path.join(__dirname, ".auth/session.json");
const storageState = fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  retries: 1,
  timeout: 30_000,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: BASE_URL,
    storageState,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
