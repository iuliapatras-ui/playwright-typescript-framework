import { type Locator, type Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/** The sign-in page (/auth/login). */
export class LoginPage extends BasePage {
  static readonly path = '/auth/login';

  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  /** Shown under the form when the server rejects the credentials. */
  readonly loginError: Locator;
  /** Field-level messages shown by the form itself before anything is sent. */
  readonly emailError: Locator;
  readonly passwordError: Locator;

  /**
   * Builds the locators once; Playwright locators are lazy, so nothing is looked up until a step uses them.
   */
  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByTestId('email');
    this.passwordInput = page.getByTestId('password');
    this.submitButton = page.getByTestId('login-submit');
    this.loginError = page.getByTestId('login-error');
    this.emailError = page.getByTestId('email-error');
    this.passwordError = page.getByTestId('password-error');
  }

  /** Opens the login page. */
  @step('Open the login page')
  async open(): Promise<void> {
    await this.page.goto(LoginPage.path);
  }

  /** Fills in the form and submits it. Does not check the result: callers decide what to expect. */
  @step('Log in with the form as {0}')
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Checks the URL and that the form can be submitted. */
  @step('Check the login page is open')
  async expectOpen(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${LoginPage.path}$`));
    await expect(this.submitButton).toBeVisible();
  }

  /** Checks the error the server sent back under the form. */
  @step('Check the login error "{0}"')
  async expectLoginError(message: string): Promise<void> {
    await expect(this.loginError).toHaveText(message);
  }
}
