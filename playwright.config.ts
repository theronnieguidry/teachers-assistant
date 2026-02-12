import { defineConfig, devices } from "@playwright/test";

const useWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";

/**
 * Playwright E2E Test Configuration for TA (Teacher's Assistant)
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e-results",

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry flaky tests - 1 retry locally, 2 on CI */
  retries: process.env.CI ? 2 : 1,

  /* Limit workers for stability - 1 on CI, 4 locally */
  workers: process.env.CI ? 1 : 4,

  /* Global timeout for individual tests */
  timeout: 60000,

  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },

  /* Reporter to use */
  reporter: [
    ["html", { outputFolder: "e2e-report" }],
    ["list"],
    ["json", { outputFile: "e2e-results/results.json" }],
  ],

  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: "http://localhost:1420",

    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on failure */
    video: "retain-on-failure",

    /* Action timeout (clicking, filling, etc.) */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        /* Firefox needs longer timeouts per CLAUDE.md */
        actionTimeout: 15000,
      },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: useWebServer
    ? {
        command: "npm run dev",
        url: "http://localhost:1420",
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      }
    : undefined,
});
