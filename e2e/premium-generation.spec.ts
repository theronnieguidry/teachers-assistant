import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

// ============================================
// Mock Data
// ============================================

const MOCK_WORKSHEET_HTML = `
<html><head><title>Math Worksheet</title></head>
<body>
  <h1>Addition Practice - Grade 2</h1>
  <div class="question"><p>1. What is 3 + 4?</p></div>
  <div class="question"><p>2. What is 5 + 6?</p></div>
  <img src="data:image/png;base64,iVBOR" alt="counting blocks" />
</body></html>`;

const MOCK_LESSON_PLAN_HTML = `
<html><head><title>Lesson Plan</title></head>
<body><h1>Lesson Plan: Addition</h1><p>Objectives: Learn addition up to 20</p></body></html>`;

const MOCK_ANSWER_KEY_HTML = `
<html><head><title>Answer Key</title></head>
<body><h1>Answer Key</h1><p>1. 7</p><p>2. 11</p></body></html>`;

interface PremiumMockOptions {
  textCredits?: number;
  imageCredits?: number;
  expectedCredits?: number;
  minCredits?: number;
  maxCredits?: number;
  imageStats?: {
    total: number;
    generated: number;
    cached: number;
    failed: number;
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Mock the Supabase profiles and credits endpoints properly.
 *
 * The authStore's refreshCredits() uses `.single()` which requires responses
 * to be single objects (not arrays) with the proper content type.
 * The fixture's default credits mock returns an array which fails with `.single()`.
 * This helper overrides that with proper single-object responses.
 */
async function setupCreditsAndProfiles(page: Page, creditBalance = 50) {
  // Mock profiles endpoint (refreshCredits fetches profiles first)
  await page.route("**/rest/v1/profiles**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        display_name: "Test User",
        avatar_url: null,
      }),
    });
  });

  // Mock credits endpoint with single object (for .single() calls)
  await page.route("**/rest/v1/credits**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/vnd.pgrst.object+json",
      body: JSON.stringify({
        balance: creditBalance,
        lifetime_granted: 50,
        lifetime_used: 50 - creditBalance,
      }),
    });
  });
}

/**
 * Set up all mock routes needed for premium generation flow.
 * After registering mocks, reloads the page so credits are fetched
 * with the proper single-object format (required by Supabase .single()).
 */
async function setupPremiumMocks(page: Page, options: PremiumMockOptions = {}) {
  const {
    textCredits = 4,
    imageCredits = 2,
    expectedCredits = textCredits + imageCredits,
    minCredits = Math.max(3, Math.floor(expectedCredits * 0.8)),
    maxCredits = Math.ceil(expectedCredits * 1.3),
    imageStats = { total: 4, generated: 3, cached: 1, failed: 0 },
  } = options;

  // Set up credits and profiles (overrides fixture's array-format mock)
  await setupCreditsAndProfiles(page);

  // Mock the estimate endpoint
  await page.route("**/estimate", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          estimate: {
            minCredits,
            maxCredits,
            expectedCredits,
            breakdown: {
              textGeneration: textCredits,
              imageGeneration: imageCredits,
              qualityGate: 0,
            },
          },
          disclaimer:
            "Actual usage may vary based on content complexity. Unused credits are refunded automatically if generation fails.",
        }),
      });
    }
  });

  // Mock the generate endpoint with SSE response
  await page.route("**/generate", async (route) => {
    if (route.request().method() === "POST") {
      const mockResult = {
        projectId: "test-premium-project",
        versionId: "v-premium-1",
        worksheetHtml: MOCK_WORKSHEET_HTML,
        lessonPlanHtml: MOCK_LESSON_PLAN_HTML,
        answerKeyHtml: MOCK_ANSWER_KEY_HTML,
        creditsUsed: expectedCredits,
        imageStats,
      };

      const sseBody = [
        `data: ${JSON.stringify({ type: "progress", step: "worksheet", progress: 20, message: "Planning worksheet structure..." })}`,
        "",
        `data: ${JSON.stringify({ type: "progress", step: "worksheet", progress: 40, message: "Generating worksheet content..." })}`,
        "",
        `data: ${JSON.stringify({ type: "progress", step: "worksheet", progress: 60, message: "Generating images..." })}`,
        "",
        `data: ${JSON.stringify({ type: "progress", step: "answer_key", progress: 80, message: "Creating answer key..." })}`,
        "",
        `data: ${JSON.stringify({ type: "complete", result: mockResult })}`,
        "",
      ].join("\n");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: sseBody,
      });
    }
  });

  // Mock the polish endpoint
  await page.route("**/polish", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        original: "Create a math worksheet about addition",
        polished:
          "Create a comprehensive 2nd grade math worksheet focusing on addition with sums up to 20.",
        wasPolished: true,
      }),
    });
  });

  // Mock project creation and updates
  await page.route("**/rest/v1/projects**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "test-premium-project",
            user_id: "test-user-id",
            title: "Math Addition Worksheet",
            prompt: "Create a math worksheet about addition",
            grade: "2",
            subject: "Math",
            options: { questionCount: 10, difficulty: "medium" },
            inspiration: [],
            output_path: null,
            status: "generating",
            error_message: null,
            credits_used: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_at: null,
          },
        ]),
      });
    } else if (method === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else {
      // GET
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });

  // Mock project_versions for post-generation fetch
  await page.route("**/rest/v1/project_versions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "v-premium-1",
          project_id: "test-premium-project",
          worksheet_html: MOCK_WORKSHEET_HTML,
          lesson_plan_html: MOCK_LESSON_PLAN_HTML,
          answer_key_html: MOCK_ANSWER_KEY_HTML,
          ai_provider: "openai",
          ai_model: "gpt-4o",
          input_tokens: 1000,
          output_tokens: 2000,
          created_at: new Date().toISOString(),
        },
      ]),
    });
  });

  // Mock project_inspiration junction table
  await page.route("**/rest/v1/project_inspiration**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock inspiration_items
  await page.route("**/rest/v1/inspiration_items**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // Mock artifacts table
  await page.route("**/rest/v1/artifacts**", async (route) => {
    const method = route.request().method();
    if (method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify([{ id: "artifact-1" }]),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    }
  });

  // Mock curriculum objectives
  await page.route("**/curriculum/objectives**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ objectives: [] }),
    });
  });

  // Reload page so credits are re-fetched with proper single-object mock.
  // The fixture's initial load used an array-format mock which fails with
  // Supabase's .single() call in refreshCredits().
  await page.reload();
  await page.waitForSelector("main", { timeout: 10000 });
}

/**
 * Navigate wizard to Step 3 (AI Provider) and select Premium AI.
 * Assumes the page is authenticated and at the dashboard.
 */
async function navigateToPremiumStep3(page: Page) {
  // Fill prompt and open wizard
  const promptArea = page.getByPlaceholder(
    /describe|create|what would you like/i
  );
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

  // Step 3: AI Provider - select Premium AI
  await expect(page.getByText("AI Provider")).toBeVisible();
  const premiumCard = page
    .getByText("Premium AI")
    .locator("xpath=ancestor::*[@role='button']");
  await premiumCard.click();
  await expect(premiumCard).toHaveAttribute("aria-pressed", "true");
}

/**
 * Navigate the full wizard with Premium AI to Step 6 (Generation).
 * Returns at the estimate confirmation phase.
 */
async function navigateToPremiumGeneration(page: Page) {
  await navigateToPremiumStep3(page);

  // Visual Options should be visible (Premium AI shows this)
  await expect(page.getByText("Include AI-generated images")).toBeVisible();

  // Wait for Next button to be enabled (credits must load first)
  const nextButton = page.getByRole("button", { name: "Next" });
  await expect(nextButton).toBeEnabled({ timeout: 10000 });
  await nextButton.click();

  // Step 4: Output folder
  await expect(page.getByText("Output Folder")).toBeVisible();
  await page
    .getByPlaceholder(/select or enter a folder path/i)
    .fill("C:\\TestOutput");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 5: Prompt Review
  await page.waitForSelector(
    '[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]',
    { timeout: 10000 }
  );
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 6: Should show estimate confirmation (premium flow)
  await expect(page.getByText("Review Credit Estimate")).toBeVisible({
    timeout: 10000,
  });
}

// ============================================
// Tests
// ============================================

test.describe("Premium Generation", () => {
  test("PREM-001: Premium generation with standard visuals completes", async ({
    authenticatedPage: page,
  }) => {
    await setupPremiumMocks(page, {
      textCredits: 4,
      imageCredits: 2,
      expectedCredits: 6,
    });

    await navigateToPremiumGeneration(page);

    // Verify credit estimate display
    await expect(
      page.getByRole("heading", { name: "Review Credit Estimate" })
    ).toBeVisible();
    await expect(page.getByText("Text generation")).toBeVisible();
    await expect(page.getByText("Image generation")).toBeVisible();
    await expect(
      page.getByText("You have enough credits to proceed")
    ).toBeVisible();

    // Confirm estimate and start generation
    await page.getByRole("button", { name: "Generate Now" }).click();

    // Wait for generation to complete (use heading to avoid toast duplicate)
    await expect(
      page.getByRole("heading", { name: "Generation Complete!" })
    ).toBeVisible({ timeout: 15000 });

    // Verify action buttons
    await expect(
      page.getByRole("button", { name: "View Project" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close" }).first()
    ).toBeVisible();
  });

  test("PREM-002: Visual richness selector shows correct options", async ({
    authenticatedPage: page,
  }) => {
    // This test only checks Step 3 UI, doesn't need to advance past it
    await navigateToPremiumStep3(page);

    // Verify "Include AI-generated images" switch is visible
    await expect(page.getByText("Include AI-generated images")).toBeVisible();

    // Verify "Visual richness" label
    await expect(page.getByText("Visual richness")).toBeVisible();

    // Click the Visual richness select trigger (within the dashed card)
    const richnessTrigger = page
      .locator(".border-dashed")
      .locator('[role="combobox"]')
      .first();
    await richnessTrigger.click();

    // Verify all three richness options
    await expect(
      page.getByRole("option", { name: /Minimal \(1-2 images\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Standard \(3-5 images\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Rich \(image per question\)/i })
    ).toBeVisible();

    // Select Standard
    await page
      .getByRole("option", { name: /Standard \(3-5 images\)/i })
      .click();

    // Verify "Visual style" label
    await expect(page.getByText("Visual style")).toBeVisible();

    // Click the Visual style select trigger
    const styleTrigger = page
      .locator(".border-dashed")
      .locator('[role="combobox"]')
      .nth(1);
    await styleTrigger.click();

    // Verify all three style options
    await expect(
      page.getByRole("option", { name: /Friendly cartoon/i })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Simple icons/i })
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Black & white/i })
    ).toBeVisible();
  });

  test("PREM-003: Credit estimate reflects image costs", async ({
    authenticatedPage: page,
  }) => {
    // Set up credits and profiles mocks for proper loading
    await setupCreditsAndProfiles(page);

    // Set up mock that returns different estimates based on request body
    let estimateCallCount = 0;
    await page.route("**/estimate", async (route) => {
      if (route.request().method() === "POST") {
        estimateCallCount++;
        // First call: minimal visuals (default), second call: rich visuals
        const isRich = estimateCallCount > 1;
        const imageCredits = isRich ? 3 : 1;
        const expectedCredits = 4 + imageCredits;

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            estimate: {
              minCredits: Math.max(3, Math.floor(expectedCredits * 0.8)),
              maxCredits: Math.ceil(expectedCredits * 1.3),
              expectedCredits,
              breakdown: {
                textGeneration: 4,
                imageGeneration: imageCredits,
                qualityGate: 0,
              },
            },
            disclaimer: "Actual usage may vary.",
          }),
        });
      }
    });

    // Set up other required mocks
    await page.route("**/polish", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          original: "Create a math worksheet about addition",
          polished:
            "Create a comprehensive 2nd grade math worksheet focusing on addition.",
          wasPolished: true,
        }),
      });
    });

    await page.route("**/rest/v1/inspiration_items**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/curriculum/objectives**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ objectives: [] }),
      });
    });

    // Reload so credits are re-fetched with proper single-object format
    await page.reload();
    await page.waitForSelector("main", { timeout: 10000 });

    // Navigate to Step 3, select Premium AI (default richness is "minimal")
    await navigateToPremiumStep3(page);

    // Wait for Next button to be enabled (credits must load)
    const nextBtn = page.getByRole("button", { name: "Next" });
    await expect(nextBtn).toBeEnabled({ timeout: 10000 });

    // Continue through Steps 4-5 to reach Step 6 (estimate phase)
    await nextBtn.click();
    await expect(page.getByText("Output Folder")).toBeVisible();
    await page
      .getByPlaceholder(/select or enter a folder path/i)
      .fill("C:\\TestOutput");
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForSelector(
      '[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]',
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: Verify first estimate (minimal visuals = ~1 image credit)
    await expect(page.getByText("Review Credit Estimate")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/~1 credits/)).toBeVisible(); // Image generation: ~1

    // Go back to change richness
    await page.getByRole("button", { name: "Back" }).click();

    // Navigate back through steps to Step 3
    // We're now at Step 5 (Prompt Review), go back to Step 4
    await page.getByRole("button", { name: "Back" }).click();
    // Step 4 (Output), go back to Step 3
    await page.getByRole("button", { name: "Back" }).click();

    // Step 3: Change richness to Rich
    await expect(page.getByText("Visual richness")).toBeVisible();
    const richnessTrigger = page
      .locator(".border-dashed")
      .locator('[role="combobox"]')
      .first();
    await richnessTrigger.click();
    await page
      .getByRole("option", { name: /Rich \(image per question\)/i })
      .click();

    // Re-advance through wizard to Step 6
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Output Folder")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForSelector(
      '[data-testid="final-prompt-display"], [data-testid="final-prompt-textarea"]',
      { timeout: 10000 }
    );
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: Verify updated estimate (rich visuals = ~3 image credits)
    await expect(page.getByText("Review Credit Estimate")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/~3 credits/)).toBeVisible(); // Image generation: ~3
  });

  test("PREM-004: Premium generation handles partial image failure gracefully", async ({
    authenticatedPage: page,
  }) => {
    await setupPremiumMocks(page, {
      textCredits: 4,
      imageCredits: 2,
      expectedCredits: 6,
      imageStats: { total: 5, generated: 3, cached: 0, failed: 2 },
    });

    await navigateToPremiumGeneration(page);

    // Confirm estimate
    await page.getByRole("button", { name: "Generate Now" }).click();

    // Should complete successfully despite partial image failures
    await expect(
      page.getByRole("heading", { name: "Generation Complete!" })
    ).toBeVisible({ timeout: 15000 });

    // Verify action buttons present (no error state)
    await expect(
      page.getByRole("button", { name: "View Project" })
    ).toBeVisible();

    // Should NOT show any error heading
    await expect(
      page.getByRole("heading", { name: "Generation Failed" })
    ).not.toBeVisible();
  });

  test.describe("Insufficient credits", () => {
    test.use({
      fixtureOptions: { withLearnerProfile: true, creditBalance: 2 },
    });

    test("PREM-005: Insufficient credits blocks premium generation", async ({
      authenticatedPage: page,
    }) => {
      // Override credits mock with proper single-object format
      await setupCreditsAndProfiles(page, 2);

      // Reload so credits are re-fetched with proper single-object format
      await page.reload();
      await page.waitForSelector("main", { timeout: 10000 });

      // Navigate to Step 3 and select Premium AI
      await navigateToPremiumStep3(page);

      // Should show insufficient credits alert (wait for credits to load)
      await expect(
        page.getByText(/Insufficient credits for Premium AI/i)
      ).toBeVisible({ timeout: 10000 });

      // Should show the credit balance (may initially show 0, wait for correct value)
      await expect(
        page.getByText(/You have 2 credits, but need at least 5/i)
      ).toBeVisible({ timeout: 10000 });

      // Next button should be disabled
      const nextButton = page.getByRole("button", { name: "Next" });
      await expect(nextButton).toBeDisabled();

      // Should show "Switch to Local AI (Free)" option
      await expect(
        page.getByRole("button", { name: /Switch to Local AI/i })
      ).toBeVisible();
    });
  });
});
