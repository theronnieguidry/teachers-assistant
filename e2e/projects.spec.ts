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

test.describe("Projects Panel", () => {
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

    // Mock projects endpoint (empty list)
    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Set up mock auth state
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

  test("PROJ-001: should show Projects panel title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });
});

test.describe("Projects Panel - Action Buttons", () => {
  const mockProject = {
    id: "test-project-1",
    user_id: "test-user-id",
    title: "Test Math Worksheet",
    description: null,
    prompt: "Create a math worksheet about addition",
    grade: "2",
    subject: "Math",
    options: { questionCount: 10, includeVisuals: true, difficulty: "medium" },
    inspiration: [],
    output_path: null,
    status: "completed",
    error_message: null,
    credits_used: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  };

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

    // Mock projects endpoint with a project
    await page.route("**/rest/v1/projects**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockProject]),
        });
      } else if (route.request().method() === "POST") {
        // Handle duplicate project creation
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([{ ...mockProject, id: "test-project-2", title: "Test Math Worksheet (Copy)" }]),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    // Set up mock auth state
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

  test("PROJ-005: regenerate button opens wizard with pre-filled data", async ({ page }) => {
    // Wait for project to appear
    await expect(page.getByText("Test Math Worksheet")).toBeVisible({ timeout: 10000 });

    // Hover over the project to show action buttons
    await page.getByText("Test Math Worksheet").hover();

    // Click the regenerate button (RefreshCw icon in the action row, not the header)
    const projectItem = page.locator(".group").filter({ hasText: "Test Math Worksheet" });
    const regenerateButton = projectItem.locator("button[title='Regenerate']");
    await regenerateButton.click();

    // Wizard should open
    await expect(page.getByRole("dialog")).toBeVisible();

    // Title should be pre-filled (wizard step 1 shows title input, not prompt textarea)
    await expect(page.getByLabel("Project Title")).toHaveValue("Test Math Worksheet");

    // Dialog header should show the project title
    await expect(page.getByRole("dialog").getByText("Create: Test Math Worksheet")).toBeVisible();
  });

  test("PROJ-007: duplicate button creates project copy", async ({ page }) => {
    // Wait for project to appear
    await expect(page.getByText("Test Math Worksheet")).toBeVisible({ timeout: 10000 });

    // Hover over the project to show action buttons
    await page.getByText("Test Math Worksheet").hover();

    // Click the duplicate button
    const projectItem = page.locator(".group").filter({ hasText: "Test Math Worksheet" });
    const duplicateButton = projectItem.locator("button[title='Duplicate']");
    await duplicateButton.click();

    // Should see success toast or the duplicated project
    await expect(page.getByText(/duplicated|Copy/i)).toBeVisible({ timeout: 5000 });
  });

  test("PROJ-009: project action buttons show on hover", async ({ page }) => {
    // Wait for project to appear
    await expect(page.getByText("Test Math Worksheet")).toBeVisible({ timeout: 10000 });

    // Action buttons should be hidden initially (opacity-0)
    const projectItem = page.locator(".group").filter({ hasText: "Test Math Worksheet" });
    const actionButtons = projectItem.locator("button[title='Regenerate']");

    // Hover over the project
    await page.getByText("Test Math Worksheet").hover();

    // Action buttons should now be visible
    await expect(actionButtons).toBeVisible();
  });
});
