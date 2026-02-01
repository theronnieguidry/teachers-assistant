import { test, expect } from "./fixtures";

test.describe("Library Tab", () => {
  test("LIB-001: should display Library tab in navigation", async ({ authenticatedPage: page }) => {
    const libraryTab = page.getByRole("tab", { name: /library/i });
    await expect(libraryTab).toBeVisible();
  });

  test("LIB-002: should switch to Library tab on click", async ({ authenticatedPage: page }) => {
    const libraryTab = page.getByRole("tab", { name: /library/i });
    await libraryTab.click();
    await expect(libraryTab).toHaveAttribute("data-state", "active");
  });

  test("LIB-003: should show Library heading when tab selected", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible({ timeout: 5000 });
  });

  test("LIB-004: should show description text", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(
      page.getByText("Browse all your generated teaching materials")
    ).toBeVisible({ timeout: 5000 });
  });

  test("LIB-005: should show search input", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(
      page.getByPlaceholder("Search materials...")
    ).toBeVisible({ timeout: 5000 });
  });

  test("LIB-006: should show empty state when no artifacts exist", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(
      page.getByText("No materials found")
    ).toBeVisible({ timeout: 10000 });
  });

  test("LIB-007: should show generate hint in empty state", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(
      page.getByText("Generate some teaching materials to see them here")
    ).toBeVisible({ timeout: 10000 });
  });

  test("LIB-008: should show filter panel with Grade section", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    // The filter panel should have a Grade section
    await expect(page.getByText("Grade", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("LIB-009: should show filter panel with Type section", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    await expect(page.getByText("Type", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("LIB-010: should allow typing in search input", async ({ authenticatedPage: page }) => {
    await page.getByRole("tab", { name: /library/i }).click();
    const searchInput = page.getByPlaceholder("Search materials...");
    await searchInput.fill("math worksheet");
    await expect(searchInput).toHaveValue("math worksheet");
  });
});
