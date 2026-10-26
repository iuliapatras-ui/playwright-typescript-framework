# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Playwright Test + TypeScript suite (UI and API) against the public **Practice Software Testing Toolshop** demo
(`https://practicesoftwaretesting.com`, API at `https://api.practicesoftwaretesting.com`). There is no app code here,
only tests and their support code. The README's "Design decisions" and "Lessons" sections explain the why behind most patterns.

## Commands

```bash
npm ci && npx playwright install --with-deps
npm run check                 # typecheck + eslint + prettier --check (CI runs this first; must pass)
npm run format                # prettier --write
npm test                      # all projects: api, chromium, firefox, webkit
npm run test:api              # API only (no browser)
npm run test:chromium         # UI in one browser (also :firefox, :webkit)
npm run test:smoke            # --grep @smoke
npx playwright test tests/ui/login.spec.ts --project=chromium      # one file
npx playwright test -g "customer can order two products" --project=chromium   # one test by title
npm run report                # open last HTML report
npm run test:headed           # chromium, headed; npm run test:ui-mode for Playwright UI mode
```

Node >= 20.12 is required (`process.loadEnvFile`).

UI specs run once per browser project, so pass `--project` when running a single UI test. API vs UI is selected with
`--project`, not tags. Tags: `@smoke`, `@negative`, `@e2e`, `@hybrid`, `@network`, plus one per area (`@login`,
`@catalog`, `@product`, `@checkout`, `@auth`, `@products`, `@carts`).

Config overrides: `BASE_URL`, `API_URL` via env vars or a local `.env` (copy `.env.example`; loaded with `process.loadEnvFile`, no dotenv), see `src/config/env.ts`.

## Architecture

- **Projects** (`playwright.config.ts`): `api` uses `tests/api` (`*.api.spec.ts`); `chromium`/`firefox`/`webkit` use
  `tests/ui`. No setup project. `testIdAttribute` is `data-test`, so `getByTestId()` targets the shop's `data-test` attributes.
- **Always import `test`/`expect` from `src/fixtures/test.ts`**, never from `@playwright/test`. It provides:
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
  `@step('... "{0}"')` (`src/utils/step.ts`, `{n}` = argument index, boxed `test.step`). Never put passwords in step titles.
- **API service objects** (`src/api`) return raw `APIResponse` for negative tests and typed helpers that assert
  `toBeOK()` and parse with zod. `src/api/schemas.ts` is the single source for both runtime contracts and TS types
  (`z.infer`); add fields there rather than writing separate interfaces.
- `src/data`: builders for users, mocked products (used by `page.route()` mocks in `network.spec.ts`, which pass through the real schemas), and billing address.
- `src/utils`: `money.ts` parses prices to integer cents (compare money in cents, not floats); `sorting.ts`; `botCheck.ts`
  `skipIfBotCheck()` skips (not fails) when Cloudflare's "Performing security verification" page appears, which happens on CI after form logins.

## Conventions that matter

- Shared live demo: data changes under the tests. Look things up at run time (e.g. `productsApi.findInStockOnFirstPage()`,
  counts from the API) and create own carts/users instead of hard-coding products, counts or accounts.
- No `waitForTimeout` (ESLint error); use web-first assertions or `expect.poll()` for re-rendering lists.
- `await` every Playwright assertion, including `expect(response).toBeOK()` (`no-floating-promises` is on, type-aware lint).
- Use `import type` for type-only imports (`consistent-type-imports`). Unused params are prefixed with `_`.
- `playwright/expect-expect` treats `expect*`, `.expectX()`, `addToCart`, `payWith`, `getCartLines` as assertions; update
  `eslint.config.mjs` if a new page-object method is the only assertion in a test.
- TypeScript is pinned to 6.0 because typescript-eslint doesn't support the TS 7 native compiler. `tsc` is only for type
  checking; Playwright compiles the tests itself.
- Workers: 4 locally, 2 on CI (the demo rate-limits). CI (`.github/workflows/ci.yml`, also nightly to catch demo drift):
  `npm run check` job first, then one job per project with 2 retries, `forbidOnly`, blob + JUnit reporters, then a merged
  HTML report. Video is `on-first-retry` on purpose (`retain-on-failure` added ~25 s per test).
- `main` is protected: changes go through PRs and CI must pass.

  ## Rules
  - Ask before editing any file in tests/.
  - Run `npm run test:api` after any change to API code.
  - Never commit .env files or credentials.
