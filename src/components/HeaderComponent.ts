import { type Locator, type Page, expect } from '@playwright/test';
import { step } from '../utils/step';

/**
 * The navigation bar shown on every page: sign in link, user menu and cart icon.
 *
 * It is a component, not a page: it has no URL of its own, so every page object
 * gets one instead of repeating these locators.
 */
export class HeaderComponent {
  readonly signInLink: Locator;
  /** The button with the user's name; it opens the account menu. */
  readonly userMenuButton: Locator;
  readonly signOutLink: Locator;
  readonly cartLink: Locator;
  /** The number on the cart icon. The whole icon is hidden while the cart is empty. */
  readonly cartQuantityBadge: Locator;

  /**
   * Builds the locators once; Playwright locators are lazy, so nothing is looked up until a step uses them.
   */
  constructor(page: Page) {
    this.signInLink = page.getByTestId('nav-sign-in');
    this.userMenuButton = page.getByTestId('nav-menu');
    this.signOutLink = page.getByTestId('nav-sign-out');
    this.cartLink = page.getByTestId('nav-cart');
    this.cartQuantityBadge = page.getByTestId('cart-quantity');
  }

  /** Signs out through the user menu. */
  @step('Sign out through the user menu')
  async signOut(): Promise<void> {
    // The sign-out link sits inside a drop-down menu, so open it first.
    await this.userMenuButton.click();
    await this.signOutLink.click();
  }

  /** Opens the cart (checkout step 1) from the cart icon. */
  @step('Open the cart')
  async openCart(): Promise<void> {
    await this.cartLink.click();
  }

  /** Checks that the user menu shows this full name, which means the login worked. */
  @step('Check the header shows "{0}"')
  async expectLoggedInAs(fullName: string): Promise<void> {
    await expect(this.userMenuButton).toHaveText(fullName);
  }

  /** Checks the logged-out state: the sign-in link is back and the user menu is gone. */
  @step('Check the user is logged out')
  async expectLoggedOut(): Promise<void> {
    await expect(this.signInLink).toBeVisible();
    await expect(this.userMenuButton).toBeHidden();
  }

  /** Checks the number on the cart icon. */
  @step('Check the cart badge shows {0}')
  async expectCartQuantity(quantity: number): Promise<void> {
    // toHaveText retries until the badge shows the number, so no manual wait is needed.
    await expect(this.cartQuantityBadge).toHaveText(String(quantity));
  }
}
