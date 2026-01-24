import { test, expect } from "@playwright/test";

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

test.describe("Dashboard Layout", () => {
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

    // Set up mock auth state via localStorage
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
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("DASH-007: should show Inspiration panel", async ({ page }) => {
    await expect(page.getByText("Design Inspiration")).toBeVisible();
  });

  test("DASH-008: should show header with user info", async ({ page }) => {
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();
  });
});
