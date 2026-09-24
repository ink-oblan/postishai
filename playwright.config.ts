import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/global-setup";

const AUTHENTICATED_SPECS = /.*\.auth\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: AUTHENTICATED_SPECS,
    },
    {
      name: "chromium-auth",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      testMatch: AUTHENTICATED_SPECS,
    },
  ],
  webServer: {
    command: "npm run app:dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
