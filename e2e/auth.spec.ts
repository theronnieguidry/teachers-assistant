import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("AUTH-001: should display login form", async ({ page }) => {
    // Wait for loading to complete
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    // Expect to see the login form (CardTitle is div, not heading)
    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
  });

  test("AUTH-002: should show signup link", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  });

  test("AUTH-003: form requires valid input to submit", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    // Fill with valid format (browser validation passes)
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");

    // Click submit - since we have no backend, it should show loading or error
    await page.getByRole("button", { name: "Sign In" }).click();

    // Form should still be visible (no navigation without real auth)
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("AUTH-004: should toggle to signup form", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    await page.getByRole("button", { name: "Sign up" }).click();

    // Should see signup form elements (CardTitle is div)
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
  });

  test("AUTH-005: signup form has password confirmation", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    // Navigate to signup
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("Create an account")).toBeVisible();

    // Fill form with valid format
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByLabel("Confirm Password").fill("password123");

    // Submit button should be clickable
    await expect(page.getByRole("button", { name: "Create Account" })).toBeEnabled();
  });

  test("AUTH-006: signup form shows trial credits banner", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    // Navigate to signup
    await page.getByRole("button", { name: "Sign up" }).click();

    // Should see trial credits offer
    await expect(page.getByText("50 free credits")).toBeVisible();
  });

  test("AUTH-007: password field is masked", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    const passwordInput = page.getByLabel("Password");

    // Password input should be type="password"
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("AUTH-008: should switch back to login from signup", async ({ page }) => {
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });

    // Go to signup
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("Create an account")).toBeVisible();

    // Go back to login (lowercase "Sign in" button)
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Welcome back")).toBeVisible();
  });
});
