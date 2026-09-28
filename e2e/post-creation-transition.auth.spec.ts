import { expect, type Page, test } from "@playwright/test";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

async function fillPost(page: Page, title: string) {
  const response = await page.request.get("/api/avatars");
  expect(response.ok()).toBeTruthy();
  const avatars = await response.json();
  expect(avatars.length, "The test account needs an avatar").toBeGreaterThan(0);
  await page.goto(`/posts/new/avatar?avatarId=${avatars[0].id}`);
  await page.getByLabel("Post Title").fill(title);
  await page.getByLabel("Script (spoken text)").fill("A short script for the mock preview.");
}

test.describe("avatar post creation transition", () => {
  test.skip(process.env.MOCK_MODE !== "true", "Run with a mock-mode app and worker");
  test.setTimeout(90_000);

  test("stays busy through a delayed creation response and navigation", async ({ page }) => {
    const creation = gate();
    const navigation = gate();
    const navigationStarted = gate();
    const title = `Transition preview ${Date.now()}`;
    let requests = 0;

    await page.route("**/api/posts", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      requests++;
      await creation.promise;
      await route.fulfill({ response: await route.fetch() });
    });
    await page.route(/\/posts\/[^/?]+\?_rsc=/, async (route) => {
      if (route.request().url().includes("/posts/new")) return route.continue();
      navigationStarted.release();
      await navigation.promise;
      await route.continue();
    });

    try {
      await fillPost(page, title);
      await page.getByRole("button", { name: "Create Post", exact: true }).click();
      const creating = page.getByRole("button", { name: "Creating...", exact: true });
      await expect(creating).toBeDisabled();
      await expect(creating.locator(".animate-spin")).toBeVisible();
      await expect(page.getByRole("button", { name: "Back", exact: true })).toBeDisabled();

      creation.release();
      await navigationStarted.promise;
      await expect(page.getByText("Post created! Metadata generation started.")).toBeVisible();
      await expect(creating).toBeDisabled();
      await expect(creating.locator(".animate-spin")).toBeVisible();
      await expect(page.getByRole("button", { name: "Back", exact: true })).toBeDisabled();
      expect(requests).toBe(1);
      await page.screenshot({ path: "test-results/post-creation-pending.png" });

      navigation.release();
      await expect(page).toHaveURL(/\/posts\/[^/?]+$/);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(creating).toHaveCount(0);
      await expect(page.getByText(/Mock generated caption/).first()).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      creation.release();
      navigation.release();
    }
  });

  test("restores the form after failure and allows a successful retry", async ({ page }) => {
    let attempts = 0;
    await page.route("**/api/posts", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      attempts++;
      if (attempts === 1) {
        return route.fulfill({ status: 500, json: { error: "Please retry this test post" } });
      }
      await route.continue();
    });
    const title = `Retry preview ${Date.now()}`;
    await fillPost(page, title);
    const create = page.getByRole("button", { name: "Create Post", exact: true });
    await create.click();
    await expect(page.getByText("Please retry this test post")).toBeVisible();
    await expect(create).toBeEnabled();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toBeEnabled();
    await expect(page.getByLabel("Post Title")).toHaveValue(title);
    await create.click();
    await expect(page).toHaveURL(/\/posts\/[^/?]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    expect(attempts).toBe(2);
  });
});
