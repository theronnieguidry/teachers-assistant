import { test, expect } from "./fixtures";

test.describe("Feedback Feature", () => {
  test("FEED-001: should show feedback button in header", async ({ authenticatedPage: page }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await expect(feedbackButton).toBeVisible();
  });

  test("FEED-002: should open feedback dialog when clicking the button", async ({
    authenticatedPage: page,
  }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Send Feedback" })
    ).toBeVisible();
  });

  test("FEED-003: should close feedback dialog when clicking Cancel", async ({
    authenticatedPage: page,
  }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    await expect(page.getByRole("dialog")).toBeVisible();

    const cancelButton = page.getByRole("button", { name: "Cancel" });
    await cancelButton.click();

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("FEED-004: should show form validation errors for empty fields", async ({
    authenticatedPage: page,
  }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    // Try to submit with empty fields
    const submitButton = page.getByRole("button", { name: "Submit Feedback" });
    await submitButton.click();

    // Should show validation errors
    await expect(page.getByText(/at least 5 characters/i)).toBeVisible();
  });

  test("FEED-005: should have Bug Report selected by default", async ({
    authenticatedPage: page,
  }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    const bugRadio = page.getByRole("radio", { name: /bug report/i });
    await expect(bugRadio).toBeChecked();
  });

  test("FEED-006: should allow selecting Feature Request", async ({ authenticatedPage: page }) => {
    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    const featureRadio = page.getByRole("radio", { name: /feature request/i });
    await featureRadio.click();

    await expect(featureRadio).toBeChecked();
  });

  test("FEED-007: should submit feedback successfully (mocked)", async ({
    authenticatedPage: page,
  }) => {
    // Mock the feedback API endpoint
    await page.route("**/feedback", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          issueNumber: 42,
          issueUrl: "https://github.com/test/repo/issues/42",
        }),
      });
    });

    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    // Fill in the form
    await page.getByLabel(/title/i).fill("Test bug report title");
    await page
      .getByLabel(/description/i)
      .fill("This is a detailed description of the bug for testing purposes.");

    // Submit
    const submitButton = page.getByRole("button", { name: "Submit Feedback" });
    await submitButton.click();

    // Should show success toast
    await expect(page.getByText(/feedback submitted/i)).toBeVisible({
      timeout: 5000,
    });

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("FEED-008: should show error message when submission fails", async ({
    authenticatedPage: page,
  }) => {
    // Mock the feedback API endpoint to fail
    await page.route("**/feedback", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Failed to submit feedback",
          message: "GitHub API error",
        }),
      });
    });

    const feedbackButton = page.getByRole("button", { name: /send feedback/i });
    await feedbackButton.click();

    // Fill in the form
    await page.getByLabel(/title/i).fill("Test bug report title");
    await page
      .getByLabel(/description/i)
      .fill("This is a detailed description of the bug for testing purposes.");

    // Submit
    const submitButton = page.getByRole("button", { name: "Submit Feedback" });
    await submitButton.click();

    // Should show error message in dialog
    await expect(page.getByText(/failed to submit feedback/i)).toBeVisible({
      timeout: 5000,
    });

    // Dialog should remain open
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
