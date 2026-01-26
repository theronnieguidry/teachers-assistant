import { test, expect } from "./fixtures";
import { test as baseTest } from "@playwright/test";

// Unauthenticated tests use the base Playwright test (no fixtures needed)
baseTest.describe("Accessibility - Unauthenticated", () => {
  baseTest.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });
  });

  baseTest("A11Y-001: form elements should have labels", async ({ page }) => {
    // Check email input has label
    const emailInput = page.getByLabel("Email");
    await baseTest.expect(emailInput).toBeVisible();

    // Check password input has label
    const passwordInput = page.getByLabel("Password");
    await baseTest.expect(passwordInput).toBeVisible();
  });

  baseTest("A11Y-002: buttons should have accessible names", async ({ page }) => {
    const signInButton = page.getByRole("button", { name: "Sign In" });
    await baseTest.expect(signInButton).toBeVisible();
  });

  baseTest("A11Y-003: title text should be present", async ({ page }) => {
    // CardTitle is a div, not a heading element
    await baseTest.expect(page.getByText("Welcome back")).toBeVisible();
  });

  baseTest("A11Y-004: keyboard navigation should work on form", async ({ page }) => {
    // Tab through the form elements
    await page.keyboard.press("Tab");

    // Should eventually focus an input or button
    const focusedElement = page.locator(":focus");
    await baseTest.expect(focusedElement).toBeVisible();
  });
});

test.describe("Accessibility - Authenticated", () => {
  test("A11Y-005: page should have main landmark", async ({ authenticatedPage: page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("A11Y-006: dialog should have proper role when open", async ({ authenticatedPage: page }) => {
    // Open wizard
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet");
    await createButton.click();

    // Dialog should have proper role
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });

  test("A11Y-007: interactive elements should be focusable", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);

    await promptArea.focus();
    await expect(promptArea).toBeFocused();
  });

  test("A11Y-008: focus should be visible", async ({ authenticatedPage: page }) => {
    // First enable the Create button by entering text
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    await promptArea.fill("Create a math worksheet about addition");

    // Now the Create button should be enabled and focusable
    const createButton = page.getByRole("button", { name: /create/i });
    await createButton.focus();

    // Button should be focused
    await expect(createButton).toBeFocused();
  });
});
