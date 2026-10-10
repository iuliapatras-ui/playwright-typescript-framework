import { type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/**
 * "My account" (/account), where a successful login redirects to.
 *
 * Only the URL is checked, not the page content: from CI runners (data-centre IPs) the
 * site's Cloudflare protection answers /account with a "Performing security verification"
 * bot check instead of the page. Other pages are not affected, so tests confirm the login
 * through the header on the home page instead (see tests/ui/login.spec.ts).
 */
export class AccountPage extends BasePage {
  static readonly path = '/account';

  constructor(page: Page) {
    super(page);
  }

  @step('Check the login redirected to the account page')
  async expectRedirectedHere(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${AccountPage.path}$`));
  }
}
