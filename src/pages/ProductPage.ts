import { type Locator, type Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/** A product's detail page (/product/{id}): name, price, quantity and "Add to cart". */
export class ProductPage extends BasePage {
  readonly name: Locator;
  /** The price without "$", e.g. "14.15". */
  readonly unitPrice: Locator;
  readonly description: Locator;
  readonly quantityInput: Locator;
  readonly increaseQuantityButton: Locator;
  readonly addToCartButton: Locator;
  /** The pop-up message the shop shows after an action, e.g. "Product added to shopping cart." */
  readonly toast: Locator;

  /**
   * Builds the locators once; Playwright locators are lazy, so nothing is looked up until a step uses them.
   */
  constructor(page: Page) {
    super(page);
    this.name = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.description = page.getByTestId('product-description');
    this.quantityInput = page.getByTestId('quantity');
    this.increaseQuantityButton = page.getByTestId('increase-quantity');
    this.addToCartButton = page.getByTestId('add-to-cart');
    // The toast has no data-test attribute; role="alert" is what screen readers use too.
    this.toast = page.getByRole('alert');
  }

  /** Opens a product by id and waits until it can be added to the cart. */
  @step('Open product page {0}')
  async open(productId: string): Promise<void> {
    await this.page.goto(`/product/${productId}`);
    await expect(this.addToCartButton).toBeVisible();
  }

  /** Types the quantity into the quantity field. */
  @step('Set the quantity to {0}')
  async setQuantity(quantity: number): Promise<void> {
    await this.quantityInput.fill(String(quantity));
  }

  /** Adds the product and waits for the shop's confirmation toast. */
  @step('Add the product to the cart')
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
    // Wait for the shop to confirm, so the next step sees the updated cart.
    await expect(this.toast).toContainText('Product added to shopping cart');
  }

  /** The unit price in cents. */
  async getUnitPriceInCents(): Promise<number> {
    return toCents(await this.unitPrice.innerText());
  }

  /** Checks a product URL is open and the page shows this product's name. */
  @step('Check the product page shows "{0}"')
  async expectOpenFor(productName: string): Promise<void> {
    await expect(this.page).toHaveURL(/\/product\/\w+/);
    await expect(this.name).toHaveText(productName);
  }
}
