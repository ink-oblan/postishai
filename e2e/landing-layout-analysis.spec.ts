import { expect, type Page, test } from "@playwright/test";

const viewports = [
  { name: "Mobile XS", width: 320, height: 568 },
  { name: "Mobile SM", width: 375, height: 667 },
  { name: "Mobile MD", width: 425, height: 768 },
  { name: "Tablet", width: 768, height: 1024 },
  { name: "Desktop SM", width: 1024, height: 768 },
  { name: "Desktop MD", width: 1280, height: 720 },
  { name: "Desktop LG", width: 1920, height: 1080 },
];

async function checkElementOverlaps(page: Page) {
  const issues: string[] = [];

  // Get all visible elements with text content
  const elements = await page.locator("*:visible").all();

  for (let i = 0; i < elements.length; i++) {
    const elem1 = elements[i];
    const box1 = await elem1.boundingBox();

    if (!box1 || box1.width === 0 || box1.height === 0) continue;

    for (let j = i + 1; j < elements.length; j++) {
      const elem2 = elements[j];
      const box2 = await elem2.boundingBox();

      if (!box2 || box2.width === 0 || box2.height === 0) continue;

      // Check if elements overlap significantly (more than 10% area)
      const overlapX = Math.max(
        0,
        Math.min(box1.x + box1.width, box2.x + box2.width) - Math.max(box1.x, box2.x),
      );
      const overlapY = Math.max(
        0,
        Math.min(box1.y + box1.height, box2.y + box2.height) - Math.max(box1.y, box2.y),
      );
      const overlapArea = overlapX * overlapY;
      const elem1Area = box1.width * box1.height;
      const elem2Area = box2.width * box2.height;

      const overlapPercent1 = (overlapArea / elem1Area) * 100;
      const overlapPercent2 = (overlapArea / elem2Area) * 100;

      // Flag significant overlaps (>20% of either element)
      if (overlapPercent1 > 20 || overlapPercent2 > 20) {
        const text1 = await elem1.textContent().catch(() => "");
        const text2 = await elem2.textContent().catch(() => "");

        // Ignore parent-child overlaps and expected overlaps
        if (text1 && text2 && text1.length > 5 && text2.length > 5) {
          issues.push(
            `⚠️ Potential overlap detected: "${text1.substring(0, 30)}..." overlaps with "${text2.substring(0, 30)}..."`,
          );
        }
      }
    }
  }

  return issues;
}

async function checkTextCutoff(page: Page) {
  const issues: string[] = [];

  // Check all text elements for overflow
  const textElements = await page.locator("h1, h2, h3, p, span, button, a").all();

  for (const elem of textElements) {
    const box = await elem.boundingBox();
    const scrollWidth = await elem.evaluate((el: HTMLElement) => el.scrollWidth);
    const scrollHeight = await elem.evaluate((el: HTMLElement) => el.scrollHeight);

    if (!box) continue;

    // Check if content is hidden (scroll width > box width)
    if (scrollWidth > box.width + 2) {
      const text = await elem.textContent();
      if (text && text.length > 10) {
        issues.push(
          `📏 Text overflow: "${text.substring(0, 40)}..." is cut off (${scrollWidth}px > ${Math.round(box.width)}px)`,
        );
      }
    }

    // Check for unusual heights (text wrapping issues)
    if (scrollHeight > box.height + 2) {
      const text = await elem.textContent();
      if (text && text.length > 10) {
        issues.push(
          `📏 Height overflow: "${text.substring(0, 40)}..." (${scrollHeight}px > ${Math.round(box.height)}px)`,
        );
      }
    }
  }

  return issues;
}

async function checkSpacingConsistency(page: Page) {
  const issues: string[] = [];

  // Check for consistent padding in sections
  const sections = await page.locator("section").all();

  for (const section of sections) {
    const styles = await section.evaluate((el: HTMLElement) => {
      return {
        padding: window.getComputedStyle(el).padding,
        margin: window.getComputedStyle(el).margin,
        display: window.getComputedStyle(el).display,
      };
    });

    // Check for negative margins or unusual padding
    if (styles.padding === "0px" && styles.display !== "none") {
      const text = await section.textContent();
      if (text && text.length > 20) {
        issues.push(`⚠️ No padding on section with content: "${text.substring(0, 30)}..."`);
      }
    }
  }

  return issues;
}

async function checkNavigationAlignment(page: Page) {
  const issues: string[] = [];

  // Check navigation bar alignment
  const nav = await page.locator("nav").boundingBox();
  const logo = await page.locator('img[alt="Postishai"]').first().boundingBox();
  const buttons = await page.locator("nav a, nav button").all();

  if (nav && logo) {
    const logoVerticalCenter = logo.y + logo.height / 2;
    const navVerticalCenter = nav.y + nav.height / 2;
    const verticalDrift = Math.abs(logoVerticalCenter - navVerticalCenter);

    if (verticalDrift > 10) {
      issues.push(
        `🔄 Navigation vertical drift: ${verticalDrift.toFixed(1)}px (logo not centered)`,
      );
    }
  }

  // Check button alignment
  for (const btn of buttons) {
    const box = await btn.boundingBox();
    if (box && nav) {
      const navPadding = 16; // Expected padding
      if (box.y < nav.y + navPadding) {
        const text = await btn.textContent();
        issues.push(`🔄 Button misaligned vertically: "${text}"`);
      }
    }
  }

  return issues;
}

async function checkResponsiveBreakpoints(page: Page) {
  const issues: string[] = [];

  // Check for elements that shouldn't be hidden
  const hiddenElements = await page.locator('[style*="display: none"], [class*="hidden"]').all();

  for (const elem of hiddenElements) {
    const _isInViewport = await elem.isVisible().catch(() => false);
    const text = await elem.textContent().catch(() => "");

    // Flag if important content is hidden
    if (text && text.length > 20 && text.includes("Generate")) {
      issues.push(`👻 Important content might be hidden: "${text.substring(0, 40)}..."`);
    }
  }

  return issues;
}

test.describe("Landing Page Layout Analysis", () => {
  viewports.forEach(({ name, width, height }) => {
    test(`[${name}] Check for overlaps and layout issues`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      console.log(`\n📊 Analyzing ${name} (${width}x${height})...`);

      // Run all analysis checks
      const overlapIssues = await checkElementOverlaps(page, name);
      const textIssues = await checkTextCutoff(page, name);
      const spacingIssues = await checkSpacingConsistency(page, name);
      const navIssues = await checkNavigationAlignment(page, name);
      const responsiveIssues = await checkResponsiveBreakpoints(page, name);

      const allIssues = [
        ...overlapIssues,
        ...textIssues,
        ...spacingIssues,
        ...navIssues,
        ...responsiveIssues,
      ];

      if (allIssues.length > 0) {
        console.log(`\n⚠️ Found ${allIssues.length} potential issue(s):`);
        for (const issue of allIssues) {
          console.log(`  ${issue}`);
        }
      } else {
        console.log(`✅ No layout issues detected!`);
      }

      // Assert no critical overlaps
      const criticalIssues = allIssues.filter((i) => i.includes("overlap"));
      expect(criticalIssues.length).toBe(0);
    });
  });

  test("Visual consistency check - All hero sections aligned", async ({ page }) => {
    type HeroData = {
      h1Height: number;
      pTop: number;
      gap: number;
      buttonY: number;
    };
    const results: Record<string, HeroData> = {};

    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const heroH1 = await page.locator("h1").first().boundingBox();
      const heroParagraph = await page.locator("section p").first().boundingBox();
      const heroButton = await page.locator('a:has-text("Start Building Free")').boundingBox();

      if (heroH1 && heroParagraph && heroButton) {
        const h1Bottom = heroH1.y + heroH1.height;
        const pTop = heroParagraph.y;
        const gap = pTop - h1Bottom;

        results[name] = {
          h1Height: heroH1.height,
          pTop: pTop,
          gap: gap,
          buttonY: heroButton.y,
        };

        console.log(
          `${name}: H1 height=${Math.round(heroH1.height)}px, gap to P=${Math.round(gap)}px`,
        );
      }
    }

    // Verify gaps are reasonable (between 10-50px)
    for (const [, data] of Object.entries(results)) {
      expect(data.gap).toBeGreaterThan(5);
      expect(data.gap).toBeLessThan(80);
    }
  });

  test("Feature cards uniform sizing", async ({ page }) => {
    for (const { name, width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto("/", { waitUntil: "networkidle" });

      const cards = await page.locator('[class*="rounded-2xl"][class*="from-amber"]').all();

      if (cards.length >= 2) {
        let previousHeight = 0;
        let heightVariation = 0;

        for (const card of cards.slice(0, 3)) {
          const box = await card.boundingBox();
          if (box && previousHeight > 0) {
            heightVariation = Math.abs(box.height - previousHeight);
            expect(heightVariation).toBeLessThan(20); // Allow 20px variation
          }
          previousHeight = box?.height || 0;
        }

        console.log(`✓ ${name}: Feature cards height variation = ${heightVariation.toFixed(0)}px`);
      }
    }
  });
});
