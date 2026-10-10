import { users } from '../../src/config/env';
import { viennaAddress } from '../../src/data/checkout';
import { expect, test, useCartInBrowser } from '../../src/fixtures/test';

test.describe('Checkout as a logged-in customer', { tag: '@checkout' }, () => {
  // Logged in through the API before the page loads (see the page fixture).
  test.use({ loggedInAs: 'customer' });

  test(
    'customer can order two products',
    { tag: ['@smoke', '@e2e'] },
    async ({ homePage, productPage, checkoutPage }) => {
      // Products: two different products into the cart.
      await homePage.open();
      await homePage.header.expectLoggedInAs(users.customer.fullName);
      await homePage.openProduct('Claw Hammer');
      await productPage.addToCart();
      await homePage.open();
      await homePage.openProduct('Combination Pliers');
      await productPage.setQuantity(2);
      await productPage.addToCart();
      await productPage.header.expectCartQuantity(3);

      // Step 1, cart: both products with the chosen quantities.
      await productPage.header.openCart();
      const lines = await checkoutPage.getCartLines();
      expect(lines.map(({ title, quantity }) => ({ title, quantity }))).toEqual([
        { title: 'Claw Hammer', quantity: 1 },
        { title: 'Combination Pliers', quantity: 2 },
      ]);

      // Steps 2-4: sign-in (already done), address, payment.
      await checkoutPage.proceedFromCart();
      await checkoutPage.proceedAsLoggedInCustomer();
      await checkoutPage.enterBillingAddress(viennaAddress);
      await checkoutPage.payWith('Cash on Delivery');

      await checkoutPage.expectOrderConfirmed();
    },
  );

  test('cart line prices and total add up', async ({ homePage, productPage, checkoutPage }) => {
    await homePage.open();
    await homePage.openProduct('Slip Joint Pliers');
    await productPage.setQuantity(3);
    await productPage.addToCart();
    await homePage.open();
    await homePage.openProduct('Bolt Cutters');
    await productPage.addToCart();

    await productPage.header.openCart();
    const lines = await checkoutPage.getCartLines();

    // Each line is unit price x quantity, the total is the sum of the lines (exact, in cents).
    for (const line of lines) {
      expect(line.linePriceCents, `line price of ${line.title}`).toBe(line.unitPriceCents * line.quantity);
    }
    const sumOfLines = lines.reduce((sum, line) => sum + line.linePriceCents, 0);
    expect(await checkoutPage.getCartTotalCents()).toBe(sumOfLines);
  });
});

test.describe('Checkout as a guest', { tag: '@checkout' }, () => {
  test('guest is asked to sign in at checkout', async ({ homePage, productPage, checkoutPage }) => {
    await homePage.open();
    await homePage.openProduct('Claw Hammer');
    await productPage.addToCart();

    await productPage.header.openCart();
    await checkoutPage.proceedFromCart();

    // Step 2 shows the login form instead of "already logged in".
    await expect(checkoutPage.signInEmailInput).toBeVisible();
    await expect(checkoutPage.alreadyLoggedInMessage).toBeHidden();
  });

  test(
    'a cart filled through the API shows up in the browser',
    { tag: '@hybrid' },
    async ({ page, cartsApi, productsApi, checkoutPage }) => {
      // Arrange through the API: fast and independent of the product pages.
      const hammer = await productsApi.findByName('Claw Hammer');
      const cartId = await cartsApi.create();
      await expect(await cartsApi.addItem(cartId, hammer.id, 4)).toBeOK();
      await useCartInBrowser(page, cartId, 4);

      // Check in the UI: the cart page shows exactly what the API stored, at the API's price.
      await checkoutPage.open();
      const lines = await checkoutPage.getCartLines();
      expect(lines).toEqual([
        {
          title: 'Claw Hammer',
          quantity: 4,
          unitPriceCents: Math.round(hammer.price * 100),
          linePriceCents: Math.round(hammer.price * 100) * 4,
        },
      ]);
    },
  );
});
