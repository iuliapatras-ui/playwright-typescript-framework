import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/** Where the setup project saves the logged-in customer's cookies and local storage. */
export const CUSTOMER_STORAGE_STATE = '.auth/customer.json';

/**
 * Projects:
 *  - setup:    logs the customer in once and saves the session (tests/auth.setup.ts)
 *  - api:      REST API tests, no browser at all
 *  - chromium, firefox, webkit: the UI tests, once per browser engine
 *
 * Run one project with --project, e.g.  npx playwright test --project=chromium
 */
export default defineConfig({
  testDir: './tests',
  // Every test is independent, so tests inside one file may run in parallel too.
  fullyParallel: true,
  // A stray test.only must never pass CI silently by skipping the rest of the suite.
  forbidOnly: env.isCI,
  // Public demo site: retry on CI to tell a real failure from a one-off network hiccup.
  retries: env.isCI ? 2 : 0,
  // The shared demo site rate-limits hard bursts; a few workers are fast and polite.
  workers: env.isCI ? 2 : 4,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: env.isCI
    ? [['github'], ['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: env.baseUrl,
    // The shop marks its elements with data-test="...", so getByTestId() reads that attribute.
    testIdAttribute: 'data-test',
    // Evidence for failures only: keeps passing runs fast and the report small.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/api',
      // API tests talk to the API host, not the web shop.
      use: { baseURL: env.apiUrl, extraHTTPHeaders: { Accept: 'application/json' } },
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],
});
