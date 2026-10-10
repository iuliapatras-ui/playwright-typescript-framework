import { test } from '@playwright/test';

/**
 * Method decorator: runs a page-object method as one named step in the HTML report and trace.
 *
 *   @step('Add the product to the cart')
 *   async addToCart() { ... }
 *
 * The report then shows "Add the product to the cart" with the clicks and checks folded
 * inside it, instead of a flat list of locator calls. `{0}`, `{1}` ... in the title are
 * replaced by the method's arguments, e.g. @step('Open product "{0}"').
 * Never put a password placeholder in a title: titles end up in reports.
 *
 * `box: true` makes a failure point at the line in the test that called the method,
 * not at a line inside the page object.
 */
export function step(title: string) {
  return function <This, Args extends unknown[], Return>(
    method: (this: This, ...args: Args) => Promise<Return>,
    _context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Promise<Return>>,
  ) {
    return function (this: This, ...args: Args): Promise<Return> {
      const name = title.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)]));
      return test.step(name, () => method.apply(this, args), { box: true });
    };
  };
}
