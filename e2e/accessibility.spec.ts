import { test, expect } from "@playwright/test";

test.describe("Accessibility - Unauthenticated", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("text=Welcome back", { timeout: 10000 });
  });

  test("A11Y-001: form elements should have labels", async ({ page }) => {
    // Check email input has label
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();

    // Check password input has label
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toBeVisible();
  });

  test("A11Y-002: buttons should have accessible names", async ({ page }) => {
    const signInButton = page.getByRole("button", { name: "Sign In" });
    await expect(signInButton).toBeVisible();
  });

  test("A11Y-003: title text should be present", async ({ page }) => {
    // CardTitle is a div, not a heading element
    await expect(page.getByText("Welcome back")).toBeVisible();
  });

  test("A11Y-004: keyboard navigation should work on form", async ({ page }) => {
    // Tab through the form elements
    await page.keyboard.press("Tab");

    // Should eventually focus an input or button
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

test.describe("Accessibility - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Supabase auth API calls
    await page.route("**/auth/v1/token**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockSession),
      });
    });

    await page.route("**/auth/v1/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockUser),
      });
    });

    // Mock credits endpoint
    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ balance: 50, lifetime_granted: 50, lifetime_used: 0 }]),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "sb-ugvrangptgrojipazqxh-auth-token",
        JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          expires_at: Date.now() + 3600000,
          user: {
            id: "test-user-id",
            email: "test@example.com",
            aud: "authenticated",
            role: "authenticated",
          },
        })
      );
    });
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });
  });

  test("A11Y-005: page should have main landmark", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("A11Y-006: dialog should have proper role when open", async ({ page }) => {
    // Open wizard
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet");
    await createButton.click();

    // Dialog should have proper role
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
  });

  test("A11Y-007: interactive elements should be focusable", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);

    await promptArea.focus();
    await expect(promptArea).toBeFocused();
  });

  test("A11Y-008: focus should be visible", async ({ page }) => {
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
