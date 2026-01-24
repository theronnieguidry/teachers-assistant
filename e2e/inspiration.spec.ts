import { test, expect, Page } from "@playwright/test";

// Helper to dismiss alert dialogs (used by prompt())
async function setupDialogHandler(page: Page, response: string | null) {
  page.on("dialog", async (dialog) => {
    if (response !== null) {
      await dialog.accept(response);
    } else {
      await dialog.dismiss();
    }
  });
}

test.describe("Inspiration Panel", () => {
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

  test("INSP-001: should show Inspiration panel title", async ({ page }) => {
    await expect(page.getByText("Design Inspiration")).toBeVisible();
  });

  test("INSP-002: should show Add URL button", async ({ page }) => {
    // The button has a Plus icon and title="Add URL"
    const addButton = page.locator('button[title="Add URL"]');
    await expect(addButton).toBeVisible();
  });

  test("INSP-003: should show drop zone area", async ({ page }) => {
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-004: should show empty state initially", async ({ page }) => {
    // The drop zone message is the empty state
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-005: Add URL button opens prompt dialog", async ({ page }) => {
    // Set up dialog handler to accept a URL
    setupDialogHandler(page, "https://example.com");

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // After dialog is accepted, item should appear
    await expect(page.getByText("example.com")).toBeVisible();
  });

  test("INSP-006: can enter a URL and see it in the list", async ({ page }) => {
    setupDialogHandler(page, "https://math-resources.edu");

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should see the URL hostname in the list
    await expect(page.getByText("math-resources.edu")).toBeVisible();
  });

  test("INSP-007: can remove an inspiration item", async ({ page }) => {
    // First add a URL
    setupDialogHandler(page, "https://example.com");

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Verify item is added
    await expect(page.getByText("example.com")).toBeVisible();

    // Hover over the item to reveal the remove button
    await page.getByText("example.com").hover();

    // Click remove button (X icon)
    const removeButton = page.locator("button").filter({ has: page.locator('svg.lucide-x') });
    await removeButton.click();

    // Item should be removed
    await expect(page.getByText("example.com")).not.toBeVisible();
  });

  test("INSP-008: shows item count when items added", async ({ page }) => {
    setupDialogHandler(page, "https://example.com");

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should show "1 item selected"
    await expect(page.getByText("1 item selected")).toBeVisible();
  });

  test("INSP-009: dismissing URL prompt doesn't add item", async ({ page }) => {
    setupDialogHandler(page, null); // Dismiss the dialog

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should still show empty state
    await expect(page.getByText("Drop URLs, PDFs, or images here")).toBeVisible();
  });

  test("INSP-010: shows 'Drop more files' text after adding item", async ({ page }) => {
    setupDialogHandler(page, "https://example.com");

    const addButton = page.locator('button[title="Add URL"]');
    await addButton.click();

    // Should show "Drop more files here"
    await expect(page.getByText("Drop more files here")).toBeVisible();
  });
});
