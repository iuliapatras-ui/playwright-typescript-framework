import { type APIRequestContext, type Page, test as base } from '@playwright/test';
import { AuthApi } from '../api/AuthApi';
import { CartsApi } from '../api/CartsApi';
import { ProductsApi } from '../api/ProductsApi';
import { env, users } from '../config/env';
import { AccountPage } from '../pages/AccountPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';

/** Settings a test file can change with test.use(...). */
type Options = {
  /**
   * Start the test already logged in as this user, e.g. test.use({ loggedInAs: 'customer' }).
   * Default: not logged in.
   */
  loggedInAs: keyof typeof users | undefined;
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
export const test = base.extend<Options & PageFixtures & ApiFixtures>({
  loggedInAs: [undefined, { option: true }],

  // Wraps the built-in page: when the test wants a logged-in user, log in through the API
  // and put the token where the front end looks for it, before any page script runs.
  // Faster than the login form, and a fresh token per test: the shop's tokens live only
  // 5 minutes, so a login saved once per run (storageState) would expire in long runs.
  page: async ({ page, loggedInAs, authApi }, use) => {
    if (loggedInAs) {
      const { email, password } = users[loggedInAs];
      const token = await authApi.getAccessToken(email, password);
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
