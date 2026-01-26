import { test, expect, mockCompletedProject } from "./fixtures";

test.describe("Projects Panel", () => {
  test("PROJ-001: should show Projects panel title", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("PROJ-002: should show refresh button with icon", async ({ authenticatedPage: page }) => {
    // The refresh button is next to the Projects title and contains RefreshCw icon
    const refreshButton = page.locator("button").filter({ has: page.locator("svg.lucide-refresh-cw") });
    await expect(refreshButton).toBeVisible();
  });

  test("PROJ-003: shows empty state when no projects", async ({ authenticatedPage: page }) => {
    // Wait for Projects panel heading to be visible (sidebar, not tab)
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();

    // Wait for loading to complete and empty state to show
    // The API might fail or return empty, either way we expect the empty state
    await expect(page.getByText("No projects yet")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Create your first teaching material above")).toBeVisible();
  });

  test("PROJ-004: refresh button is clickable", async ({ authenticatedPage: page }) => {
    const refreshButton = page.locator("button").filter({ has: page.locator("svg.lucide-refresh-cw") });

    // Click should not throw error
    await refreshButton.click();

    // Projects panel should still be visible
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });
});

test.describe("Projects Panel - Action Buttons", () => {
  // Use withProjects to get a project in the list
  test("PROJ-005: regenerate button opens wizard with pre-filled data", async ({ withProjects: page }) => {
    // Wait for project to appear
    await expect(page.getByText("Addition Worksheet")).toBeVisible({ timeout: 10000 });

    // Hover over the project to show action buttons
    await page.getByText("Addition Worksheet").hover();

    // Click the regenerate button (RefreshCw icon in the action row, not the header)
    const projectItem = page.locator(".group").filter({ hasText: "Addition Worksheet" });
    const regenerateButton = projectItem.locator("button[title='Regenerate']");
    await regenerateButton.click();

    // Wizard should open
    await expect(page.getByRole("dialog")).toBeVisible();

    // Title should be pre-filled (wizard step 1 shows title input, not prompt textarea)
    await expect(page.getByLabel("Project Title")).toHaveValue("Addition Worksheet");

    // Dialog header should show the project title
    await expect(page.getByRole("dialog").getByText("Create: Addition Worksheet")).toBeVisible();
  });

  test("PROJ-007: duplicate button creates project copy", async ({ withProjects: page }) => {
    // Wait for project to appear first
    await expect(page.getByText("Addition Worksheet")).toBeVisible({ timeout: 10000 });

    // Now add route handler for POST (duplicate) - only intercepts POST requests
    await page.route("**/rest/v1/projects**", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify([{ ...mockCompletedProject, id: "test-project-2", title: "Addition Worksheet (Copy)" }]),
        });
      } else {
        await route.continue();
      }
    });

    // Hover over the project to show action buttons
    await page.getByText("Addition Worksheet").hover();

    // Click the duplicate button
    const projectItem = page.locator(".group").filter({ hasText: "Addition Worksheet" });
    const duplicateButton = projectItem.locator("button[title='Duplicate']");
    await duplicateButton.click();

    // Should see success toast or the duplicated project
    await expect(page.getByText(/duplicated|Copy/i)).toBeVisible({ timeout: 5000 });
  });

  test("PROJ-009: project action buttons show on hover", async ({ withProjects: page }) => {
    // Wait for project to appear
    await expect(page.getByText("Addition Worksheet")).toBeVisible({ timeout: 10000 });

    // Action buttons should be hidden initially (opacity-0)
    const projectItem = page.locator(".group").filter({ hasText: "Addition Worksheet" });
    const actionButtons = projectItem.locator("button[title='Regenerate']");

    // Hover over the project
    await page.getByText("Addition Worksheet").hover();

    // Action buttons should now be visible
    await expect(actionButtons).toBeVisible();
  });
});
