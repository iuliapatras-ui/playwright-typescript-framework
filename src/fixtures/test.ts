import { type APIRequestContext, type Page, test as base } from '@playwright/test';
import { AuthApi } from '../api/AuthApi';
import { CartsApi } from '../api/CartsApi';
import { ProductsApi } from '../api/ProductsApi';
import { env } from '../config/env';
import { buildNewUser, type TestUser } from '../data/users';
import { AccountPage } from '../pages/AccountPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';

/** Settings a test file can change with test.use(...). */
type Options = {
  /**
   * Start the test already logged in as `testUser`: test.use({ loggedIn: true }).
   * Default: not logged in.
   */
  loggedIn: boolean;
};

/** Created once per worker process and shared by that worker's tests. */
type WorkerFixtures = {
  /**
   * A customer account registered through the API for this worker. Ours alone: the demo's
   * published accounts are shared with everyone, and others changed their name and password
   * while this suite was running. One per worker (not per test) keeps the number of accounts
   * created on the public demo small.
   */
  testUser: TestUser;
};

/** The page objects every UI test can ask for by name. */
type PageFixtures = {
  homePage: HomePage;
  productPage: ProductPage;
  loginPage: LoginPage;
  accountPage: AccountPage;
  checkoutPage: CheckoutPage;
};

/** The API service objects; usable from API tests and from UI tests (e.g. to prepare data). */
type ApiFixtures = {
  apiRequest: APIRequestContext;
  authApi: AuthApi;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
};

/** The key under which the shop's front end keeps the JWT in localStorage. */
const AUTH_TOKEN_KEY = 'auth-token';

/**
 * Playwright's `test`, extended with page objects and API clients as fixtures.
 *
 * A test lists what it needs, e.g. `async ({ loginPage }) => ...`, and Playwright
 * creates exactly those objects for that test, lazily: an API test never starts a
 * browser because it never asks for `page`. Nothing is shared between tests.
 */
export const test = base.extend<Options & PageFixtures & ApiFixtures, WorkerFixtures>({
  loggedIn: [false, { option: true }],

  testUser: [
    async ({ playwright }, use) => {
      // Worker fixtures can't use the test-scoped apiRequest, so this one has its own context.
      const request = await playwright.request.newContext({
        baseURL: env.apiUrl,
        extraHTTPHeaders: { Accept: 'application/json' },
      });
      const user = buildNewUser();
      const response = await new AuthApi(request).register(user);
      if (response.status() !== 201) {
        throw new Error(`Registering the test user failed: ${response.status()} ${await response.text()}`);
      }
      await request.dispose();
      await use(user);
    },
    { scope: 'worker' },
  ],

  // Wraps the built-in page: when the test wants a logged-in user, log in through the API
  // and put the token where the front end looks for it, before any page script runs.
  // Faster than the login form, and a fresh token per test: the shop's tokens live only
  // 5 minutes, so a login saved once per run (storageState) would expire in long runs.
  page: async ({ page, loggedIn, testUser, authApi }, use) => {
    if (loggedIn) {
      const token = await authApi.getAccessToken(testUser.email, testUser.password);
      await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [AUTH_TOKEN_KEY, token]);
    }
    await use(page);
  },

  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  // An HTTP client bound to the API host. The built-in `request` fixture uses the
  // project's baseURL, which is the web shop in the UI projects, so a dedicated one is needed.
  apiRequest: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: env.apiUrl,
      // Without this the API answers validation errors with a 302 redirect instead of JSON.
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(context);
    await context.dispose();
  },
  authApi: async ({ apiRequest }, use) => {
    await use(new AuthApi(apiRequest));
  },
  productsApi: async ({ apiRequest }, use) => {
    await use(new ProductsApi(apiRequest));
  },
  cartsApi: async ({ apiRequest }, use) => {
    await use(new CartsApi(apiRequest));
  },
});

/**
 * Makes the shop's front end use an existing cart (e.g. one filled through the API):
 * the front end keeps the cart id and the badge count in sessionStorage.
 * Call before the first page.goto().
 */
export async function useCartInBrowser(page: Page, cartId: string, quantity: number): Promise<void> {
  await page.addInitScript(
    ([id, count]) => {
      window.sessionStorage.setItem('cart_id', id);
      window.sessionStorage.setItem('cart_quantity', count);
    },
    [cartId, String(quantity)],
  );
}

export { expect } from '@playwright/test';
