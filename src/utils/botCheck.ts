import { type Locator, type Page, test } from '@playwright/test';

/**
 * Skips the current test when the site answers with Cloudflare's bot check page.
 *
 * From CI runners (data-centre IPs) the shop's Cloudflare protection sometimes shows
 * "Performing security verification" after a login through the form; from then on every
 * page of that browser session is the check page. That is the site's protection doing
 * its job, not a bug in the shop, and tests must not try to get past it. So the test is
 * reported as skipped, with the reason, instead of failing or passing silently.
 *
 * Call it at the point where the next page should have loaded.
 */
export async function skipIfBotCheck(page: Page, expectedContent: Locator): Promise<void> {
  const botCheck = page.getByRole('heading', { name: 'Performing security verification' });
  // Wait for whichever comes first: the expected page content or the bot check (no fixed wait).
  await expectedContent.or(botCheck).first().waitFor();
  test.skip(await botCheck.isVisible(), 'Cloudflare bot check ("Performing security verification") shown by the site');
}
