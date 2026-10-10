/**
 * Money helpers. Amounts are handled as whole cents (integers), never as floats,
 * so sums are exact: 0.1 + 0.2 is 0.30000000000000004 in floats, but 10 + 20 is 30.
 */

const PRICE_PATTERN = /\$?\s*(\d+)(?:\.(\d{1,2}))?/;

/** "$14.15" or "14.15" -> 1415. Throws when the text holds no amount. */
export function toCents(priceText: string): number {
  const match = PRICE_PATTERN.exec(priceText);
  if (!match) {
    throw new Error(`No price found in "${priceText}"`);
  }
  const [, dollars, fraction = '0'] = match;
  // "14.5" means 14.50, so pad the fraction to two digits before reading it.
  return Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
}

/** 1415 -> "$14.15", the way the shop displays prices. */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
