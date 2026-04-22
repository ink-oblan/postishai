import { expect, test } from "@playwright/test";

test.describe("Login page", () => {
  test("loads and displays the login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: "PostishAI" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("has a Google sign-in link", async ({ page }) => {
    await page.goto("/login");

    const googleLink = page.getByRole("link", { name: /Continue with Google/i });
    await expect(googleLink).toBeVisible();
    await expect(googleLink).toHaveAttribute("href", "/api/auth/google");
  });

  test("can switch between login and register modes", async ({ page }) => {
    await page.goto("/login");

    // Start in login mode - no name field
    await expect(page.getByLabel("Name")).not.toBeVisible();

    // Switch to register
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();

    // Switch back to login
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByLabel("Name")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
