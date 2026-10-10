import { LoginResponseSchema } from '../../src/api/schemas';
import { users } from '../../src/config/env';
import { expect, test } from '../../src/fixtures/test';

const { customer } = users;

test.describe('Auth API', { tag: ['@api', '@auth'] }, () => {
  test('valid login returns a bearer JWT', { tag: '@smoke' }, async ({ authApi }) => {
    const response = await authApi.login(customer.email, customer.password);

    expect(response.status()).toBe(200);
    // Contract: the schema checks the token format, the token type and the expiry.
    const body = LoginResponseSchema.parse(await response.json());
    expect(body.expires_in, 'token lifetime in seconds').toBeGreaterThan(0);
  });

  test('the token identifies the logged-in user', async ({ authApi }) => {
    const token = await authApi.getAccessToken(customer.email, customer.password);

    const user = await authApi.getCurrentUser(token);

    expect(user.email).toBe(customer.email);
    expect(`${user.first_name} ${user.last_name}`).toBe(customer.fullName);
  });

  test('wrong password is rejected with 401', { tag: '@negative' }, async ({ authApi }) => {
    const response = await authApi.login(customer.email, 'not-the-password');

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  test('current user needs a token', { tag: '@negative' }, async ({ authApi }) => {
    const response = await authApi.me();

    expect(response.status()).toBe(401);
  });

  test('a made-up token is rejected', { tag: '@negative' }, async ({ authApi }) => {
    // Right JWT shape, wrong signature.
    const response = await authApi.me('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.invalid-signature');

    expect(response.status()).toBe(401);
  });
});
