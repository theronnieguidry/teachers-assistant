import { test, expect } from "./fixtures";

test.describe("Dashboard Layout", () => {
  test("DASH-001: should render main content area", async ({ authenticatedPage: page }) => {
    await expect(page.locator("main")).toBeVisible();
  });

  test("DASH-002: should show creation panel with prompt textarea", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    await expect(promptArea).toBeVisible();
  });

  test("DASH-003: should show Create button", async ({ authenticatedPage: page }) => {
    const createButton = page.getByRole("button", { name: /create/i });
    await expect(createButton).toBeVisible();
  });

  test("DASH-004: should disable Create button for short prompts", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("short");
    await expect(createButton).toBeDisabled();
  });

  test("DASH-005: should enable Create button for valid prompts", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition for 2nd graders");
    await expect(createButton).toBeEnabled();
  });

  test("DASH-006: should show Projects panel", async ({ authenticatedPage: page }) => {
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  });

  test("DASH-007: should show Inspiration panel", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("Design Inspiration")).toBeVisible();
  });

  test("DASH-008: should show header with user info", async ({ authenticatedPage: page }) => {
    // Header should be visible
    await expect(page.locator("header")).toBeVisible();
  });
});
