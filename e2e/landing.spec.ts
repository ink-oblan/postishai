import { expect, test } from "@playwright/test";

const viewports = [
  { name: "Mobile", width: 375, height: 667 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Desktop", width: 1280, height: 720 },
];

test("landing page renders correctly on all viewports", async ({ page }) => {
  for (const { width, height } of viewports) {
    await page.setViewportSize({ width, height });
    await page.goto("/", { waitUntil: "networkidle" });

    // Navigation
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator('img[alt="PostishAI"]').first()).toBeVisible();

    // Hero section
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Social media marketing");

    // Email signup CTAs (hero + bottom CTA section each render one)
    const emailInputs = page.locator('input[type="email"]');
    expect(await emailInputs.count()).toBeGreaterThanOrEqual(1);
    await expect(emailInputs.first()).toBeVisible();

    // Content cards (audience, outcomes, live features — all use border-orange-100)
    const contentCards = page.locator('[class*="rounded-2xl"][class*="border-orange-100"]');
    expect(await contentCards.count()).toBeGreaterThanOrEqual(6);

    // Features section badges
    await expect(page.getByText("Live now").first()).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
  }
});

test("no console errors on landing page", async ({ page }) => {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  expect(errors).toEqual([]);
});
