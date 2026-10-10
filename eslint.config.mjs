// ESLint flat config: TypeScript rules for all code, Playwright rules for the tests.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'blob-report/'] },

  js.configs.recommended,
  // Type-aware rules (they read tsconfig.json), e.g. no-floating-promises: a missing
  // `await` in a Playwright test is the classic cause of flaky, half-run tests.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // A leading underscore marks a parameter that a signature requires but the code doesn't use.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Assertions also live in page objects (expect... methods) and helpers.
      'playwright/expect-expect': [
        'error',
        { assertFunctionPatterns: ['^expect.*', '.*\\.expect[A-Z].*', '.*\\.(addToCart|payWith|getCartLines)$'] },
      ],
      // Fixed waits are the main source of slow and flaky UI tests.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-focused-test': 'error',
      // A loop of expects is a deliberate check of every item in a list here.
      'playwright/no-conditional-in-test': 'off',
    },
  },

  // Plain JavaScript config files are not part of the TypeScript project.
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },

  // Last: turn off every rule that would fight with Prettier's formatting.
  prettier,
);
