import { expect, test } from "@playwright/test";

test("the seeded session reaches an authenticated page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
});
