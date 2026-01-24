import { test, expect } from "@playwright/test";

test.describe("Creation Wizard", () => {
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

  test("WIZ-001: should open wizard when Create is clicked", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition for 2nd graders");
    await createButton.click();

    // Should see wizard dialog
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("WIZ-002: should display progress indicator with step labels", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog to be visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Should see step labels (from WizardProgress component)
    // Use exact match to avoid matching "Design Inspiration" panel title
    await expect(page.getByText("Details", { exact: true })).toBeVisible();
    await expect(page.getByText("Inspiration", { exact: true })).toBeVisible();
    await expect(page.getByText("Output", { exact: true })).toBeVisible();
    await expect(page.getByText("Generate", { exact: true })).toBeVisible();
  });

  test("WIZ-003: Step 1 should show all form fields", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Check for form field labels (required fields have *)
    // Use exact text to avoid matching main content paragraphs
    await expect(page.getByText("Grade Level *")).toBeVisible();
    await expect(page.getByText("Subject *")).toBeVisible();
    await expect(page.getByText("Format", { exact: true })).toBeVisible();
    await expect(page.getByText("Difficulty", { exact: true })).toBeVisible();
    await expect(page.getByText("Number of Questions")).toBeVisible();
  });

  test("WIZ-004: should show project title field", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    await expect(page.getByLabel("Project Title")).toBeVisible();
  });

  test("WIZ-005: should show Next button on step 1", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  });

  test("WIZ-006: should advance to step 2 when Next is clicked", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click the Subject select trigger to open dropdown
    // Subject is the second combobox (after Grade Level)
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();

    // Wait for and click the Math option in the dropdown
    await page.getByRole("option", { name: "Math" }).click();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();

    // Should see step 2 content (inspiration selection)
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
  });

  test("WIZ-007: Step 2 should show Back button", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Should see Back button
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("WIZ-008: Back button returns to step 1", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();

    // Click Back
    await page.getByRole("button", { name: "Back" }).click();

    // Should see step 1 fields again
    await expect(page.getByLabel("Project Title")).toBeVisible();
  });

  test("WIZ-009: can close wizard via close button", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Close button has sr-only text "Close"
    const closeButton = page.getByRole("button", { name: "Close" });
    await closeButton.click();

    // Dialog should be closed
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("WIZ-010: Step 2 shows Skip button when no inspiration", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();

    // Should see Skip button (since no inspiration items)
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  });
});
