import { test, expect } from "./fixtures";

test.describe("Design Packs", () => {
  test("DP-001: should show Design Packs collapsible in sidebar", async ({ authenticatedPage: page }) => {
    await expect(page.getByText("Design Packs")).toBeVisible();
  });

  test("DP-002: should expand Design Packs section on click", async ({ authenticatedPage: page }) => {
    // Click the collapsible trigger
    await page.getByText("Design Packs").click();

    // Should show the panel heading or create button
    await expect(
      page.getByText("Create a Design Pack to save your inspiration items")
    ).toBeVisible({ timeout: 5000 });
  });

  test("DP-003: should show New Pack button in empty state", async ({ authenticatedPage: page }) => {
    await page.getByText("Design Packs").click();
    await expect(
      page.getByRole("button", { name: /new pack/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("DP-004: should show create button in header area", async ({ authenticatedPage: page }) => {
    await page.getByText("Design Packs").click();
    await expect(
      page.locator("[title='Create Design Pack']")
    ).toBeVisible({ timeout: 5000 });
  });

  test("DP-005: should open create dialog when create button clicked", async ({ authenticatedPage: page }) => {
    await page.getByText("Design Packs").click();

    // Click the "+" create button
    await page.locator("[title='Create Design Pack']").click();

    // Dialog should appear with Pack Name input
    await expect(page.getByLabel("Pack Name")).toBeVisible({ timeout: 5000 });
  });

  test("DP-006: should collapse Design Packs section on second click", async ({ authenticatedPage: page }) => {
    // Expand
    await page.getByText("Design Packs").click();
    await expect(
      page.getByText("Create a Design Pack to save your inspiration items")
    ).toBeVisible({ timeout: 5000 });

    // Collapse
    await page.getByText("Design Packs").click();
    await expect(
      page.getByText("Create a Design Pack to save your inspiration items")
    ).toBeHidden({ timeout: 5000 });
  });
});
