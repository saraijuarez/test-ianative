import { defineConfig, devices } from '@playwright/test';

/**
 * CI context copied into the JSON report (`config.metadata`) so each results file
 * can be traced back to its commit and GitHub Actions run. Only variables that are
 * actually set are included — locally this is an empty object, never guessed values.
 */
const ciEnvKeys = [
  'GITHUB_SHA',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
  'GITHUB_REF_NAME',
  'GITHUB_WORKFLOW',
  'GITHUB_EVENT_NAME',
  'GITHUB_REPOSITORY',
  'GITHUB_SERVER_URL',
] as const;
const ciMetadata = Object.fromEntries(
  ciEnvKeys.flatMap((key) => (process.env[key] ? [[key, process.env[key]]] : [])),
);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporters: `list` prints progress in the terminal, `html` writes playwright-report/,
   * `json` writes machine-readable results for observability/ (see observability/README.md).
   * See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html'], ['json', { outputFile: 'results/playwright-results.json' }]],
  metadata: ciMetadata,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL for `page.goto('/')`. Tests that pass an absolute URL are unaffected. */
    baseURL: 'https://www.saucedemo.com',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    /* API tests: no browser, run once, against the DummyJSON base URL. */
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      use: { baseURL: 'https://dummyjson.com' },
    },

    /* UI projects skip the API tests so they do not run once per browser. */
    {
      name: 'chromium',
      testIgnore: /api\//,
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      testIgnore: /api\//,
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: /api\//,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
