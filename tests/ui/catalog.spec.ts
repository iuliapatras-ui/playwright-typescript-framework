import { expect, test } from '../../src/fixtures/test';
import type { SortOption } from '../../src/pages/HomePage';
import { isSorted, type SortDirection } from '../../src/utils/sorting';

test.describe('Product catalogue', { tag: '@catalog' }, () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.open();
  });

  test('home page shows a full first page of products', { tag: '@smoke' }, async ({ homePage }) => {
    // The shop pages its catalogue by 9 products.
    await expect(homePage.productCards).toHaveCount(9);
    // Every card has a name and a price.
    await expect(homePage.productNames).toHaveCount(9);
    await expect(homePage.productPrices).toHaveCount(9);
  });

  test('search shows only matching products', { tag: '@smoke' }, async ({ homePage }) => {
    await homePage.search('pliers');

    await expect(homePage.searchResultCount).toHaveText("4 products found for 'pliers'");
    await expect(homePage.productCards).toHaveCount(4);
    for (const name of await homePage.getProductNames()) {
      expect(name, 'every result should mention the search term').toMatch(/pliers/i);
    }
  });

  test('search without a match says so', { tag: '@negative' }, async ({ homePage }) => {
    await homePage.search('no-such-tool-xyz');

    await expect(homePage.noResultsMessage).toHaveText('There are no products found.');
    await expect(homePage.productCards).toHaveCount(0);
  });

  test('category filter shows only that category', async ({ homePage }) => {
    await homePage.filterBy('Hammer');

    // The grid reloads after the click; wait until it holds hammers only (7 products).
    await expect(homePage.productCards).toHaveCount(7);
    for (const name of await homePage.getProductNames()) {
      expect(name).toMatch(/hammer/i);
    }
  });

  // One test per sort option, generated from this table.
  const sortCases: { option: SortOption; by: 'name' | 'price'; direction: SortDirection }[] = [
    { option: 'Name (A - Z)', by: 'name', direction: 'asc' },
    { option: 'Name (Z - A)', by: 'name', direction: 'desc' },
    { option: 'Price (Low - High)', by: 'price', direction: 'asc' },
    { option: 'Price (High - Low)', by: 'price', direction: 'desc' },
  ];

  for (const { option, by, direction } of sortCases) {
    test(`sort "${option}" orders the products by ${by}`, async ({ homePage }) => {
      await homePage.sortBy(option);

      // The grid re-renders after the API answers. expect.poll re-reads it until the order
      // is right (or the timeout ends), so there is no fixed wait and no race.
      await expect
        .poll(
          async () =>
            by === 'name'
              ? isSorted(await homePage.getProductNames(), direction)
              : isSorted(await homePage.getProductPricesInCents(), direction),
          { message: `products should be sorted by ${by} ${direction}` },
        )
        .toBe(true);
    });
  }
});
