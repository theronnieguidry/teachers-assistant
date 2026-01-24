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

test.describe("Creation Wizard", () => {
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

  test("WIZ-011: Step 3 shows AI provider selection", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance to step 2
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2 and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 3 (Output)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Should see all three provider options
    await expect(page.getByText("Claude")).toBeVisible();
    await expect(page.getByText("OpenAI")).toBeVisible();
    await expect(page.getByText("Ollama")).toBeVisible();
  });

  test("WIZ-012: Claude is selected by default", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance to step 2
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2 and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 3 (Output)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Claude should be selected (has aria-pressed="true")
    const claudeCard = page.getByText("Claude").locator("xpath=ancestor::*[@role='button']");
    await expect(claudeCard).toHaveAttribute("aria-pressed", "true");
  });

  test("WIZ-013: Can select different provider", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance to step 2
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2 and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 3 (Output)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Click OpenAI provider card
    const openaiCard = page.getByText("OpenAI").locator("xpath=ancestor::*[@role='button']");
    await openaiCard.click();

    // OpenAI should now be selected
    await expect(openaiCard).toHaveAttribute("aria-pressed", "true");

    // Claude should no longer be selected
    const claudeCard = page.getByText("Claude").locator("xpath=ancestor::*[@role='button']");
    await expect(claudeCard).toHaveAttribute("aria-pressed", "false");
  });

  test("WIZ-014: Recommended badge on Claude", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Select subject and advance to step 2
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 2 and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 3 (Output)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Should see Recommended badge (exact match to avoid matching description text)
    await expect(page.getByText("Recommended", { exact: true })).toBeVisible();

    // Should see Free badge on Ollama
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
  });
});
