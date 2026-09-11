import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

/**
 * Pinned here rather than imported so the test states the contract independently of the code it
 * is checking — a safe zone that quietly changes should fail this, not be adopted by it.
 */
const CANVASES = {
  INSTAGRAM: { width: 1080, height: 1350, safeZone: { top: 50, right: 50, bottom: 200, left: 50 } },
  TIKTOK: { width: 1080, height: 1920, safeZone: { top: 150, right: 50, bottom: 380, left: 50 } },
} as const;

type PlatformName = keyof typeof CANVASES;

/** Rounding at the edges of a restack is fine; a collision you could see on the slide is not. */
const TOLERANCE = 2;

interface TextBox {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function safeAreaOf(platform: PlatformName) {
  const { width, height, safeZone } = CANVASES[platform];
  return {
    x: safeZone.left,
    y: safeZone.top,
    width: width - safeZone.left - safeZone.right,
    height: height - safeZone.top - safeZone.bottom,
  };
}

/**
 * Geometry as Konva actually laid it out, not as the document claims. Text nodes are auto-height,
 * so `height()` here is the wrapped height the slide really draws — which is the whole point.
 */
function textBoxes(page: Page): Promise<TextBox[]> {
  return page.evaluate(() => {
    const konva = (
      window as unknown as {
        Konva?: {
          stages?: {
            find: (selector: string) => {
              id: () => string;
              text: () => string;
              x: () => number;
              y: () => number;
              width: () => number;
              height: () => number;
            }[];
          }[];
        };
      }
    ).Konva;

    const stage = konva?.stages?.[0];
    if (!stage) return [];

    return stage.find("Text").map((node) => ({
      id: node.id(),
      text: node.text(),
      x: node.x(),
      y: node.y(),
      width: node.width(),
      height: node.height(),
    }));
  });
}

function overlaps(a: TextBox, b: TextBox): boolean {
  return (
    a.x < b.x + b.width - TOLERANCE &&
    b.x < a.x + a.width - TOLERANCE &&
    a.y < b.y + b.height - TOLERANCE &&
    b.y < a.y + a.height - TOLERANCE
  );
}

/**
 * Every way a slide's stack can be wrong, as readable strings so a failure explains itself. The
 * two readiness checks come first and are deliberately faults rather than a separate assertion:
 * polling on a stage that has not drawn yet would otherwise pass on an empty list, and polling
 * straight after a filmstrip click would pass on the slide that is still on screen.
 */
function faults(boxes: TextBox[], area: ReturnType<typeof safeAreaOf>, headline: string): string[] {
  if (boxes.length === 0) return ["the stage has drawn no text"];
  if (headline && !boxes.some((box) => box.text === headline)) {
    return [`the stage is still showing another slide (want "${headline}")`];
  }

  const problems: string[] = [];

  for (const [index, box] of boxes.entries()) {
    const label = `"${box.text.slice(0, 32).replace(/\n/g, " ")}"`;

    if (box.y < area.y - TOLERANCE) {
      problems.push(`${label} starts above the safe area (y=${Math.round(box.y)} < ${area.y})`);
    }
    if (box.y + box.height > area.y + area.height + TOLERANCE) {
      problems.push(
        `${label} runs past the safe area (bottom=${Math.round(box.y + box.height)} > ${
          area.y + area.height
        })`,
      );
    }
    if (box.x < area.x - TOLERANCE || box.x + box.width > area.x + area.width + TOLERANCE) {
      problems.push(`${label} sits outside the safe area horizontally`);
    }

    for (const other of boxes.slice(index + 1)) {
      if (overlaps(box, other)) {
        problems.push(
          `${label} overlaps "${other.text.slice(0, 32).replace(/\n/g, " ")}" ` +
            `(${Math.round(box.y)}+${Math.round(box.height)} vs ${Math.round(other.y)})`,
        );
      }
    }
  }

  // The generator stacks heading above body, and a restack must not reshuffle that.
  for (let index = 1; index < boxes.length; index++) {
    if (boxes[index].y < boxes[index - 1].y) {
      problems.push(`block ${index} was stacked above the block before it`);
    }
  }

  return problems;
}

async function createCarousel(
  request: APIRequestContext,
  options: { title: string; platform: PlatformName; slideCount: number },
): Promise<string> {
  const created = await request.post("/api/posts/carousel", { data: options, timeout: 120_000 });
  expect(created.ok(), `plan failed: ${created.status()} ${await created.text()}`).toBeTruthy();
  const post = await created.json();

  const generated = await request.post(`/api/posts/${post.id}/carousel/generate`, {
    data: {},
    timeout: 120_000,
  });
  expect(
    generated.ok(),
    `generate failed: ${generated.status()} ${await generated.text()}`,
  ).toBeTruthy();

  return post.id as string;
}

/**
 * Mock mode plans every carousel from a fixed bank of deliberately awkward copy, so a handful of
 * posts across both canvas shapes covers each layout with headlines that wrap unpredictably.
 */
const CASES: { title: string; platform: PlatformName; slideCount: number }[] = [
  { title: "The Evolution of Performance", platform: "INSTAGRAM", slideCount: 7 },
  { title: "WHY YOUR MOMENTUM KEEPS STALLING", platform: "INSTAGRAM", slideCount: 5 },
  { title: "Workmanship & Wonder", platform: "TIKTOK", slideCount: 6 },
  { title: "Uncompromising commitment, measured", platform: "TIKTOK", slideCount: 4 },
];

test.describe("carousel layout", () => {
  test("generated slides never overlap or leave the safe area", async ({ page, request }) => {
    test.setTimeout(8 * 60 * 1000);

    const posts = await Promise.all(
      CASES.map(async (options) => ({
        ...options,
        id: await createCarousel(request, options),
      })),
    );

    for (const post of posts) {
      await test.step(`${post.platform} — ${post.title}`, async () => {
        await page.goto(`/posts/${post.id}`);
        await expect(page.getByTestId("slide-stage")).toBeVisible({ timeout: 60_000 });

        const slides = page.getByTestId("filmstrip-slide");
        await expect(slides).toHaveCount(post.slideCount);

        const area = safeAreaOf(post.platform);

        for (let index = 0; index < post.slideCount; index++) {
          const slide = slides.nth(index);
          // The filmstrip labels each thumbnail with its headline, which is what ties the
          // geometry read off the stage to the slide it is supposed to belong to.
          const headline = (await slide.getAttribute("title")) ?? "";
          await slide.click();

          // Polls because the restack waits on the webfonts before it can measure anything.
          await expect
            .poll(async () => faults(await textBoxes(page), area, headline), {
              timeout: 20_000,
              message: `slide ${index + 1} of ${post.slideCount}`,
            })
            .toEqual([]);
        }
      });
    }
  });
});
