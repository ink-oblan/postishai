import { expect, type Page, test } from "@playwright/test";

const PNG_SIGNATURE = "89504e470d0a1a0a";

/** Width and height from a PNG's IHDR chunk, read out of a base64 data URL. */
function pngSizeFromDataUrl(dataUrl: string): { width: number; height: number } | null {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  const bytes = Buffer.from(base64, "base64");
  if (bytes.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) return null;
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function exportedSlideSize(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-testid=slide-stage] canvas");
    if (!canvas) return null;
    // Konva mirrors every Stage onto `window.Konva.stages` once the module has loaded.
    const konva = (
      window as unknown as {
        Konva?: { stages?: { toDataURL: (o: unknown) => string; width: () => number }[] };
      }
    ).Konva;
    const stage = konva?.stages?.[0];
    if (!stage) return null;
    return stage.toDataURL({ mimeType: "image/png", pixelRatio: 1080 / stage.width() });
  });
}

test.describe("carousel", () => {
  test("the carousel post type is offered", async ({ page }) => {
    await page.goto("/posts/new");

    const card = page.getByRole("link", { name: /Carousel/ });
    await expect(card).toBeVisible();
    await expect(card).not.toContainText("Coming soon");
    await expect(card).toHaveAttribute("href", "/posts/new/carousel");
  });

  test("plans, generates, edits and completes a carousel", async ({ page }) => {
    test.setTimeout(6 * 60 * 1000);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // Plan
    await page.goto("/posts/new/carousel");
    await page.getByLabel("Post Title").fill("Five habits that actually stuck");
    await page.getByLabel("Slides").fill("3");
    await page.getByRole("button", { name: "Plan the carousel" }).click();

    await page.waitForURL(/\/posts\/[a-z0-9]+$/, { timeout: 120_000 });
    await expect(page.getByTestId("scenario-slide")).toHaveCount(3);

    // Edit the plan and confirm it survives a reload
    const firstHeadline = page.locator("#headline-0");
    await firstHeadline.fill("Edited headline");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expect(page.getByText("Save plan")).toBeVisible();
    await page.waitForTimeout(1000);
    await page.reload();
    await expect(page.locator("#headline-0")).toHaveValue("Edited headline");

    // Approve and wait for the backgrounds
    await page.getByRole("button", { name: "Approve and generate slides" }).click();
    await expect(page.getByTestId("slide-stage")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("filmstrip-slide")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Complete post" })).toBeEnabled({
      timeout: 5 * 60 * 1000,
    });

    // The assertion that matters: the export lands on exactly the platform canvas size.
    const dataUrl = await exportedSlideSize(page);
    expect(dataUrl).toBeTruthy();
    expect(pngSizeFromDataUrl(dataUrl as string)).toEqual({ width: 1080, height: 1350 });

    // Complete the post
    await page.getByRole("button", { name: "Complete post" }).click();
    await expect(page.getByText(/Caption|caption/).first()).toBeVisible({ timeout: 120_000 });

    expect(consoleErrors).toEqual([]);
  });
});
