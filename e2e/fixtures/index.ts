/**
 * Playwright Test Fixtures for E2E Tests
 *
 * This module provides custom fixtures that handle common test setup
 * like authentication, learner profiles, and project data.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from "./fixtures";
 *
 * test("my test", async ({ authenticatedPage: page }) => {
 *   // page is already authenticated and loaded
 * });
 * ```
 */

import { test as base, Page } from "@playwright/test";
import {
  mockUser,
  mockSession,
  mockLearnerProfile,
  mockCredits,
  mockCompletedProject,
  mockProjectVersion,
  SUPABASE_AUTH_KEY,
} from "./mock-data";

// ============================================
// Fixture Type Definitions
// ============================================

/**
 * Options that can be configured per-test using test.use()
 */
type FixtureOptions = {
  /** Include learner profile in localStorage (default: true) */
  withLearnerProfile: boolean;
  /** Credit balance for the test user (default: 50) */
  creditBalance: number;
};

/**
 * Available fixtures
 */
type Fixtures = {
  /** Page with auth routes mocked and localStorage set up */
  authenticatedPage: Page;
  /** Page with auth + mock project data */
  withProjects: Page;
  /** Configurable fixture options */
  fixtureOptions: FixtureOptions;
};

// ============================================
// Helper Functions
// ============================================

/**
 * Set up common authentication routes (token, user, credits)
 * @param includeEmptyProjects - If true, adds a route returning empty projects array
 */
async function setupAuthRoutes(page: Page, creditBalance = 50, includeEmptyProjects = true) {
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
      body: JSON.stringify([{ ...mockCredits, balance: creditBalance }]),
    });
  });

  // Mock empty projects list (can be skipped for withProjects fixture)
  if (includeEmptyProjects) {
    await page.route("**/rest/v1/projects**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
  }
}

/**
 * Set up project-related routes (projects list, project versions)
 */
async function setupProjectRoutes(page: Page) {
  await page.route("**/rest/v1/projects**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([mockCompletedProject]),
    });
  });

  await page.route("**/rest/v1/project_versions**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([mockProjectVersion]),
    });
  });
}

/**
 * Generate the localStorage init script for authentication
 */
function getAuthInitScript(includeLearnerProfile: boolean): string {
  const authScript = `
    localStorage.setItem(
      "${SUPABASE_AUTH_KEY}",
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
  `;

  const learnerScript = includeLearnerProfile
    ? `
    localStorage.setItem(
      "ta-learner-profiles",
      JSON.stringify([${JSON.stringify(mockLearnerProfile)}])
    );
    localStorage.setItem("ta-active-learner-id", "${mockLearnerProfile.learnerId}");
  `
    : "";

  return authScript + learnerScript;
}

// ============================================
// Extended Test with Fixtures
// ============================================

export const test = base.extend<Fixtures>({
  // Default fixture options (can be overridden with test.use())
  fixtureOptions: [
    { withLearnerProfile: true, creditBalance: 50 },
    { option: true },
  ],

  /**
   * Authenticated page fixture
   *
   * Provides a page with:
   * - Mocked auth API routes (token, user, credits, empty projects)
   * - localStorage set up with auth token and optionally learner profile
   * - Already navigated to "/" and waited for main content
   *
   * Usage:
   * ```typescript
   * test("my test", async ({ authenticatedPage: page }) => {
   *   // page is ready to use
   * });
   * ```
   */
  authenticatedPage: async ({ page, fixtureOptions }, use) => {
    // Set up API route mocks (with empty projects)
    await setupAuthRoutes(page, fixtureOptions.creditBalance, true);

    // Set up localStorage via init script (runs before page load)
    await page.addInitScript(getAuthInitScript(fixtureOptions.withLearnerProfile));

    // Navigate and wait for app to load
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    // Provide the configured page to the test
    await use(page);
  },

  /**
   * Page with projects fixture
   *
   * Provides everything from authenticatedPage, plus:
   * - Mocked projects endpoint returning a completed project
   * - Mocked project_versions endpoint with HTML content
   *
   * Usage:
   * ```typescript
   * test("my test", async ({ withProjects: page }) => {
   *   // page has auth + mock project data
   * });
   * ```
   */
  withProjects: async ({ page, fixtureOptions }, use) => {
    // Set up project routes FIRST (routes are matched first-in-wins)
    await setupProjectRoutes(page);

    // Set up auth routes WITHOUT empty projects (since we added projects above)
    await setupAuthRoutes(page, fixtureOptions.creditBalance, false);

    // Set up localStorage
    await page.addInitScript(getAuthInitScript(fixtureOptions.withLearnerProfile));

    // Navigate and wait
    await page.goto("/");
    await page.waitForSelector("main", { timeout: 10000 });

    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from "@playwright/test";

// Re-export mock data for tests that need custom setups
export * from "./mock-data";
