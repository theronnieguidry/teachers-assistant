import { test, expect } from "@playwright/test";

test.describe("Dashboard Layout", () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock auth state via localStorage
    await page.addInitScript(() => {
      localStorage.setItem(
        "sb-localhost-auth-token",
        JSON.stringify({
          access_token: "test-token",
          refresh_token: "test-refresh",
          expires_at: Date.now() + 3600000,
          user: {
            id: "test-user-id",
            email: "test@example.com",
          },
        })
      );
    });
    await page.goto("/");
    // Wait for dashboard to load
    await page.waitForSelector("main", { timeout: 10000 });
  });

  test("DASH-001: should render main content area", async ({ page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("DASH-002: should show creation panel with prompt textarea", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    await expect(promptArea).toBeVisible();
  });

  test("DASH-003: should show Create button", async ({ page }) => {
    const createButton = page.getByRole("button", { name: /create/i });
    await expect(createButton).toBeVisible();
  });

  test("DASH-004: should disable Create button for short prompts", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("short");
    await expect(createButton).toBeDisabled();
  });

  test("DASH-005: should enable Create button for valid prompts", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition for 2nd graders");
    await expect(createButton).toBeEnabled();
  });

  test("DASH-006: should show Projects panel", async ({ page }) => {
    await expect(page.getByText("Projects")).toBeVisible();
  });

  test("DASH-007: should show Inspiration panel", async ({ page }) => {
    await expect(page.getByText("Design Inspiration")).toBeVisible();
  });

  test("DASH-008: should show header with user info", async ({ page }) => {
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();
  });
});
