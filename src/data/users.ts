import { randomBytes } from 'node:crypto';

/** A customer account the tests create for themselves. */
export type TestUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** As the shop's header shows it: "First Last". */
  fullName: string;
};

/**
 * A new, unique customer, ready to be registered through the API.
 *
 * Why not the demo's published accounts: they are shared with everyone who uses the demo,
 * and during the build other people changed their name and password mid-run. A user of
 * our own can only be changed by our own tests.
 */
export function buildNewUser(): TestUser {
  const id = `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
  // Names are fixed (the API allows at most 20 characters); the e-mail makes the user unique.
  const firstName = 'Playwright';
  const lastName = 'Tester';
  return {
    firstName,
    lastName,
    // example.com is reserved for examples: no real mailbox ever receives anything.
    email: `pw-ts-${id}@example.com`,
    // The shop wants upper and lower case, a digit and a symbol; random so it is never a known leaked one.
    password: `Pw!${randomBytes(6).toString('hex')}Aa9`,
    fullName: `${firstName} ${lastName}`,
  };
}
