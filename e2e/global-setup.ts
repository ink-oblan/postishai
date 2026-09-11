import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";

export const STORAGE_STATE = path.join(__dirname, ".auth", "state.json");

export default async function globalSetup(config: FullConfig) {
  const email = process.env.LOCAL_TESTING_USER_EMAIL;
  const password = process.env.LOCAL_TESTING_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "LOCAL_TESTING_USER_EMAIL and LOCAL_TESTING_USER_PASSWORD must be set to run authenticated e2e tests",
    );
  }

  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
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
