/**
 * All settings in one place.
 *
 * Every value can be overridden without touching code, in this order:
 *   1. a real environment variable, e.g.  BASE_URL=https://... npx playwright test
 *   2. a local .env file (copy .env.example), loaded below
 *   3. the default written here
 */
import { existsSync } from 'node:fs';

// Node 20.12+ can read .env files on its own, so no dotenv dependency is needed.
// Real environment variables win: loadEnvFile never overwrites a variable that is already set.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

/** Returns the environment variable `name`, or `fallback` when it is not set or empty. */
function read(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const env = {
  /** Toolshop web shop (Angular front end). */
  baseUrl: read('BASE_URL', 'https://practicesoftwaretesting.com'),
  /** Toolshop REST API used by the front end; the API tests call it directly. */
  apiUrl: read('API_URL', 'https://api.practicesoftwaretesting.com'),
  /** True on GitHub Actions (and most CI servers), which set CI=true. */
  isCI: Boolean(process.env.CI),
} as const;

/**
 * Test users. Toolshop publishes them on its documentation page; they are not secrets,
 * but they can still be replaced through environment variables.
 */
export const users = {
  customer: {
    email: read('CUSTOMER_EMAIL', 'customer@practicesoftwaretesting.com'),
    password: read('CUSTOMER_PASSWORD', 'welcome01'),
    fullName: 'Jane Doe',
  },
} as const;
