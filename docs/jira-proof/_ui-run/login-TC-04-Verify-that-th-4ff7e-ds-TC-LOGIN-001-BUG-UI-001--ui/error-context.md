# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\login.spec.js >> TC-04: Verify that the login page is ready within 3 seconds (TC_LOGIN_001) (BUG-UI-001)
- Location: tests\ui\login.spec.js:52:1

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 3000
Received:   9118.70000000298
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - paragraph [ref=e11]: LMDmax
    - paragraph [ref=e12]: PERFORMANCE
  - generic [ref=e13]:
    - heading "Sign In" [level=1] [ref=e14]
    - generic [ref=e15]:
      - generic [ref=e16]:
        - textbox "E-mail ID" [active] [ref=e19]
        - generic [ref=e21]:
          - textbox "Password" [ref=e22]
          - button "toggle password visibility" [ref=e24] [cursor=pointer]
        - paragraph [ref=e27] [cursor=pointer]: Forgot Password?
        - button "Sign In" [ref=e28] [cursor=pointer]
      - paragraph [ref=e29]: OR
      - button [ref=e30] [cursor=pointer]
      - button [ref=e37] [cursor=pointer]
      - button "Sign in with OTP" [ref=e41] [cursor=pointer]
      - paragraph [ref=e42]:
        - text: Create a new account?
        - button "Sign up" [ref=e43] [cursor=pointer]
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const LoginPage = require('../../pages/LoginPage');
  3   | 
  4   | // Login screen
  5   | // TC-03 and later are from the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md)
  6   | 
  7   | test(
  8   |   'TC-01: Verify that login with valid credentials opens the dashboard',
  9   |   { tag: ['@smoke', '@regression', '@pr'] },
  10  |   async ({ page }) => {
  11  |     const loginPage = new LoginPage(page);
  12  |     await loginPage.open();
  13  |     await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
  14  | 
  15  |     // Logging in can be slow, so wait up to 30 seconds (30000 ms)
  16  |     await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  17  |   },
  18  | );
  19  | 
  20  | test(
  21  |   'TC-02: Verify that wrong password keeps the user on the login page',
  22  |   { tag: ['@regression', '@pr'] },
  23  |   async ({ page }) => {
  24  |     const loginPage = new LoginPage(page);
  25  |     await loginPage.open();
  26  |     await loginPage.login(process.env.LOGIN_EMAIL, 'WrongPassword@123');
  27  | 
  28  |     await expect(loginPage.signInButton).toBeVisible();
  29  |     await expect(page).not.toHaveURL(/dashboard/);
  30  |   },
  31  | );
  32  | 
  33  | // ---------- How the screen looks ----------
  34  | 
  35  | test(
  36  |   'TC-03: Verify that the login page opens over HTTPS without console errors (TC_LOGIN_001)',
  37  |   { tag: ['@regression', '@pr'] },
  38  |   async ({ page }) => {
  39  |     const consoleErrors = [];
  40  |     page.on('console', (message) => {
  41  |       if (message.type() === 'error') consoleErrors.push(message.text());
  42  |     });
  43  |     const loginPage = new LoginPage(page);
  44  |     await loginPage.open();
  45  |     await expect(loginPage.signInButton).toBeVisible();
  46  | 
  47  |     expect(page.url()).toMatch(/^https:\/\//);
  48  |     expect(consoleErrors).toEqual([]);
  49  |   },
  50  | );
  51  | 
  52  | test(
  53  |   'TC-04: Verify that the login page is ready within 3 seconds (TC_LOGIN_001) (BUG-UI-001)',
  54  |   { tag: ['@regression', '@knownbug'] },
  55  |   async ({ page }) => {
  56  |     const loginPage = new LoginPage(page);
  57  |     await loginPage.open();
  58  |     await expect(loginPage.signInButton).toBeVisible();
  59  | 
  60  |     // The time from opening the address until the page was ready (domContentLoaded), in milliseconds
  61  |     const readyAfter = await page.evaluate(
  62  |       () =>
  63  |         performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
  64  |     );
> 65  |     expect(readyAfter).toBeLessThan(3000);
      |                        ^ Error: expect(received).toBeLessThan(expected)
  66  |   },
  67  | );
  68  | 
  69  | test(
  70  |   'TC-05: Verify that the product name, tab title and favicon are shown (TC_LOGIN_002, TC_LOGIN_003)',
  71  |   { tag: ['@regression'] },
  72  |   async ({ page }) => {
  73  |     const loginPage = new LoginPage(page);
  74  |     await loginPage.open();
  75  | 
  76  |     await expect(page.getByText('LMDmax', { exact: true })).toBeVisible();
  77  |     await expect(page.getByText('PERFORMANCE', { exact: true })).toBeVisible();
  78  |     await expect(page).toHaveTitle('Performance App');
  79  |     await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
  80  |       'href',
  81  |       '/favicon.ico',
  82  |     );
  83  |   },
  84  | );
  85  | 
  86  | test(
  87  |   'TC-06: Verify that the "Sign In" heading is shown (TC_LOGIN_004)',
  88  |   { tag: ['@regression'] },
  89  |   async ({ page }) => {
  90  |     const loginPage = new LoginPage(page);
  91  |     await loginPage.open();
  92  | 
  93  |     await expect(loginPage.heading).toBeVisible();
  94  |   },
  95  | );
  96  | 
  97  | test(
  98  |   'TC-07: Verify that the email and password boxes are shown, editable and have placeholders (TC_LOGIN_005, TC_LOGIN_006)',
  99  |   { tag: ['@smoke', '@regression', '@pr'] },
  100 |   async ({ page }) => {
  101 |     const loginPage = new LoginPage(page);
  102 |     await loginPage.open();
  103 | 
  104 |     await expect(loginPage.emailInput).toBeEditable();
  105 |     await expect(loginPage.passwordInput).toBeEditable();
  106 |     await expect(loginPage.emailInput).toHaveAttribute(
  107 |       'placeholder',
  108 |       'E-mail ID',
  109 |     );
  110 |     await expect(loginPage.passwordInput).toHaveAttribute(
  111 |       'placeholder',
  112 |       'Password',
  113 |     );
  114 |   },
  115 | );
  116 | 
  117 | test(
  118 |   'TC-08: Verify that all sign-in buttons and links are shown (TC_LOGIN_007, TC_LOGIN_010)',
  119 |   { tag: ['@smoke', '@regression', '@pr'] },
  120 |   async ({ page }) => {
  121 |     const loginPage = new LoginPage(page);
  122 |     await loginPage.open();
  123 | 
  124 |     await expect(loginPage.signInButton).toBeEnabled();
  125 |     await expect(loginPage.googleButton).toBeEnabled();
  126 |     await expect(loginPage.appleButton).toBeEnabled();
  127 |     await expect(loginPage.otpButton).toBeEnabled();
  128 |     await expect(loginPage.forgotPasswordLink).toBeVisible();
  129 |     await expect(page.getByText('OR', { exact: true })).toBeVisible();
  130 |     await expect(page.getByText('Create a new account?')).toBeVisible();
  131 |     await expect(loginPage.signUpLink).toBeVisible();
  132 |   },
  133 | );
  134 | 
  135 | test(
  136 |   'TC-09: Verify that the login page has no Terms and Privacy Policy links, as designed (TC_LOGIN_012)',
  137 |   { tag: ['@regression'] },
  138 |   async ({ page }) => {
  139 |     // The sheet notes this as a consistency question: the Sign Up page has both links
  140 |     const loginPage = new LoginPage(page);
  141 |     await loginPage.open();
  142 |     await expect(loginPage.signInButton).toBeVisible();
  143 | 
  144 |     await expect(page.getByText(/Terms/)).toHaveCount(0);
  145 |     await expect(page.getByText('Privacy Policy')).toHaveCount(0);
  146 |   },
  147 | );
  148 | 
  149 | test(
  150 |   'TC-10: Verify that the Tab key goes Email → Password → eye icon → Forgot Password? → Sign In (TC_LOGIN_013) (BUG-UI-004)',
  151 |   { tag: ['@regression', '@knownbug'] },
  152 |   async ({ page }) => {
  153 |     const loginPage = new LoginPage(page);
  154 |     await loginPage.open();
  155 |     await loginPage.emailInput.focus();
  156 | 
  157 |     await page.keyboard.press('Tab');
  158 |     await expect(loginPage.passwordInput).toBeFocused();
  159 |     await page.keyboard.press('Tab');
  160 |     await expect(loginPage.eyeIcon).toBeFocused();
  161 |     await page.keyboard.press('Tab');
  162 |     await expect(loginPage.forgotPasswordLink).toBeFocused();
  163 |     await page.keyboard.press('Tab');
  164 |     await expect(loginPage.signInButton).toBeFocused();
  165 |   },
```