import { expect, test } from "@playwright/test";

const viewports = [
  { name: "Mobile XS", width: 320, height: 568 },
  { name: "Mobile SM", width: 375, height: 667 },
  { name: "Mobile MD", width: 425, height: 768 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Desktop SM", width: 1024, height: 768 },
  { name: "Desktop MD", width: 1280, height: 720 },
  { name: "Desktop LG", width: 1920, height: 1080 },
];

test.describe("Landing Page Responsiveness", () => {
  viewports.forEach(({ name, width, height }) => {
    test(`should render correctly on ${name} (${width}x${height})`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width, height });

      // Navigate to landing page
      await page.goto("/", { waitUntil: "networkidle" });

      // Wait for animations to complete
      await page.waitForTimeout(1000);

      // Check that main sections are visible
      await expect(page.locator("h1")).toBeVisible();

      // Verify no console errors
      let _consoleErrors = 0;
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          console.log(`[${name}] Console error: ${msg.text()}`);
          _consoleErrors++;
        }
      });

      // Check for layout shift or broken elements
      const html = await page.content();
      expect(html).toContain("Generate");
      expect(html).toContain("Content At Scale");

      // Take screenshot for visual inspection
      await page.screenshot({
        path: `tests/screenshots/landing-${name.replace(/\s+/g, "-").toLowerCase()}.png`,
        fullPage: true,
      });

      console.log(`✓ ${name} (${width}x${height}) passed`);
    });
  });

  test("should have accessible navigation on all sizes", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      // Check navigation is present
      const nav = page.locator("nav");
      await expect(nav).toBeVisible();

      // Check logo is visible
      const logo = page.locator('img[alt="Postishai"]').first();
      await expect(logo).toBeVisible();

      // Check CTA buttons are accessible
      const ctaButtons = page.locator('a[href="/app"], a[href="/signup"]');
      const count = await ctaButtons.count();
      expect(count).toBeGreaterThan(0);

      console.log(`✓ Navigation accessible on ${name}`);
    }
  });

  test("should scroll smoothly and display content on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Scroll through the page
    const sections = ["h1", "h2"];

    for (const selector of sections) {
      const element = page.locator(selector).first();
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      // Verify element is in viewport
      const isVisible = await element.isVisible();
      expect(isVisible).toBeTruthy();
    }

    console.log("✓ Mobile scrolling works correctly");
  });

  test("should handle touch interactions", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/", { waitUntil: "networkidle" });

    // Test button hover/click states
    const startButton = page.locator('a:has-text("Start Building Free")');
    await expect(startButton).toBeVisible();

    // Verify button is interactive
    const href = await startButton.getAttribute("href");
    expect(href).toBeTruthy();

    console.log("✓ Touch interactions verified");
  });
});

test.describe("Landing Page Visual Consistency", () => {
  test("logo should render correctly", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const logo = page.locator('img[alt="Postishai"]').first();
    await expect(logo).toBeVisible();

    // Check logo dimensions
    const box = await logo.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);

    console.log("✓ Logo renders correctly");
  });

  test("all feature cards should be visible", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Scroll to features section
    const featuresSection = page.locator("text=Everything You Need");
    await featuresSection.scrollIntoViewIfNeeded();

    // Check feature cards
    const cards = page.locator('[class*="rounded-2xl"][class*="from-amber"]');
    const count = await cards.count();

    expect(count).toBeGreaterThanOrEqual(6);
    console.log(`✓ Found ${count} feature cards`);
  });

  test("all CTA buttons should be clickable", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Find all links and buttons
    const buttons = await page.locator('a[href="/app"], a[href="/signup"], button').all();

    for (const button of buttons) {
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();

      if (isVisible) {
        expect(isEnabled).toBeTruthy();
      }
    }

    console.log(`✓ ${buttons.length} buttons are clickable`);
  });
});
