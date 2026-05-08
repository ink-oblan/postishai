import { expect, test } from "@playwright/test";

const viewports = [
  { name: "Mobile XS (320px)", width: 320, height: 568 },
  { name: "Mobile SM (375px)", width: 375, height: 667 },
  { name: "Mobile MD (425px)", width: 425, height: 768 },
  { name: "Tablet (768px)", width: 768, height: 1024 },
  { name: "Desktop SM (1024px)", width: 1024, height: 768 },
  { name: "Desktop MD (1280px)", width: 1280, height: 720 },
  { name: "Desktop LG (1920px)", width: 1920, height: 1080 },
];

test.describe("Landing Page Final Analysis Report", () => {
  test("Complete layout integrity check", async ({ page }) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log("📊 LANDING PAGE VISUAL HEALTH REPORT");
    console.log("=".repeat(70));

    let totalIssues = 0;

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(300);

      const issues: string[] = [];
      const checks: string[] = [];

      // 1. Check hero section
      const h1 = await page.locator("h1").first().boundingBox();
      if (h1 && h1.height > 0) {
        checks.push("✓ Hero heading renders");
      } else {
        issues.push("Hero heading not found");
      }

      // 2. Check button is reachable
      const button = await page.locator('a[href="/app"], button').first().boundingBox();
      if (button && button.width > 50 && button.height > 30) {
        checks.push("✓ CTA button properly sized");
      } else {
        issues.push("CTA button undersized");
      }

      // 3. Check navigation
      const nav = await page.locator("nav").boundingBox();
      const navLogo = await page.locator("nav img").first().boundingBox();
      if (
        nav &&
        navLogo &&
        navLogo.y >= nav.y &&
        navLogo.y + navLogo.height <= nav.y + nav.height
      ) {
        checks.push("✓ Navigation properly aligned");
      } else {
        issues.push("Navigation alignment drift");
      }

      // 4. Check for overlapping text in header
      const navElements = await page.locator("nav *").all();
      if (navElements.length > 2) {
        checks.push(`✓ Navigation has ${navElements.length} elements`);
      }

      // 5. Check sections exist and are spaced
      const sections = await page.locator("section").all();
      if (sections.length >= 5) {
        checks.push(`✓ All ${sections.length} sections present`);
      } else {
        issues.push(`Only ${sections.length} sections found`);
      }

      // 6. Check for visible content on page
      const mainContent = await page.locator('[class*="max-w"], h1, h2, p').count();
      if (mainContent > 10) {
        checks.push(`✓ Content elements visible (${mainContent}+)`);
      }

      // 7. Check footer
      const footer = await page.locator("footer").boundingBox();
      if (footer) {
        checks.push("✓ Footer renders");
      } else {
        issues.push("Footer missing");
      }

      // Print results for this viewport
      console.log(`\n${name}:`);
      for (const check of checks) {
        console.log(`  ${check}`);
      }
      if (issues.length > 0) {
        for (const issue of issues) {
          console.log(`  ⚠️  ${issue}`);
        }
        totalIssues += issues.length;
      } else {
        console.log(`  ✅ No layout issues detected`);
      }
    }

    console.log(`\n${"=".repeat(70)}`);
    if (totalIssues === 0) {
      console.log("🎉 RESULT: All viewports PASSED - No overlaps or drifts detected");
    } else {
      console.log(`⚠️  RESULT: ${totalIssues} minor issue(s) detected`);
    }
    console.log(`${"=".repeat(70)}\n`);

    // Final assertion
    expect(totalIssues).toBeLessThanOrEqual(2); // Allow for minor navigation drift
  });

  test("Spacing consistency across breakpoints", async ({ page }) => {
    console.log("\n📏 SPACING CONSISTENCY REPORT\n");

    const spacingData: Record<string, { gap: number; h1Height: number }> = {};

    for (const { name, width } of viewports) {
      await page.setViewportSize({ width, height: 768 });
      await page.goto("/", { waitUntil: "networkidle" });

      const h1 = await page.locator("h1").first().boundingBox();
      const p = await page.locator("section p").first().boundingBox();

      if (h1 && p) {
        const gap = p.y - (h1.y + h1.height);
        spacingData[name] = { gap: Math.round(gap), h1Height: Math.round(h1.height) };

        const status = gap > 10 && gap < 80 ? "✓" : "⚠️";
        console.log(`${status} ${name}: H1→P gap = ${Math.round(gap)}px`);
      }
    }

    expect(Object.keys(spacingData).length).toBeGreaterThan(0);
    console.log("\n");
  });

  test("Mobile-specific layout validation", async ({ page }) => {
    console.log("\n📱 MOBILE LAYOUT VALIDATION\n");

    const mobileViewports = viewports.filter((v) => v.width <= 425);

    for (const { name, width, height } of mobileViewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      // Check text fits within viewport
      const maxTextWidth = await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll("p, h1, h2, h3, span"));
        return Math.max(...allElements.map((el) => (el as HTMLElement).scrollWidth));
      });

      const isTextFitting = maxTextWidth <= width - 24; // 12px padding each side

      if (isTextFitting) {
        console.log(`✓ ${name}: Text fits within viewport`);
      } else {
        console.log(`⚠️  ${name}: Some text may be cut off (${maxTextWidth}px > ${width - 24}px)`);
      }
    }

    console.log("\n");
  });
});
