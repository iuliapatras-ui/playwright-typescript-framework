## Architecture

- **Projects** (`playwright.config.ts`): `api` uses `tests/api` (`*.api.spec.ts`); `chromium`/`firefox`/`webkit` use
  `tests/ui`. No setup project. `testIdAttribute` is `data-test`, so `getByTestId()` targets the shop's `data-test` attributes.
- In specs (`tests/**`), import `test`/`expect` from `src/fixtures/test.ts`, not from `@playwright/test`. Support code in `src/` imports `@playwright/test` directly. The fixture file provides:
  - page-object fixtures (`homePage`, `productPage`, `loginPage`, `accountPage`, `checkoutPage`) and API service
    fixtures (`authApi`, `productsApi`, `cartsApi`) built on `apiRequest`, a request context bound to `env.apiUrl` with
    `Accept: application/json` (without it the API answers 422s with a 302 redirect). The built-in `request` fixture points
    at the web shop in UI projects, so don't use it for API calls.
  - `testUser`: a worker-scoped customer registered fresh via the API. Tests must not rely on the demo's published accounts.
  - `test.use({ loggedIn: true })`: logs in via API and injects the JWT into `localStorage['auth-token']` with
    `addInitScript`. Tokens expire after 5 minutes, which is why `storageState` is not used.
  - `useCartInBrowser(page, cartId, qty)`: hands an API-created cart to the front end via `sessionStorage` (`cart_id`, `cart_quantity`); call before the first `goto`.
- **Page objects** (`src/pages`) extend `BasePage`, which supplies the shared `header` (`HeaderComponent`). They own all
  locators, expose user actions and `expect...()` assertion methods; specs contain no selectors. Methods are decorated with
  `@step('... "{0}"')` (`src/utils/step.ts`, `{n}` = argument index, boxed `test.step`). Step titles appear in reports, so don't use a password argument as a `{n}` placeholder; use only non-secret arguments such as the email.
- **API service objects** (`src/api`) return raw `APIResponse` for negative tests and typed helpers that assert
  `toBeOK()` and parse with zod. `src/api/schemas.ts` is the single source for both runtime contracts and TS types
  (`z.infer`); add fields there rather than writing separate interfaces.
- `src/data`: builders for users (`buildNewUser`) and mocked products (`buildProduct`, `buildProductPage`; used by `page.route()` mocks in `network.spec.ts` and checked against the real schemas), plus a fixed billing address (`viennaAddress`).
- `src/utils`: `money.ts` parses prices to integer cents (compare money in cents, not floats); `sorting.ts`; `botCheck.ts`
  `skipIfBotCheck()` skips (not fails) when Cloudflare's "Performing security verification" page appears, which happens on CI after form logins.
