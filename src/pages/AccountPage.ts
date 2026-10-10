import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** "My account" overview (/account), where a successful login lands. */
export class AccountPage extends BasePage {
  static readonly path = '/account';

  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByTestId('page-title');
  }

  async open(): Promise<void> {
    await this.page.goto(AccountPage.path);
  }

  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${AccountPage.path}$`));
    await expect(this.pageTitle).toHaveText('My account');
  }
}
