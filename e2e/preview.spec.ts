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

const mockCompletedProject = {
  id: "project-completed",
  user_id: "test-user-id",
  title: "Addition Worksheet",
  description: null,
  prompt: "Create a math worksheet about addition",
  grade: "2",
  subject: "Math",
  options: { questionCount: 10, difficulty: "medium" },
  inspiration: [],
  output_path: null,
  status: "completed",
  error_message: null,
  credits_used: 5,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
};

const mockProjectVersion = {
  id: "version-1",
  project_id: "project-completed",
  worksheet_html: "<h1>Math Worksheet</h1><p>Question 1: 2 + 3 = ?</p>",
  lesson_plan_html: "<h1>Lesson Plan</h1><p>Objectives: Learn addition</p>",
  answer_key_html: "<h1>Answer Key</h1><p>1. 5</p>",
  ai_provider: "claude",
  ai_model: "claude-sonnet-4",
  input_tokens: 500,
  output_tokens: 1000,
  created_at: new Date().toISOString(),
};

test.describe("Project Preview", () => {
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

    // Mock projects endpoint with completed project
    await page.route("**/rest/v1/projects**", async (route) => {
      const url = route.request().url();
      if (url.includes("select=")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockCompletedProject]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([mockCompletedProject]),
        });
      }
    });

    // Mock project versions endpoint - single() expects an object, not array
    await page.route("**/rest/v1/project_versions**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjectVersion),
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

  test("PRV-001: Project list shows completed project", async ({ page }) => {
    // Should see project in the list
    await expect(page.getByText("Addition Worksheet")).toBeVisible();
  });

  test("PRV-002: Clicking project shows preview panel", async ({ page }) => {
    // Click on the project in sidebar to select it
    await page.getByText("Addition Worksheet").click();

    // Switch to Projects tab to see the preview
    await page.getByRole("tab", { name: "Projects" }).click();

    // Should see project preview with title (h1 in main content area)
    await expect(page.locator("h1", { hasText: "Addition Worksheet" })).toBeVisible();
  });

  test("PRV-003: Preview shows project status", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    // Should see completed status badge
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  });

  test("PRV-004: Preview shows prompt", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    // Should see the original prompt
    await expect(page.getByText(/create a math worksheet about addition/i)).toBeVisible();
  });

  test("PRV-005: Preview shows View Materials button for completed project", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    // Should see View & Print Materials button
    await expect(page.getByRole("button", { name: /view.*materials|print/i })).toBeVisible();
  });

  test("PRV-006: View Materials opens preview tabs", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    // Click View & Print Materials button
    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Should see Back to Details button (indicates preview mode)
    await expect(page.getByRole("button", { name: /back to details/i })).toBeVisible();

    // Should see tab for worksheet
    await expect(page.getByRole("tab", { name: /worksheet/i })).toBeVisible();
  });

  test("PRV-007: Preview tabs shows all three tabs", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Should see all three main tabs
    await expect(page.getByRole("tab", { name: /worksheet/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /lesson plan/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /answer key/i })).toBeVisible();
  });

  test("PRV-008: Worksheet tab is active by default", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Worksheet tab should be active
    const worksheetTab = page.getByRole("tab", { name: /worksheet/i });
    await expect(worksheetTab).toHaveAttribute("data-state", "active");
  });

  test("PRV-009: Can switch between tabs", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Click lesson plan tab
    const lessonPlanTab = page.getByRole("tab", { name: /lesson plan/i });
    await lessonPlanTab.click();

    // Lesson plan tab should now be active
    await expect(lessonPlanTab).toHaveAttribute("data-state", "active");
  });

  test("PRV-010: Print button is visible", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Should see print button in preview mode
    await expect(page.getByRole("button", { name: /print/i })).toBeVisible();
  });

  test("PRV-011: PDF button is visible", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Should see PDF download button
    await expect(page.getByRole("button", { name: /pdf/i })).toBeVisible();
  });

  test("PRV-012: Back to Details returns to project details", async ({ page }) => {
    await page.getByText("Addition Worksheet").click();
    await page.getByRole("tab", { name: "Projects" }).click();

    const viewButton = page.getByRole("button", { name: /view.*materials/i });
    await viewButton.click();

    // Should see Back to Details button
    await expect(page.getByRole("button", { name: /back to details/i })).toBeVisible();

    // Click Back to Details to return to project view
    const backButton = page.getByRole("button", { name: /back to details/i });
    await backButton.click();

    // Should see View & Print Materials button again (details view)
    await expect(page.getByRole("button", { name: /view.*materials/i })).toBeVisible();
  });
});

test.describe("Project Preview - Empty State", () => {
  test.beforeEach(async ({ page }) => {
    // Same auth setup but with no projects
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

    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ balance: 50, lifetime_granted: 50, lifetime_used: 0 }]),
      });
    });

    // Empty projects list
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

  test("PRV-013: Shows welcome screen when no project selected", async ({ page }) => {
    // Should see welcome message when no projects (in the sidebar panel)
    await expect(page.getByText("No projects yet")).toBeVisible();
  });

  test("PRV-014: Shows empty state message in projects panel", async ({ page }) => {
    // Should see empty state in projects panel
    await expect(page.getByText(/no projects yet/i)).toBeVisible();
  });
});
