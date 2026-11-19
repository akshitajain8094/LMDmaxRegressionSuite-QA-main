const js = require('@eslint/js');
const globals = require('globals');
const playwright = require('eslint-plugin-playwright');
const prettier = require('eslint-config-prettier');

module.exports = [
  // Folders that are not checked
  {
    ignores: [
      'playwright-report/',
      'test-results/',
      'allure-results/',
      'allure-report/',
    ],
  },

  // Standard JavaScript checks
  js.configs.recommended,
  { languageOptions: { sourceType: 'commonjs', globals: globals.node } },

  // Playwright checks (missing await, test.only, ...)
  {
    ...playwright.configs['flat/recommended'],
    files: ['tests/**/*.js', 'pages/**/*.js', 'api/**/*.js'],
  },

  // UI tests: the code inside page.evaluate(() => ...) runs in the browser (document, window)
  {
    files: ['tests/ui/**/*.js', 'pages/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // Helpers in api/ may use "if" (the rule is meant for test files)
  {
    files: ['api/**/*.js'],
    rules: { 'playwright/no-conditional-in-test': 'off' },
  },

  // Leaves code layout to Prettier (must be last)
  prettier,
];
