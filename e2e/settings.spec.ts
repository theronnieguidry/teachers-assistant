import { test, expect } from "./fixtures";

test.describe("Settings - Endpoint Dialog", () => {
  test("SET-001: Settings icon is visible in header", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByTitle("Generation API settings")).toBeVisible();
  });

  test("SET-002: Clicking settings opens the endpoint dialog", async ({
    authenticatedPage: page,
  }) => {
    await page.getByTitle("Generation API settings").click();

    await expect(
      page.getByRole("dialog", { name: "Generation API Endpoint" })
    ).toBeVisible();
  });

  test("SET-003: Dialog shows endpoint diagnostics", async ({
    authenticatedPage: page,
  }) => {
    await page.getByTitle("Generation API settings").click();

    await expect(page.getByTestId("endpoint-diagnostics")).toContainText(
      "Active preset: Local Dev"
    );
    await expect(page.getByTestId("endpoint-diagnostics")).toContainText(
      "Base URL: http://localhost:3001"
    );
    await expect(
      page.getByLabel("Allow premium on local endpoint")
    ).toBeVisible();
  });

  test("SET-004: Dialog can be closed with Escape", async ({
    authenticatedPage: page,
  }) => {
    await page.getByTitle("Generation API settings").click();

    const dialog = page.getByRole("dialog", { name: "Generation API Endpoint" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("Settings - User Menu", () => {
  test("SET-005: User header content is visible", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText(/50/)).toBeVisible();
  });

  test("SET-006: Credits are displayed in header", async ({
    authenticatedPage: page,
  }) => {
    await expect(page.getByText(/50/)).toBeVisible();
  });
});
