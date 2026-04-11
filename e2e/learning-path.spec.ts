import { test, expect } from "./fixtures";

test.describe("Learning Path Feature", () => {
  test.use({
    fixtureOptions: {
      withLearnerProfile: false,
      creditBalance: 50,
    },
  });

  test.describe("Tab Navigation", () => {
    test("LP-001: should display Today tab by default", async ({ authenticatedPage: page }) => {
      const todayTab = page.getByRole("tab", { name: /today/i });
      await expect(todayTab).toBeVisible();
      await expect(todayTab).toHaveAttribute("data-state", "active");
    });

    test("LP-002: should display Learning Path tab", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("tab", { name: /learning path/i })
      ).toBeVisible();
    });

    test("LP-003: should display Projects tab", async ({ authenticatedPage: page }) => {
      await expect(page.getByRole("tab", { name: /projects/i })).toBeVisible();
    });

    test("LP-004: should switch to Learning Path tab on click", async ({ authenticatedPage: page }) => {
      const learningPathTab = page.getByRole("tab", { name: /learning path/i });
      await learningPathTab.click();
      await expect(learningPathTab).toHaveAttribute("data-state", "active");
    });

    test("LP-005: should switch to Projects tab on click", async ({ authenticatedPage: page }) => {
      const projectsTab = page.getByRole("tab", { name: /projects/i });
      await projectsTab.click();
      await expect(projectsTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Today View - No Learner", () => {
    test("LP-006: should show welcome message when no learner profiles exist", async ({ authenticatedPage: page }) => {
      await expect(page.getByText("Welcome to Learning Path!")).toBeVisible({
        timeout: 5000,
      });
    });

    test("LP-007: should show Add Learner button when no profiles exist", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("button", { name: /add.*learner/i })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Create Learner Dialog", () => {
    test("LP-008: should open Create Learner dialog when Add Learner button clicked", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/add a learner/i)).toBeVisible();
    });

    test("LP-009: should have name input in Create Learner dialog", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      await expect(
        page.getByPlaceholder(/emma|nickname|name/i)
      ).toBeVisible();
    });

    test("LP-010: should have grade selector in Create Learner dialog", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      await expect(page.getByRole("combobox").first()).toBeVisible();
    });

    test("LP-011: should create learner when form submitted", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Test Student");
      await nameInput.press("Enter");

      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
      await expect(
        page.getByRole("heading", { name: /test student/i })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Today View - With Learner", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      await nameInput.press("Enter");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-012: should show greeting with learner name", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("heading", { name: /emma/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-013: should show Next Up section", async ({ authenticatedPage: page }) => {
      await expect(page.getByText(/next up/i)).toBeVisible({ timeout: 5000 });
    });

    test("LP-014: should show Start Lesson button", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("button", { name: /start lesson/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-015: should show Progress section", async ({ authenticatedPage: page }) => {
      await expect(page.getByText("Overall Progress")).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe("Learning Path View", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      await nameInput.press("Enter");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

      await page.getByRole("tab", { name: /learning path/i }).click();
    });

    test("LP-016: should show subject tabs", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("tab", { name: /math/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-017: should show curriculum units", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByText(/counting|addition|shapes/i).first()
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-018: should have filter buttons", async ({ authenticatedPage: page }) => {
      await expect(
        page.getByRole("button", { name: /all/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-019: should switch subjects when tab clicked", async ({ authenticatedPage: page }) => {
      const readingTab = page.getByRole("tab", { name: /reading/i });
      await readingTab.click();
      await expect(readingTab).toHaveAttribute("data-state", "active");
    });
  });

  test.describe("Learner Switcher", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      await nameInput.press("Enter");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-020: should show learner switcher in header after creating learner", async ({ authenticatedPage: page }) => {
      await expect(
        page.locator("header").getByRole("combobox")
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-021: should show Add Learner option in switcher dropdown", async ({ authenticatedPage: page }) => {
      const switcher = page.locator("header").getByRole("combobox");
      await switcher.click();
      await expect(
        page.getByRole("option", { name: /add learner/i })
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Start Lesson Integration", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      await nameInput.press("Enter");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-022: clicking Start Lesson should open wizard dialog", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /start lesson/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Quick Check Integration", () => {
    test.beforeEach(async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /add.*learner/i }).click();
      const nameInput = page.getByPlaceholder(/emma|nickname|name/i);
      await nameInput.fill("Emma");
      await nameInput.press("Enter");
      await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
    });

    test("LP-023: Quick Check button opens the dialog from Today", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /^quick check$/i }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByRole("heading", { name: "Quick Check" })).toBeVisible();
    });

    test("LP-024: submitting 3/3 shows 100% and an advance recommendation", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /^quick check$/i }).click();
      const dialog = page.getByRole("dialog");

      await dialog.getByRole("button", { name: "Correct" }).nth(0).click();
      await dialog.getByRole("button", { name: "Correct" }).nth(1).click();
      await dialog.getByRole("button", { name: "Correct" }).nth(2).click();
      await dialog.getByRole("button", { name: /save quick check/i }).click();

      await expect(dialog.getByText(/100%/)).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/ready to move on/i)).toBeVisible();
    });

    test("LP-025: submitting 2/3 surfaces Practice Again", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /^quick check$/i }).click();
      const dialog = page.getByRole("dialog");

      await dialog.getByRole("button", { name: "Correct" }).nth(0).click();
      await dialog.getByRole("button", { name: "Correct" }).nth(1).click();
      await dialog.getByRole("button", { name: "Needs help" }).nth(2).click();
      await dialog.getByRole("button", { name: /save quick check/i }).click();

      await expect(
        dialog.getByRole("button", { name: /practice again/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-026: submitting 1/3 surfaces Generate Remediation", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /^quick check$/i }).click();
      const dialog = page.getByRole("dialog");

      await dialog.getByRole("button", { name: "Correct" }).nth(0).click();
      await dialog.getByRole("button", { name: "Needs help" }).nth(1).click();
      await dialog.getByRole("button", { name: "Needs help" }).nth(2).click();
      await dialog.getByRole("button", { name: /save quick check/i }).click();

      await expect(
        dialog.getByRole("button", { name: /generate remediation/i })
      ).toBeVisible({ timeout: 5000 });
    });

    test("LP-027: remediation CTA opens the wizard in remediation mode", async ({ authenticatedPage: page }) => {
      await page.getByRole("button", { name: /^quick check$/i }).click();
      const dialog = page.getByRole("dialog");

      await dialog.getByRole("button", { name: "Correct" }).nth(0).click();
      await dialog.getByRole("button", { name: "Needs help" }).nth(1).click();
      await dialog.getByRole("button", { name: "Needs help" }).nth(2).click();
      await dialog.getByRole("button", { name: /save quick check/i }).click();
      await dialog.getByRole("button", { name: /generate remediation/i }).click();

      await expect(page.getByText(/Create: Remediation:/i)).toBeVisible({
        timeout: 5000,
      });
    });
  });
});
