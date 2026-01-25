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

  test("WIZ-015: Dialog maintains minimum height across steps", async ({ page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Get step 1 height
    const step1Box = await dialog.boundingBox();
    expect(step1Box).not.toBeNull();
    const step1Height = step1Box!.height;

    // Navigate to step 2
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();

    // Get step 2 height
    const step2Box = await dialog.boundingBox();
    expect(step2Box).not.toBeNull();
    const step2Height = step2Box!.height;

    // Navigate to step 3
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Get step 3 height
    const step3Box = await dialog.boundingBox();
    expect(step3Box).not.toBeNull();
    const step3Height = step3Box!.height;

    // All steps should have at least 500px height (the min-height we set)
    expect(step1Height).toBeGreaterThanOrEqual(500);
    expect(step2Height).toBeGreaterThanOrEqual(500);
    expect(step3Height).toBeGreaterThanOrEqual(500);
  });

  test.describe("Step 5 - Prompt Review", () => {
    // Helper to navigate through steps to reach Step 5
    async function navigateToStep5(page: import("@playwright/test").Page, mockPolishResponse?: object) {
      // Mock the polish endpoint
      await page.route("**/polish", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockPolishResponse || {
            original: "Create a math worksheet about addition",
            polished: "Create a comprehensive 2nd grade math worksheet focusing on addition with sums up to 20, including visual aids and real-world scenarios.",
            wasPolished: true,
          }),
        });
      });

      const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
      const createButton = page.getByRole("button", { name: /create/i });

      await promptArea.fill("Create a math worksheet about addition");
      await createButton.click();

      // Wait for dialog
      await expect(page.getByRole("dialog")).toBeVisible();

      // Step 1: Select subject and advance
      const subjectTrigger = page.locator('[role="combobox"]').nth(1);
      await subjectTrigger.click();
      await page.getByRole("option", { name: "Math" }).click();
      await page.getByRole("button", { name: "Next" }).click();

      // Step 2: Skip inspiration
      await expect(page.getByText(/select inspiration items/i)).toBeVisible();
      await page.getByRole("button", { name: "Skip" }).click();

      // Step 3: AI Provider - continue
      await expect(page.getByText("AI Provider")).toBeVisible();
      await page.getByRole("button", { name: "Next" }).click();

      // Step 4: Output folder - fill in path and continue
      await expect(page.getByText("Output Folder")).toBeVisible();
      // Fill in the output path input
      await page.getByPlaceholder(/select or enter a folder path/i).fill("C:\\TestOutput");
      await page.getByRole("button", { name: "Next" }).click();

      // Wait for Step 5 (Review) to load - look for the loading text or final prompt display
      await page.waitForSelector('[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]', { timeout: 10000 });
    }

    test("WIZ-016: Step 5 shows 'What will be sent to AI' label", async ({ page }) => {
      await navigateToStep5(page);

      // Should show the "What will be sent to AI" label
      await expect(page.getByText(/what will be sent to ai/i)).toBeVisible();
    });

    test("WIZ-017: Step 5 displays polished prompt by default", async ({ page }) => {
      const polishedText = "Create a comprehensive 2nd grade math worksheet focusing on addition with sums up to 20, including visual aids and real-world scenarios.";

      await navigateToStep5(page, {
        original: "Create a math worksheet about addition",
        polished: polishedText,
        wasPolished: true,
      });

      // The polished prompt should be displayed in the final prompt area
      const finalPromptDisplay = page.getByTestId("final-prompt-display");
      await expect(finalPromptDisplay).toContainText(polishedText);
    });

    test("WIZ-018: Step 5 shows original as reference when polished differs", async ({ page }) => {
      await navigateToStep5(page, {
        original: "Create a math worksheet about addition",
        polished: "Enhanced prompt with more details...",
        wasPolished: true,
      });

      // Should show the original prompt as a reference
      await expect(page.getByText(/your original request/i)).toBeVisible();
      // Use the muted reference div specifically (not the dialog title)
      await expect(page.locator('.bg-muted\\/30').getByText("Create a math worksheet about addition")).toBeVisible();
    });

    test("WIZ-019: Step 5 updates display when user selects original", async ({ page }) => {
      await navigateToStep5(page, {
        original: "Create a math worksheet about addition",
        polished: "Enhanced version of the prompt",
        wasPolished: true,
      });

      // Select "Use my original request"
      await page.getByLabel(/use my original request/i).click();

      // The final prompt display should now show the original text
      const finalPromptDisplay = page.getByTestId("final-prompt-display");
      await expect(finalPromptDisplay).toContainText("Create a math worksheet about addition");
    });

    test("WIZ-020: Step 5 shows radio options when polishing occurred", async ({ page }) => {
      await navigateToStep5(page, {
        original: "Original prompt",
        polished: "Polished prompt",
        wasPolished: true,
      });

      // Should show all three radio options
      await expect(page.getByLabel(/use enhanced version/i)).toBeVisible();
      await expect(page.getByLabel(/use my original request/i)).toBeVisible();
      await expect(page.getByLabel(/edit the prompt/i)).toBeVisible();
    });

    test("WIZ-021: Step 5 allows editing the prompt", async ({ page }) => {
      await navigateToStep5(page, {
        original: "Original",
        polished: "Polished prompt text",
        wasPolished: true,
      });

      // Select "Edit the prompt"
      await page.getByLabel(/edit the prompt/i).click();

      // Should show a textarea
      const textarea = page.getByTestId("final-prompt-textarea");
      await expect(textarea).toBeVisible();

      // Should contain the polished text
      await expect(textarea).toHaveValue("Polished prompt text");

      // User can edit it
      await textarea.fill("My custom edited prompt");
      await expect(textarea).toHaveValue("My custom edited prompt");
    });
  });
});
