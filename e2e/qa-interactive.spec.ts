import { test, expect } from "@playwright/test";

// QA Interactive Exploration Test
// Run with: npx playwright test e2e/qa-interactive.spec.ts --headed --project=chromium

const mockUser = {
  id: "qa-test-user-id",
  email: "qa-tester@ta-app.test",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
};

const mockSession = {
  access_token: "qa-test-access-token",
  refresh_token: "qa-test-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: mockUser,
};

test.describe("QA Interactive Exploration", () => {
  test.setTimeout(600000); // 10 minutes for full exploration

  // Collect console errors across all tests
  const consoleErrors: string[] = [];

  test("Full application exploration", async ({ page }) => {
    // Collect console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        consoleErrors.push(`[CONSOLE ERROR] ${text}`);
        console.log(`  ⚠️ Console Error: ${text}`);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`[PAGE ERROR] ${err.message}`);
      console.log(`  ⚠️ Page Error: ${err.message}`);
    });

    console.log("=== QA INTERACTIVE EXPLORATION ===");
    console.log("Starting exploration at:", new Date().toISOString());

    // --- PHASE 1: AUTHENTICATION TESTS (Unauthenticated) ---
    console.log("\n--- PHASE 1: AUTHENTICATION TESTS ---");

    await page.goto("http://localhost:1420");
    await page.waitForLoadState("networkidle");

    // Check login page loads
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
    console.log("✓ Login page loads");

    // Check email and password fields
    const emailInput = page.getByPlaceholder("teacher@school.edu");
    const passwordInput = page.getByRole("textbox", { name: "Password" });
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    console.log("✓ Email and password fields visible");

    // Check Sign up button
    await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
    console.log("✓ Sign up button visible");

    // Check OAuth buttons
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /apple/i })).toBeVisible();
    console.log("✓ OAuth buttons (Google, Apple) visible");

    // Try invalid credentials
    await emailInput.fill("invalid@test.com");
    await passwordInput.fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForTimeout(3000);
    console.log("✓ Invalid credentials test complete");

    // --- PHASE 2: SETUP MOCK AUTH AND TEST DASHBOARD ---
    console.log("\n--- PHASE 2: DASHBOARD TESTS (Authenticated) ---");

    // Set up route mocks
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

    await page.route("**/rest/v1/credits**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ balance: 50, lifetime_granted: 50, lifetime_used: 0 }]),
      });
    });

    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/rest/v1/profiles**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ id: mockUser.id, email: mockUser.email }]),
      });
    });

    await page.route("**/rest/v1/inspiration_items**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Inject auth to localStorage
    await page.evaluate((session) => {
      localStorage.setItem(
        "sb-ugvrangptgrojipazqxh-auth-token",
        JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: Date.now() + 3600000,
          user: session.user,
        })
      );
    }, mockSession);

    await page.reload();
    await page.waitForLoadState("networkidle");
    console.log("✓ Auth injected, page reloaded");

    // Wait for dashboard
    await page.waitForSelector("main", { timeout: 15000 });
    console.log("✓ Dashboard main content loaded");

    // Check for prompt textarea
    const promptTextarea = page.getByPlaceholder(/describe|create|what would you like/i);
    await expect(promptTextarea).toBeVisible({ timeout: 10000 });
    console.log("✓ Prompt textarea visible");

    // Test character counter / Create button states
    await promptTextarea.fill("Short");
    await page.waitForTimeout(500);

    const createButton = page.getByRole("button", { name: /create/i });
    await expect(createButton).toBeVisible();
    const isDisabledShort = await createButton.isDisabled();
    console.log(`✓ Create button disabled for short prompt: ${isDisabledShort}`);

    // Fill with valid prompt
    const testPrompt = "Create a fun and engaging math worksheet for 2nd grade students about addition and subtraction with carrying and borrowing";
    await promptTextarea.fill(testPrompt);
    await page.waitForTimeout(500);
    const isDisabledLong = await createButton.isDisabled();
    console.log(`✓ Create button enabled for valid prompt: ${!isDisabledLong}`);

    // Check Projects panel
    const projectsPanel = page.getByText(/my projects/i);
    if (await projectsPanel.isVisible()) {
      console.log("✓ Projects panel visible");
    }

    // Check Inspiration panel
    const inspirationPanel = page.getByRole("heading", { name: "Design Inspiration" });
    if (await inspirationPanel.isVisible()) {
      console.log("✓ Inspiration panel visible");
    }

    // --- PHASE 3: CREATION WIZARD ---
    console.log("\n--- PHASE 3: CREATION WIZARD TESTS ---");

    // Click Create to open wizard
    await createButton.click();
    await page.waitForTimeout(1000);

    const wizardDialog = page.getByRole("dialog");
    await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    console.log("✓ Wizard dialog opened");

    // --- STEP 1: DETAILS ---
    console.log("\n  Step 1: Details");

    // Project title
    const titleInput = page.getByLabel(/project title/i);
    if (await titleInput.isVisible()) {
      await titleInput.fill("QA Test Math Worksheet");
      console.log("  ✓ Project title field works");
    } else {
      console.log("  ⚠️ Project title field NOT visible");
    }

    // Grade dropdown
    const allComboboxes = wizardDialog.locator('[role="combobox"]');
    const comboboxCount = await allComboboxes.count();
    console.log(`  Found ${comboboxCount} comboboxes in wizard`);

    if (comboboxCount >= 1) {
      const gradeCombobox = allComboboxes.nth(0);
      await gradeCombobox.click();
      await page.waitForTimeout(300);
      const gradeOption = page.getByRole("option").first();
      if (await gradeOption.isVisible()) {
        await gradeOption.click();
        console.log("  ✓ Grade dropdown works");
      }
    }

    // Subject dropdown
    if (comboboxCount >= 2) {
      const subjectCombobox = allComboboxes.nth(1);
      await subjectCombobox.click();
      await page.waitForTimeout(300);
      const subjectOption = page.getByRole("option").first();
      if (await subjectOption.isVisible()) {
        await subjectOption.click();
        console.log("  ✓ Subject dropdown works");
      }
    }

    // Difficulty dropdown
    if (comboboxCount >= 3) {
      const difficultyCombobox = allComboboxes.nth(2);
      await difficultyCombobox.click();
      await page.waitForTimeout(300);
      const diffOption = page.getByRole("option").first();
      if (await diffOption.isVisible()) {
        await diffOption.click();
        console.log("  ✓ Difficulty dropdown works");
      }
    }

    // Check answer key toggle
    const answerKeySwitch = page.getByRole("switch").first();
    if (await answerKeySwitch.isVisible()) {
      console.log("  ✓ Toggle switches visible");
    }

    // Click Next
    const nextBtn = wizardDialog.getByRole("button", { name: /next/i });
    await nextBtn.click();
    await page.waitForTimeout(500);
    console.log("  ✓ Advanced to Step 2");

    // --- STEP 2: INSPIRATION ---
    console.log("\n  Step 2: Inspiration");

    const addUrlBtn = page.getByRole("button", { name: /add url/i });
    if (await addUrlBtn.isVisible()) {
      console.log("  ✓ Add URL button visible");
    }

    // Check for drop zone
    const dropZone = page.getByText(/drop files|drag.*drop/i);
    if (await dropZone.isVisible()) {
      console.log("  ✓ Drop zone visible");
    }

    // Skip/Next to next step
    const skipBtn = wizardDialog.getByRole("button", { name: /skip|next/i });
    await skipBtn.click();
    await page.waitForTimeout(500);
    console.log("  ✓ Advanced to Step 3");

    // --- STEP 3: AI PROVIDER ---
    console.log("\n  Step 3: AI Provider");

    // Check provider options
    const premiumOption = page.getByText("Premium AI").first();
    if (await premiumOption.isVisible()) {
      console.log("  ✓ Premium AI option visible");
    }

    const localOption = page.getByText("Local AI").first();
    if (await localOption.isVisible()) {
      console.log("  ✓ Local AI option visible");

      // Click to select Local AI
      await localOption.click();
      await page.waitForTimeout(500);
      console.log("  ✓ Selected Local AI provider");
    }

    // Next to Step 4
    const nextBtn3 = wizardDialog.getByRole("button", { name: /next/i });
    await nextBtn3.click();
    await page.waitForTimeout(500);
    console.log("  ✓ Advanced to Step 4");

    // --- STEP 4: OUTPUT ---
    console.log("\n  Step 4: Output");

    const pathInput = page.getByPlaceholder(/folder path/i);
    if (await pathInput.isVisible()) {
      await pathInput.fill("C:\\Temp\\QA-Test-Output");
      console.log("  ✓ Output path field works");
    }

    // Check file list info
    const fileList = page.getByText(/Worksheet\.html/i).first();
    if (await fileList.isVisible()) {
      console.log("  ✓ File list preview visible");
    }

    // Check Generate button
    const generateBtn = wizardDialog.getByRole("button", { name: /generate/i });
    if (await generateBtn.isVisible()) {
      const genDisabled = await generateBtn.isDisabled();
      console.log(`  ✓ Generate button visible, disabled: ${genDisabled}`);
    }

    // Test wizard close
    const closeBtn = wizardDialog.getByRole("button", { name: "Close" });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
      console.log("  ✓ Wizard closed successfully");
    }

    // --- PHASE 4: SETTINGS ---
    console.log("\n--- PHASE 4: SETTINGS TESTS ---");

    // Look for settings/gear button in header
    const headerButtons = page.locator("header button");
    const headerBtnCount = await headerButtons.count();
    console.log(`  Found ${headerBtnCount} buttons in header`);

    // Find and click settings button (usually has gear icon)
    for (let i = 0; i < Math.min(headerBtnCount, 3); i++) {
      const btn = headerButtons.nth(i);
      const text = await btn.textContent();
      console.log(`  Header button ${i}: "${text?.substring(0, 20) || '(no text)'}"`);
    }

    // Click first button (often settings)
    if (headerBtnCount > 0) {
      await headerButtons.first().click();
      await page.waitForTimeout(1000);

      const settingsDialog = page.getByRole("dialog");
      if (await settingsDialog.isVisible()) {
        console.log("✓ Dialog opened from header button");

        // Check for Ollama status
        const ollamaStatus = page.getByRole("heading", { name: "Local AI Setup" });
        if (await ollamaStatus.isVisible()) {
          console.log("✓ Local AI Setup dialog visible");
        }

        // Close dialog
        await page.keyboard.press("Escape");
        await page.waitForTimeout(500);
      }
    }

    // --- PHASE 5: INSPIRATION PANEL ---
    console.log("\n--- PHASE 5: INSPIRATION PANEL TESTS ---");

    const addInspirationBtn = page.getByRole("button", { name: /add url/i });
    if (await addInspirationBtn.isVisible()) {
      await addInspirationBtn.click();
      await page.waitForTimeout(500);

      // Check if URL input dialog/prompt appears
      const urlInput = page.getByPlaceholder(/url|http/i);
      if (await urlInput.isVisible()) {
        await urlInput.fill("https://example.com/worksheet");
        console.log("✓ URL input works in Inspiration panel");

        // Cancel/close
        await page.keyboard.press("Escape");
      }
    }

    // --- SUMMARY ---
    console.log("\n=== EXPLORATION SUMMARY ===");
    console.log(`Console errors found: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors:");
      consoleErrors.forEach((err) => console.log(`  ${err}`));
    } else {
      console.log("✓ No console errors detected");
    }

    console.log("\n✓ Phase 1-5 exploration complete");
    console.log("Browser will remain open for 30 seconds for manual inspection...");

    // Keep browser open for manual inspection
    await page.waitForTimeout(30000);
  });
});
