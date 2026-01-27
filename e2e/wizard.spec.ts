import { test, expect } from "./fixtures";

test.describe("Creation Wizard", () => {
  test("WIZ-001: should open wizard when Create is clicked", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition for 2nd graders");
    await createButton.click();

    // Should see wizard dialog
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("WIZ-002: should display progress indicator with step labels", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog to be visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Should see step labels (from WizardProgress component) - 7 steps now (Issue #20)
    await expect(page.getByText("Project", { exact: true })).toBeVisible();
    await expect(page.getByText("Details", { exact: true })).toBeVisible();
    await expect(page.getByText("Inspiration", { exact: true })).toBeVisible();
    await expect(page.getByText("AI", { exact: true })).toBeVisible();
    await expect(page.getByText("Output", { exact: true })).toBeVisible();
    await expect(page.getByText("Review", { exact: true })).toBeVisible();
    await expect(page.getByText("Generate", { exact: true })).toBeVisible();
  });

  test("WIZ-003: Step 1 should show project selection options", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Check for project selection content (Issue #20)
    await expect(page.getByText("Project Type")).toBeVisible();
    await expect(page.getByText("Quick Create")).toBeVisible();
    await expect(page.getByText("Learning Path")).toBeVisible();
    await expect(page.getByText("Add to Project")).toBeVisible();
    await expect(page.getByText("Create new project")).toBeVisible();
  });

  test("WIZ-003b: Step 2 should show class details form fields", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1: Click Next to go to ClassDetails (Step 2)
    await page.getByRole("button", { name: "Next" }).click();

    // Check for form field labels (required fields have *)
    await expect(page.getByText("Grade Level *")).toBeVisible();
    await expect(page.getByText("Subject *")).toBeVisible();
    await expect(page.getByText("Format", { exact: true })).toBeVisible();
    await expect(page.getByText("Difficulty", { exact: true })).toBeVisible();
    await expect(page.getByText("Number of Questions")).toBeVisible();
  });

  test("WIZ-004: should show project title field in step 2", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog and advance to step 2
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByLabel("Project Title")).toBeVisible();
  });

  test("WIZ-005: should show Next button on step 1", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  });

  test("WIZ-006: should advance through steps when Next is clicked", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 (Project Selection) - Click Next to go to Step 2 (ClassDetails)
    await page.getByRole("button", { name: "Next" }).click();

    // Now in Step 2 (ClassDetails) - select subject
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();

    // Click Next
    await page.getByRole("button", { name: "Next" }).click();

    // Should see step 3 content (inspiration selection)
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
  });

  test("WIZ-007: Step 2 should show Back button", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for Step 2 (ClassDetails)
    await expect(page.getByText("Grade Level *")).toBeVisible();

    // Should see Back button
    await expect(page.getByRole("button", { name: "Back" })).toBeVisible();
  });

  test("WIZ-008: Back button returns to previous step", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for Step 2 (ClassDetails)
    await expect(page.getByText("Grade Level *")).toBeVisible();

    // Click Back
    await page.getByRole("button", { name: "Back" }).click();

    // Should see step 1 content (Project Selection)
    await expect(page.getByText("Project Type")).toBeVisible();
  });

  test("WIZ-009: can close wizard via close button", async ({ authenticatedPage: page }) => {
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

  test("WIZ-010: Step 3 shows Skip button when no inspiration", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 (ClassDetails) - select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 3 (Inspiration)
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();

    // Should see Skip button (since no inspiration items)
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
  });

  test("WIZ-011: Step 4 shows AI provider selection", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 (ClassDetails) - select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 3 (Inspiration) and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 4 (AI Provider)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Should see both provider options (Premium AI and Local AI)
    await expect(page.getByText("Premium AI")).toBeVisible();
    await expect(page.getByText("Local AI", { exact: true }).first()).toBeVisible();
  });

  test("WIZ-012: Local AI is selected by default", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 (ClassDetails) - select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 3 (Inspiration) and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 4 (AI Provider)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Local AI should be selected by default (has aria-pressed="true")
    const localCard = page.getByText("Local AI").locator("xpath=ancestor::*[@role='button']");
    await expect(localCard).toHaveAttribute("aria-pressed", "true");
  });

  test("WIZ-013: Can select different provider", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 (ClassDetails) - select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 3 (Inspiration) and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 4 (AI Provider)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Click Premium AI provider card
    const premiumCard = page.getByText("Premium AI").locator("xpath=ancestor::*[@role='button']");
    await premiumCard.click();

    // Premium AI should now be selected
    await expect(premiumCard).toHaveAttribute("aria-pressed", "true");

    // Local AI should no longer be selected
    const localCard = page.getByText("Local AI").locator("xpath=ancestor::*[@role='button']");
    await expect(localCard).toHaveAttribute("aria-pressed", "false");
  });

  test("WIZ-014: Best Quality badge on Premium AI", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    await expect(page.getByRole("dialog")).toBeVisible();

    // Step 1 - advance to Step 2
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2 (ClassDetails) - select subject and advance
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    // Wait for step 3 (Inspiration) and skip
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();

    // Wait for step 4 (AI Provider)
    await expect(page.getByText("AI Provider")).toBeVisible();

    // Should see Best Quality badge on Premium AI (exact match to avoid matching description text)
    await expect(page.getByText("Best Quality", { exact: true })).toBeVisible();

    // Should see Free badge on Local AI
    await expect(page.getByText("Free", { exact: true })).toBeVisible();
  });

  test("WIZ-015: Dialog maintains minimum height across steps", async ({ authenticatedPage: page }) => {
    const promptArea = page.getByPlaceholder(/describe|create|what would you like/i);
    const createButton = page.getByRole("button", { name: /create/i });

    await promptArea.fill("Create a math worksheet about addition");
    await createButton.click();

    // Wait for dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Get step 1 height (Project Selection)
    const step1Box = await dialog.boundingBox();
    expect(step1Box).not.toBeNull();
    const step1Height = step1Box!.height;

    // Navigate to step 2 (ClassDetails)
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Grade Level *")).toBeVisible();

    // Get step 2 height
    const step2Box = await dialog.boundingBox();
    expect(step2Box).not.toBeNull();
    const step2Height = step2Box!.height;

    // Navigate to step 3 (Inspiration)
    const subjectTrigger = page.locator('[role="combobox"]').nth(1);
    await subjectTrigger.click();
    await page.getByRole("option", { name: "Math" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText(/select inspiration items/i)).toBeVisible();

    // Get step 3 height
    const step3Box = await dialog.boundingBox();
    expect(step3Box).not.toBeNull();
    const step3Height = step3Box!.height;

    // All steps should have at least 500px height (the min-height we set)
    expect(step1Height).toBeGreaterThanOrEqual(500);
    expect(step2Height).toBeGreaterThanOrEqual(500);
    expect(step3Height).toBeGreaterThanOrEqual(500);
  });

  test.describe("Step 6 - Prompt Review", () => {
    // Helper to navigate through steps to reach Step 6 (Review)
    async function navigateToStep6(page: import("@playwright/test").Page, mockPolishResponse?: object) {
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

      // Step 1: Project Selection - advance
      await page.getByRole("button", { name: "Next" }).click();

      // Step 2: ClassDetails - Select subject and advance
      const subjectTrigger = page.locator('[role="combobox"]').nth(1);
      await subjectTrigger.click();
      await page.getByRole("option", { name: "Math" }).click();
      await page.getByRole("button", { name: "Next" }).click();

      // Step 3: Skip inspiration
      await expect(page.getByText(/select inspiration items/i)).toBeVisible();
      await page.getByRole("button", { name: "Skip" }).click();

      // Step 4: AI Provider - continue
      await expect(page.getByText("AI Provider")).toBeVisible();
      await page.getByRole("button", { name: "Next" }).click();

      // Step 5: Output folder - fill in path and continue
      await expect(page.getByText("Output Folder")).toBeVisible();
      // Fill in the output path input
      await page.getByPlaceholder(/select or enter a folder path/i).fill("C:\\TestOutput");
      await page.getByRole("button", { name: "Next" }).click();

      // Wait for Step 6 (Review) to load - look for the loading text or final prompt display
      await page.waitForSelector('[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]', { timeout: 10000 });
    }

    test("WIZ-016: Step 6 shows 'What will be sent to AI' label", async ({ authenticatedPage: page }) => {
      await navigateToStep6(page);

      // Should show the "What will be sent to AI" label
      await expect(page.getByText(/what will be sent to ai/i)).toBeVisible();
    });

    test("WIZ-017: Step 6 displays polished prompt by default", async ({ authenticatedPage: page }) => {
      const polishedText = "Create a comprehensive 2nd grade math worksheet focusing on addition with sums up to 20, including visual aids and real-world scenarios.";

      await navigateToStep6(page, {
        original: "Create a math worksheet about addition",
        polished: polishedText,
        wasPolished: true,
      });

      // The polished prompt should be displayed in the final prompt area
      const finalPromptDisplay = page.getByTestId("final-prompt-display");
      await expect(finalPromptDisplay).toContainText(polishedText);
    });

    test("WIZ-018: Step 6 shows original as reference when polished differs", async ({ authenticatedPage: page }) => {
      await navigateToStep6(page, {
        original: "Create a math worksheet about addition",
        polished: "Enhanced prompt with more details...",
        wasPolished: true,
      });

      // Should show the original prompt as a reference
      await expect(page.getByText(/your original request/i)).toBeVisible();
      // Use the muted reference div specifically (not the dialog title)
      await expect(page.locator('.bg-muted\\/30').getByText("Create a math worksheet about addition")).toBeVisible();
    });

    test("WIZ-019: Step 6 updates display when user selects original", async ({ authenticatedPage: page }) => {
      await navigateToStep6(page, {
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

    test("WIZ-020: Step 6 shows radio options when polishing occurred", async ({ authenticatedPage: page }) => {
      await navigateToStep6(page, {
        original: "Original prompt",
        polished: "Polished prompt",
        wasPolished: true,
      });

      // Should show all three radio options
      await expect(page.getByLabel(/use enhanced version/i)).toBeVisible();
      await expect(page.getByLabel(/use my original request/i)).toBeVisible();
      await expect(page.getByLabel(/edit the prompt/i)).toBeVisible();
    });

    test("WIZ-021: Step 6 allows editing the prompt", async ({ authenticatedPage: page }) => {
      await navigateToStep6(page, {
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
