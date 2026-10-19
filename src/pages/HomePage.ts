import { type Locator, type Page, expect } from '@playwright/test';
import { toCents } from '../utils/money';
import { BasePage } from './BasePage';
import { step } from '../utils/step';

/** The sort options exactly as the drop-down shows them. */
export type SortOption = 'Name (A - Z)' | 'Name (Z - A)' | 'Price (High - Low)' | 'Price (Low - High)';

/** The product catalogue on the home page: search, sort, filters and the product grid. */
export class HomePage extends BasePage {
  static readonly path = '/';

  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly searchResetButton: Locator;
  /** e.g. "4 products found for 'pliers'" */
  readonly searchResultCount: Locator;
  readonly noResultsMessage: Locator;
  readonly sortDropdown: Locator;
  /** One link per product card in the grid. */
  readonly productCards: Locator;
  readonly productNames: Locator;
  readonly productPrices: Locator;

  /**
   * Builds the locators once; Playwright locators are lazy, so nothing is looked up until a step uses them.
   */
  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('search-query');
    this.searchButton = page.getByTestId('search-submit');
    this.searchResetButton = page.getByTestId('search-reset');
    this.searchResultCount = page.getByTestId('search-result-count');
    this.noResultsMessage = page.getByTestId('no-results');
    this.sortDropdown = page.getByTestId('sort');
    // Card ids are product ids ("product-01M4J9..."), so match on the prefix.
    this.productCards = page.locator('a[data-test^="product-"]');
    this.productNames = page.getByTestId('product-name');
    this.productPrices = page.getByTestId('product-price');
  }

  /** Opens the catalogue and waits until the first page of products is shown. */
  @step('Open the product catalogue')
  async open(): Promise<void> {
    await this.page.goto(HomePage.path);
    await expect(this.productCards.first()).toBeVisible();
  }

  /** Types a search term and submits it. */
  @step('Search for "{0}"')
  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchButton.click();
  }

  /** Chooses a sort order by its visible label. */
  @step('Sort by "{0}"')
  async sortBy(option: SortOption): Promise<void> {
    await this.sortDropdown.selectOption({ label: option });
  }

  /** Ticks a category or brand filter by its visible label, e.g. "Hammer". */
  @step('Filter by "{0}"')
  async filterBy(label: string): Promise<void> {
    await this.page.getByLabel(label, { exact: true }).check();
  }

  /** Clicks the card whose name is exactly `name` ("Claw Hammer" must not match "Claw Hammer with ..."). */
  @step('Open product "{0}"')
  async openProduct(name: string): Promise<void> {
    // Escape regex characters in the name, then anchor it so only the whole name matches.
    const exactName = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
    await this.productNames.filter({ hasText: exactName }).click();
  }

  /** The product names of the cards in grid order, trimmed. */
  async getProductNames(): Promise<string[]> {
    return (await this.productNames.allInnerTexts()).map((name) => name.trim());
  }

  /** Prices of the cards in grid order, in cents. */
  async getProductPricesInCents(): Promise<number[]> {
    return (await this.productPrices.allInnerTexts()).map(toCents);
  }
}
