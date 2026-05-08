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

    // Hero section
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText("Generate");

    // Navigation
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator('img[alt="Postishai"]').first()).toBeVisible();

    // CTA buttons
    const ctaButtons = page.locator('a[href="/app"], a[href="/signup"]');
    expect(await ctaButtons.count()).toBeGreaterThan(0);
    for (const btn of await ctaButtons.all()) {
      await expect(btn).toBeVisible();
    }

    // Feature cards
    const cards = page.locator('[class*="rounded-2xl"][class*="from-amber"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(6);

    // Testimonials
    const testimonials = page.locator('[class*="rounded-2xl"][class*="border-gray-200"]');
    expect(await testimonials.count()).toBeGreaterThan(0);
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
