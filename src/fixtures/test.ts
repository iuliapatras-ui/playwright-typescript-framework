import { type APIRequestContext, test as base } from '@playwright/test';
import { AuthApi } from '../api/AuthApi';
import { CartsApi } from '../api/CartsApi';
import { ProductsApi } from '../api/ProductsApi';
import { env } from '../config/env';
import { AccountPage } from '../pages/AccountPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProductPage } from '../pages/ProductPage';

/** The page objects every UI test can ask for by name. */
type PageFixtures = {
  homePage: HomePage;
  productPage: ProductPage;
  loginPage: LoginPage;
  accountPage: AccountPage;
};

/** The API service objects; usable from API tests and from UI tests (e.g. to prepare data). */
type ApiFixtures = {
  apiRequest: APIRequestContext;
  authApi: AuthApi;
  productsApi: ProductsApi;
  cartsApi: CartsApi;
};

/**
 * Playwright's `test`, extended with page objects and API clients as fixtures.
 *
 * A test lists what it needs, e.g. `async ({ loginPage }) => ...`, and Playwright
 * creates exactly those objects for that test, lazily: an API test never starts a
 * browser because it never asks for `page`. Nothing is shared between tests.
 */
export const test = base.extend<PageFixtures & ApiFixtures>({
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

export { expect } from '@playwright/test';
