import { users } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/test';

const { customer } = users;

test.describe('Login', { tag: '@login' }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.open();
  });

  test('customer can log in', { tag: '@smoke' }, async ({ loginPage, accountPage, homePage }) => {
    await loginPage.login(customer.email, customer.password);

    // The shop redirects to /account after a successful login.
    await accountPage.expectRedirectedHere();
    // Proof that the session is real: another page shows the user's name in the header.
    // (Not the account page itself: see the note in AccountPage.ts about the bot check on CI.)
    await homePage.open();
    await homePage.header.expectLoggedInAs(customer.fullName);
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

  test('customer can sign out again', async ({ loginPage, accountPage, homePage }) => {
    await loginPage.login(customer.email, customer.password);
    await accountPage.expectRedirectedHere();
    await homePage.open();

    await homePage.header.signOut();

    // The header switches back to "Sign in" right away...
    await homePage.header.expectLoggedOut();
    // ...and the session is really gone: a fresh page load is still logged out.
    await homePage.open();
    await homePage.header.expectLoggedOut();
  });
});
