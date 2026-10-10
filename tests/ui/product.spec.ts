import { expect, test } from '../../src/fixtures/test';
import { toCents } from '../../src/utils/money';

test.describe('Product details', { tag: '@product' }, () => {
  test('card and detail page show the same name and price', { tag: '@smoke' }, async ({ homePage, productPage }) => {
    await homePage.open();
    // Remember what the first card promises before clicking it.
    const name = (await homePage.productNames.first().innerText()).trim();
    const cardPrice = toCents(await homePage.productPrices.first().innerText());

    await homePage.openProduct(name);

    await productPage.expectOpenFor(name);
    expect(await productPage.getUnitPriceInCents()).toBe(cardPrice);
    await expect(productPage.description).not.toBeEmpty();
  });

  test('adding a product with a quantity updates the cart badge', async ({ homePage, productPage }) => {
    await homePage.open();
    await homePage.openProduct('Claw Hammer');

    await productPage.setQuantity(3);
    await productPage.addToCart();

    // The badge counts pieces, not product lines.
    await productPage.header.expectCartQuantity(3);
  });

  test('the + button raises the quantity by one', async ({ homePage, productPage }) => {
    await homePage.open();
    await homePage.openProduct('Thor Hammer');

    await expect(productPage.quantityInput).toHaveValue('1');
    await productPage.increaseQuantityButton.click();
    await expect(productPage.quantityInput).toHaveValue('2');
  });
});
