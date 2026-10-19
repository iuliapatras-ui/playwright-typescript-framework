export type SortDirection = 'asc' | 'desc';

/**
 * True when `values` is already in `direction` order.
 * Strings are compared like a shop sorts names: case-insensitive, locale-aware.
 */
export function isSorted<T extends string | number>(values: readonly T[], direction: SortDirection): boolean {
  /** Negative, zero or positive like a sort comparator: strings by locale, numbers by value. */
  const compare = (a: T, b: T): number =>
    typeof a === 'string' && typeof b === 'string'
      ? a.localeCompare(b, 'en', { sensitivity: 'base' })
      : Number(a) - Number(b);

  // Every neighbour pair must be in order; equal neighbours are fine.
  return values.every((value, i) => {
    if (i === 0) return true;
    const result = compare(values[i - 1], value);
    return direction === 'asc' ? result <= 0 : result >= 0;
  });
}
