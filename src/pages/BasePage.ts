import type { Page } from '@playwright/test';
import { HeaderComponent } from '../components/HeaderComponent';

/**
 * What every page object shares: the Playwright page and the header component.
 *
 * Page objects hold locators and user actions; the assertions that describe
 * the page's state live here too (expect... methods), so tests read as steps.
 */
export abstract class BasePage {
  readonly header: HeaderComponent;

  /** Only subclasses create page objects; each one gets the shared header component. */
  protected constructor(protected readonly page: Page) {
    this.header = new HeaderComponent(page);
  }
}
