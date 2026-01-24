import { test, expect } from "@playwright/test";

test.describe("Projects Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock auth state
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
    await page.waitForSelector("main", { timeout: 10000 });
  });

  test("PROJ-001: should show Projects panel title", async ({ page }) => {
    await expect(page.getByText("Projects")).toBeVisible();
  });

  test("PROJ-002: should show refresh button with icon", async ({ page }) => {
    // The refresh button is next to the Projects title and contains RefreshCw icon
    const refreshButton = page.locator("button").filter({ has: page.locator("svg.lucide-refresh-cw") });
    await expect(refreshButton).toBeVisible();
  });

  test("PROJ-003: shows empty state when no projects", async ({ page }) => {
    // Wait for Projects heading to be visible first
    await expect(page.getByText("Projects", { exact: true })).toBeVisible();

    // Wait for loading to complete and empty state to show
    // The API might fail or return empty, either way we expect the empty state
    await expect(page.getByText("No projects yet")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Create your first teaching material above")).toBeVisible();
  });

  test("PROJ-004: refresh button is clickable", async ({ page }) => {
    const refreshButton = page.locator("button").filter({ has: page.locator("svg.lucide-refresh-cw") });

    // Click should not throw error
    await refreshButton.click();

    // Projects panel should still be visible
    await expect(page.getByText("Projects")).toBeVisible();
  });
});
