import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/**
 * "My account" overview (/account), where a successful login redirects to.
 *
 * Note: from CI runners the site's Cloudflare protection may show a bot check here
 * instead of the page; the login tests detect that with skipIfBotCheck().
 */
export class AccountPage extends BasePage {
  static readonly path = '/account';

  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByTestId('page-title');
  }

  @step('Check the login redirected to the account page')
  async expectRedirectedHere(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${AccountPage.path}$`));
  }

  @step('Check the account page is open')
  async expectOpen(): Promise<void> {
    await this.expectRedirectedHere();
    await expect(this.pageTitle).toHaveText('My account');
  }
}
