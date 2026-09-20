import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

export const STORAGE_STATE = path.join(__dirname, ".auth", "state.json");

/**
 * These specs drive the real generation pipeline — planning a carousel and its slide
 * backgrounds. Against a stack that is not mocking, that is minutes of model calls and
 * real spend, so refuse to start rather than discover it from the bill.
 */
async function assertMockMode(baseURL: string) {
  const response = await fetch(new URL("/api/health", baseURL));
  const { mockMode } = (await response.json()) as { mockMode?: boolean };
  if (mockMode === true) return;

  if (process.env.E2E_REAL === "1") {
    console.warn(
      `[e2e] E2E_REAL=1 — running against the real models at ${baseURL}.\n` +
        "[e2e] This spends real money and takes minutes rather than seconds.",
    );
    return;
  }

  throw new Error(
    `[e2e] the stack at ${baseURL} is not running with MOCK_MODE=true — refusing to run.\n` +
      "These specs would call the real image and language models.\n" +
      "Set MOCK_MODE=true in .env and restart the app and worker, then try again.\n" +
      "To run against the real models on purpose: npm run test:e2e:real",
  );
}

export default async function globalSetup(config: FullConfig) {
  const email = process.env.LOCAL_TESTING_USER_EMAIL;
  const password = process.env.LOCAL_TESTING_USER_PASSWORD;
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";

  await assertMockMode(baseURL);

  if (!email || !password) {
    console.warn(
      "[e2e] LOCAL_TESTING_USER_EMAIL and LOCAL_TESTING_USER_PASSWORD are unset — skipping the authenticated sign-in, so the *.auth.spec.ts projects will fail",
    );
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });
    // The consent banner is a fixed bottom bar that intercepts clicks on anything under it.
    await page.evaluate(() => window.localStorage.setItem("postishai-analytics-consent", "denied"));
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
