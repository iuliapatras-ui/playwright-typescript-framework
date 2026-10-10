import { users } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/test';

const { customer } = users;

test.describe('Login', { tag: '@login' }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('customer can log in and lands on the account page', { tag: '@smoke' }, async ({ loginPage, accountPage }) => {
    await loginPage.login(customer.email, customer.password);

    await accountPage.expectOpen();
    // The header switches from "Sign in" to the user's name.
    await accountPage.header.expectLoggedInAs(customer.fullName);
  });

  test('wrong password is rejected with a message', { tag: '@negative' }, async ({ loginPage }) => {
    await loginPage.login(customer.email, 'not-the-password');

    await loginPage.expectLoginError('Invalid email or password');
    // Still on the login page, still logged out.
    await loginPage.expectOpen();
    await loginPage.header.expectLoggedOut();
  });

  test('empty form shows a message for each required field', { tag: '@negative' }, async ({ loginPage }) => {
    await loginPage.submitButton.click();

    await expect(loginPage.emailError).toHaveText('Email is required');
    await expect(loginPage.passwordError).toHaveText('Password is required');
  });

  test('customer can sign out again', async ({ loginPage, accountPage }) => {
    await loginPage.login(customer.email, customer.password);
    await accountPage.expectOpen();

    await accountPage.header.signOut();

    await loginPage.expectOpen();
    await loginPage.header.expectLoggedOut();
  });
});
