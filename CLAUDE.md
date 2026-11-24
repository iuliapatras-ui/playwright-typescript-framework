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

@.claude/conventions/architecture.md

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
