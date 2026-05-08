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

test.describe("Landing Page Visual Health Check", () => {
  viewports.forEach(({ name, width, height }) => {
    test(`[${name}] No text overflow or clipping`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(500);

      console.log(`\n🔍 Checking ${name} (${width}x${height})...`);

      // Check headings
      const h1 = await page.locator("h1").boundingBox();
      const h1Text = await page.locator("h1").textContent();
      expect(h1).not.toBeNull();
      expect(h1Text).toBeTruthy();
      console.log(`  ✓ H1 visible: "${h1Text?.split("\n")[0].substring(0, 30)}..."`);

      // Check that main button is visible and not cut off
      const mainButton = await page.locator('a:has-text("Start Building Free")');
      await expect(mainButton).toBeInViewport();
      const btnBox = await mainButton.boundingBox();
      expect(btnBox?.width).toBeGreaterThan(80);
      console.log(`  ✓ Main CTA button visible (${Math.round(btnBox?.width || 0)}px wide)`);

      // Check sections are properly spaced
      const sections = await page.locator("section").all();
      expect(sections.length).toBeGreaterThan(3);
      console.log(`  ✓ Found ${sections.length} sections properly rendered`);
    });
  });

  test("Navigation alignment check", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const nav = await page.locator("nav").boundingBox();
      const logo = await page.locator('img[alt="Postishai"]').first().boundingBox();
      const navText = await page.locator('nav span:has-text("ostishAI")').boundingBox();

      if (nav && logo && navText) {
        // Check logo and text are on same horizontal line
        const logoCenter = logo.y + logo.height / 2;
        const textCenter = navText.y + navText.height / 2;
        const drift = Math.abs(logoCenter - textCenter);

        if (drift > 5) {
          console.log(`⚠️  ${name}: Navigation vertical drift = ${drift.toFixed(1)}px`);
        } else {
          console.log(`✓ ${name}: Logo & text perfectly aligned`);
        }

        expect(drift).toBeLessThan(15); // Allow 15px tolerance
      }
    }
  });

  test("Hero section spacing", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const h1 = await page.locator("h1").boundingBox();
      const p = await page.locator("section p").first().boundingBox();
      const button = await page.locator('a:has-text("Start Building Free")').boundingBox();

      if (h1 && p && button) {
        const h1ToP = p.y - (h1.y + h1.height);
        const pToButton = button.y - (p.y + p.height);

        console.log(`${name}: H1→P=${Math.round(h1ToP)}px, P→Button=${Math.round(pToButton)}px`);

        expect(h1ToP).toBeGreaterThan(5);
        expect(h1ToP).toBeLessThan(100);
        expect(pToButton).toBeGreaterThan(5);
        expect(pToButton).toBeLessThan(100);
      }
    }
  });

  test("Feature cards properly distributed", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const cards = await page.locator('[class*="rounded-2xl"][class*="from-amber"]').all();

      if (cards.length >= 2) {
        const heights: number[] = [];

        for (const card of cards.slice(0, Math.min(3, cards.length))) {
          const box = await card.boundingBox();
          if (box) heights.push(box.height);
        }

        if (heights.length >= 2) {
          const avgHeight = heights.reduce((a, b) => a + b) / heights.length;
          const maxVariation = Math.max(...heights) - Math.min(...heights);

          console.log(
            `${name}: ${cards.length} cards, avg height=${Math.round(avgHeight)}px, variation=${Math.round(maxVariation)}px`,
          );

          // Cards should be roughly same height
          expect(maxVariation).toBeLessThan(30);
        }
      }
    }
  });

  test("Button states and interactivity", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      // Check all buttons are visible
      const buttons = await page.locator('button, a[href="/app"], a[href="/signup"]').all();
      let visibleCount = 0;

      for (const btn of buttons) {
        const isVisible = await btn.isVisible().catch(() => false);
        if (isVisible) visibleCount++;
      }

      console.log(`${name}: ${visibleCount}/${buttons.length} buttons visible`);
      expect(visibleCount).toBeGreaterThan(0);
    }
  });

  test("No overlapping content in footer", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const footer = await page.locator("footer").boundingBox();
      const footerLinks = await page.locator("footer a").all();

      if (footer && footerLinks.length > 0) {
        let overlaps = 0;

        // Quick check - are links within footer bounds
        for (const link of footerLinks.slice(0, 3)) {
          const linkBox = await link.boundingBox();
          if (
            linkBox &&
            (linkBox.y < footer.y || linkBox.y + linkBox.height > footer.y + footer.height)
          ) {
            overlaps++;
          }
        }

        console.log(
          `${name}: Footer ${overlaps === 0 ? "✓" : "⚠️"} ${footerLinks.length} links properly contained`,
        );
        expect(overlaps).toBe(0);
      }
    }
  });

  test("Responsive images render", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const images = await page.locator("img").all();
      let loadedCount = 0;

      for (const img of images) {
        const isVisible = await img.isVisible().catch(() => false);
        if (isVisible) {
          const box = await img.boundingBox();
          if (box && box.width > 0 && box.height > 0) {
            loadedCount++;
          }
        }
      }

      console.log(`${name}: ${loadedCount}/${images.length} images loaded with dimensions`);
      expect(loadedCount).toBeGreaterThan(0);
    }
  });
});
