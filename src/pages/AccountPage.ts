import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/** "My account" overview (/account), where a successful login lands. */
export class AccountPage extends BasePage {
  static readonly path = '/account';

  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = page.getByTestId('page-title');
  }

  @step('Open the account page')
  async open(): Promise<void> {
    await this.page.goto(AccountPage.path);
  }

  @step('Check the account page is open')
  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${AccountPage.path}$`));
    await expect(this.pageTitle).toHaveText('My account');
  }
}
