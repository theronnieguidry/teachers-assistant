import { test, expect } from "./fixtures";

test.describe("Settings - Ollama Setup", () => {
  test("SET-001: Settings icon is visible in header", async ({ authenticatedPage: page }) => {
    await expect(page.getByTitle("Local AI Setup")).toBeVisible();
  });

  test("SET-002: Clicking settings opens Ollama setup dialog", async ({ authenticatedPage: page }) => {
    await page.getByTitle("Local AI Setup").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("SET-003: Dialog shows Ollama status section", async ({ authenticatedPage: page }) => {
    await page.getByTitle("Local AI Setup").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/ollama/i).first()).toBeVisible();
  });

  test("SET-004: Close button closes the dialog", async ({ authenticatedPage: page }) => {
    await page.getByTitle("Local AI Setup").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).first().click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("SET-005: Dialog can be closed by pressing Escape", async ({ authenticatedPage: page }) => {
    await page.getByTitle("Local AI Setup").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("SET-006: Shows installation instructions", async ({ authenticatedPage: page }) => {
    await page.getByTitle("Local AI Setup").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/local/i).first()).toBeVisible();
  });
});

test.describe("Settings - User Menu", () => {
  test("SET-007: User menu is visible in header", async ({ authenticatedPage: page }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText(/50/)).toBeVisible();
  });

  test("SET-008: Credits are displayed in header", async ({ authenticatedPage: page }) => {
    await expect(page.getByText(/50/)).toBeVisible();
  });
});
