import { test as base } from '@playwright/test';
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

/**
 * Playwright's `test`, extended with page objects as fixtures.
 *
 * A test lists what it needs, e.g. `async ({ loginPage }) => ...`, and Playwright
 * creates exactly those objects for that test's own page. No `new LoginPage(page)`
 * in the tests, and nothing is shared between tests.
 */
export const test = base.extend<PageFixtures>({
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
});

export { expect } from '@playwright/test';
