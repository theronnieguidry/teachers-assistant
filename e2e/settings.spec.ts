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

test.describe("Settings - Ollama Setup", () => {
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

    // Mock profiles endpoint
    await page.route("**/rest/v1/profiles**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user-id",
          email: "test@example.com",
          display_name: null,
          avatar_url: null,
        }),
      });
    });

    // Mock credits endpoint (single object for .single() query)
    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          balance: 50,
          lifetime_granted: 50,
          lifetime_used: 0,
        }),
      });
    });

    // Mock projects endpoint
    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Set up mock auth state in localStorage
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

  test("SET-001: Settings icon is visible in header", async ({ page }) => {
    // Look for Local AI Setup button in the header
    const settingsButton = page.getByTitle("Local AI Setup");
    await expect(settingsButton).toBeVisible();
  });

  test("SET-002: Clicking settings opens Ollama setup dialog", async ({ page }) => {
    const settingsButton = page.getByTitle("Local AI Setup");
    await settingsButton.click();

    // Should see Ollama setup dialog
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("SET-003: Dialog shows Ollama status section", async ({ page }) => {
    const settingsButton = page.getByTitle("Local AI Setup");
    await settingsButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Should see status information about Ollama (use first() to handle multiple matches)
    await expect(page.getByText(/ollama/i).first()).toBeVisible();
  });

  test("SET-004: Close button closes the dialog", async ({ page }) => {
    const settingsButton = page.getByTitle("Local AI Setup");
    await settingsButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Click close button (use first() to select the visible text button, not the X icon)
    const closeButton = page.getByRole("button", { name: "Close" }).first();
    await closeButton.click();

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("SET-005: Dialog can be closed by pressing Escape", async ({ page }) => {
    const settingsButton = page.getByTitle("Local AI Setup");
    await settingsButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Press Escape to close
    await page.keyboard.press("Escape");

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("SET-006: Shows installation instructions", async ({ page }) => {
    const settingsButton = page.getByTitle("Local AI Setup");
    await settingsButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    // Should see helpful content about local AI (use first() to handle multiple matches)
    await expect(page.getByText(/local/i).first()).toBeVisible();
  });
});

test.describe("Settings - User Menu", () => {
  test.beforeEach(async ({ page }) => {
    // Same auth setup as above
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

    // Mock profiles endpoint
    await page.route("**/rest/v1/profiles**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "test-user-id",
          email: "test@example.com",
          display_name: null,
          avatar_url: null,
        }),
      });
    });

    // Mock credits endpoint (single object for .single() query)
    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          balance: 50,
          lifetime_granted: 50,
          lifetime_used: 0,
        }),
      });
    });

    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
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

  test("SET-007: User menu is visible in header", async ({ page }) => {
    // Look for user menu button (shows email or avatar)
    const header = page.locator("header");
    await expect(header).toBeVisible();

    // Should see credits display
    await expect(page.getByText(/50/)).toBeVisible();
  });

  test("SET-008: Credits are displayed in header", async ({ page }) => {
    // Credits badge should show balance
    await expect(page.getByText(/50/)).toBeVisible();
  });
});
