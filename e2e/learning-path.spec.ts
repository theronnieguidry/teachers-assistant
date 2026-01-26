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

test.describe("Learning Path Feature", () => {
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

    // Mock projects endpoint (empty)
    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    // Set up mock auth state via localStorage
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
    // Wait for dashboard to load
    await page.waitForSelector("main", { timeout: 10000 });
  });

  test.describe("Tab Navigation", () => {
    test("LP-001: should display Today tab by default", async ({ page }) => {
      const todayTab = page.getByRole("tab", { name: /today/i });
      await expect(todayTab).toBeVisible();
      await expect(todayTab).toHaveAttribute("data-state", "active");
    });

    test("LP-002: should display Learning Path tab", async ({ page }) => {
      const learningPathTab = page.getByRole("tab", { name: /learning path/i });
      await expect(learningPathTab).toBeVisible();
    });

    test("LP-003: should display Projects tab", async ({ page }) => {
      const projectsTab = page.getByRole("tab", { name: /projects/i });
      await expect(projectsTab).toBeVisible();
    });

    test("LP-004: should switch to Learning Path tab on click", async ({ page }) => {
      const learningPathTab = page.getByRole("tab", { name: /learning path/i });
      await learningPathTab.click();
      await expect(learningPathTab).toHaveAttribute("data-state", "active");
    });

    test("LP-005: should switch to Projects tab on click", async ({ page }) => {
      const projectsTab = page.getByRole("tab", { name: /projects/i });
      await projectsTab.click();
      await expect(projectsTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Today View - No Learner", () => {
    test("LP-006: should show welcome message when no learner profiles exist", async ({ page }) => {
      // Today view should show welcome for first-time users
      const welcomeText = page.getByText(/welcome|add.*learner|first learner/i);
      await expect(welcomeText).toBeVisible({ timeout: 5000 });
    });

    test("LP-007: should show Add Learner button when no profiles exist", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await expect(addButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Create Learner Dialog", () => {
    test("LP-008: should open Create Learner dialog when Add Learner button clicked", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      // Check dialog opened
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/add a learner/i)).toBeVisible();
    });

    test("LP-009: should have name input in Create Learner dialog", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await expect(nameInput).toBeVisible();
    });

    test("LP-010: should have grade selector in Create Learner dialog", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      const gradeSelector = page.getByRole("combobox").first();
      await expect(gradeSelector).toBeVisible();
    });

    test("LP-011: should create learner when form submitted", async ({ page }) => {
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      // Fill in form
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Test Student");

      // Submit form
      const submitButton = page.getByRole("button", { name: /add learner/i }).last();
      await submitButton.click();

      // Dialog should close and learner should be created
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

      // Should see greeting with learner name
      await expect(page.getByText(/test student/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Today View - With Learner", () => {
    test.beforeEach(async ({ page }) => {
      // Create a learner first
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");

      const submitButton = page.getByRole("button", { name: /add learner/i }).last();
      await submitButton.click();

      // Wait for dialog to close
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-012: should show greeting with learner name", async ({ page }) => {
      await expect(page.getByText(/emma/i)).toBeVisible({ timeout: 5000 });
    });

    test("LP-013: should show Next Up section", async ({ page }) => {
      await expect(page.getByText(/next up/i)).toBeVisible({ timeout: 5000 });
    });

    test("LP-014: should show Start Lesson button", async ({ page }) => {
      const startButton = page.getByRole("button", { name: /start lesson/i });
      await expect(startButton).toBeVisible({ timeout: 5000 });
    });

    test("LP-015: should show Progress section", async ({ page }) => {
      await expect(page.getByText(/progress/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Learning Path View", () => {
    test.beforeEach(async ({ page }) => {
      // Create a learner first
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();

      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");

      const submitButton = page.getByRole("button", { name: /add learner/i }).last();
      await submitButton.click();

      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

      // Navigate to Learning Path tab
      const learningPathTab = page.getByRole("tab", { name: /learning path/i });
      await learningPathTab.click();
    });

    test("LP-016: should show subject tabs", async ({ page }) => {
      // Should have Math tab
      await expect(page.getByRole("tab", { name: /math/i })).toBeVisible({ timeout: 5000 });
    });

    test("LP-017: should show curriculum units", async ({ page }) => {
      // Should show some unit titles
      await expect(page.getByText(/counting|addition|shapes/i).first()).toBeVisible({ timeout: 5000 });
    });

    test("LP-018: should have filter buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /all/i })).toBeVisible({ timeout: 5000 });
    });

    test("LP-019: should switch subjects when tab clicked", async ({ page }) => {
      const readingTab = page.getByRole("tab", { name: /reading/i });
      await readingTab.click();
      await expect(readingTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Learner Switcher", () => {
    test.beforeEach(async ({ page }) => {
      // Create first learner
      let addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();
      let nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      let submitButton = page.getByRole("button", { name: /add learner/i }).last();
      await submitButton.click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-020: should show learner switcher in header after creating learner", async ({ page }) => {
      // Look for combobox with learner name
      const switcher = page.locator("header").getByRole("combobox");
      await expect(switcher).toBeVisible({ timeout: 5000 });
    });

    test("LP-021: should show Add Learner option in switcher dropdown", async ({ page }) => {
      const switcher = page.locator("header").getByRole("combobox");
      await switcher.click();

      const addOption = page.getByRole("option", { name: /add learner/i });
      await expect(addOption).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Start Lesson Integration", () => {
    test.beforeEach(async ({ page }) => {
      // Create a learner
      const addButton = page.getByRole("button", { name: /add.*learner/i });
      await addButton.click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      const submitButton = page.getByRole("button", { name: /add learner/i }).last();
      await submitButton.click();
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-022: clicking Start Lesson should open wizard dialog", async ({ page }) => {
      const startButton = page.getByRole("button", { name: /start lesson/i });
      await startButton.click();

      // Wizard dialog should open
      const wizardDialog = page.getByRole("dialog");
      await expect(wizardDialog).toBeVisible({ timeout: 5000 });
    });
  });
});
