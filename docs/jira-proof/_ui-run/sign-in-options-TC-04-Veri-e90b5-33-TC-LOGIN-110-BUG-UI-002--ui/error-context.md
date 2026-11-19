# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\sign-in-options.spec.js >> TC-04: Verify that an unregistered email gets no OTP and a clear message (TC_LOGIN_133, TC_LOGIN_110) (BUG-UI-002)
- Location: tests\ui\sign-in-options.spec.js:57:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/not found|not registered/i)
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/not found|not registered/i) with timeout 15000ms
  - waiting for getByText(/not found|not registered/i)

```

```yaml
- img
- paragraph: LMDmax
- paragraph: PERFORMANCE
- heading "Sign In" [level=1]
- paragraph: Request an OTP on your registered Email ID or Mobile no
- textbox "Email or mobile no.": unreg_perf01@yopmail.com
- paragraph: Something went wrong
- button "Send OTP"
- paragraph: OR
- button "Sign in with Email ID"
- paragraph:
  - text: Create a new account?
  - button "Sign up"
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const LoginPage = require('../../pages/LoginPage');
  3   | 
  4   | // The other ways to sign in, on the login screen: OTP, Forgot Password, Sign Up, Google and Apple
  5   | // From the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md).
  6   | // Only addresses that reach nobody are used: an OTP to the test user would send a real email.
  7   | 
  8   | // ---------- Sign In With OTP ----------
  9   | 
  10  | test(
  11  |   'TC-01: Verify that "Sign In With OTP" opens the OTP screen (TC_LOGIN_100)',
  12  |   { tag: ['@smoke', '@regression', '@pr'] },
  13  |   async ({ page }) => {
  14  |     const loginPage = new LoginPage(page);
  15  |     await loginPage.open();
  16  |     await loginPage.otpButton.click();
  17  | 
  18  |     await expect(
  19  |       page.getByText('Request an OTP on your registered Email ID or Mobile no'),
  20  |     ).toBeVisible();
  21  |     await expect(loginPage.emailOrMobileInput).toBeEditable();
  22  |     await expect(loginPage.sendOtpButton).toBeEnabled();
  23  |   },
  24  | );
  25  | 
  26  | test(
  27  |   'TC-02: Verify that Send OTP with an empty box shows "Field cannot be empty"',
  28  |   { tag: ['@regression'] },
  29  |   async ({ page }) => {
  30  |     const loginPage = new LoginPage(page);
  31  |     await loginPage.open();
  32  |     await loginPage.requestOtp('');
  33  | 
  34  |     await expect(page.getByText('Field cannot be empty')).toBeVisible();
  35  |   },
  36  | );
  37  | 
  38  | test(
  39  |   'TC-03: Verify that an invalid email or mobile number shows a message (TC_LOGIN_109)',
  40  |   { tag: ['@regression'] },
  41  |   async ({ page }) => {
  42  |     const loginPage = new LoginPage(page);
  43  |     await loginPage.open();
  44  |     await loginPage.otpButton.click();
  45  | 
  46  |     for (const value of ['abc@', '12@']) {
  47  |       await loginPage.emailOrMobileInput.fill(value);
  48  |       await loginPage.sendOtpButton.click();
  49  |       await expect(
  50  |         page.getByText('Please enter a valid email address or mobile no.'),
  51  |         value,
  52  |       ).toBeVisible();
  53  |     }
  54  |   },
  55  | );
  56  | 
  57  | test(
  58  |   'TC-04: Verify that an unregistered email gets no OTP and a clear message (TC_LOGIN_133, TC_LOGIN_110) (BUG-UI-002)',
  59  |   { tag: ['@regression', '@knownbug'] },
  60  |   async ({ page }) => {
  61  |     const loginPage = new LoginPage(page);
  62  |     await loginPage.open();
  63  |     await loginPage.requestOtp('unreg_perf01@yopmail.com');
  64  | 
  65  |     // No OTP was sent, so the OTP boxes and Verify do not appear
  66  |     await expect(page.getByText(/One time password has been sent/)).toHaveCount(
  67  |       0,
  68  |     );
  69  |     await expect(page.getByRole('button', { name: 'Verify' })).toHaveCount(0);
  70  |     // Today: "Something went wrong"
> 71  |     await expect(page.getByText(/not found|not registered/i)).toBeVisible();
      |                                                               ^ Error: expect(locator).toBeVisible() failed
  72  |   },
  73  | );
  74  | 
  75  | test(
  76  |   'TC-05: Verify that an unregistered mobile number gets no OTP and a clear message (TC_LOGIN_134) (BUG-UI-002)',
  77  |   { tag: ['@regression', '@knownbug'] },
  78  |   async ({ page }) => {
  79  |     const loginPage = new LoginPage(page);
  80  |     await loginPage.open();
  81  |     await loginPage.requestOtp('5550001234');
  82  | 
  83  |     await expect(page.getByRole('button', { name: 'Verify' })).toHaveCount(0);
  84  |     await expect(page.getByText(/not found|not registered/i)).toBeVisible();
  85  |   },
  86  | );
  87  | 
  88  | test(
  89  |   'TC-06: Verify that "Sign In With Email ID" goes back to the email and password login (TC_LOGIN_112)',
  90  |   { tag: ['@regression'] },
  91  |   async ({ page }) => {
  92  |     const loginPage = new LoginPage(page);
  93  |     await loginPage.open();
  94  |     await loginPage.otpButton.click();
  95  | 
  96  |     await loginPage.signInWithEmailButton.click();
  97  | 
  98  |     await expect(loginPage.emailInput).toBeVisible();
  99  |     await expect(loginPage.passwordInput).toBeVisible();
  100 |   },
  101 | );
  102 | 
  103 | // ---------- Forgot Password ----------
  104 | 
  105 | test(
  106 |   'TC-07: Verify that "Forgot Password?" opens the Forgot Password screen (TC_LOGIN_075)',
  107 |   { tag: ['@smoke', '@regression', '@pr'] },
  108 |   async ({ page }) => {
  109 |     const loginPage = new LoginPage(page);
  110 |     await loginPage.open();
  111 |     await loginPage.forgotPasswordLink.click();
  112 | 
  113 |     await expect(page).toHaveURL(/resetPassword/);
  114 |     await expect(
  115 |       page.getByText('Forgot Password', { exact: true }),
  116 |     ).toBeVisible();
  117 |     await expect(loginPage.emailOrMobileInput).toBeEditable();
  118 |     await expect(loginPage.sendOtpButton).toBeEnabled();
  119 |   },
  120 | );
  121 | 
  122 | test(
  123 |   'TC-08: Verify that an empty or invalid email on Forgot Password shows a message (TC_LOGIN_078)',
  124 |   { tag: ['@regression'] },
  125 |   async ({ page }) => {
  126 |     const loginPage = new LoginPage(page);
  127 |     await loginPage.open();
  128 |     await loginPage.forgotPasswordLink.click();
  129 | 
  130 |     await loginPage.sendOtpButton.click();
  131 |     await expect(page.getByText('Field cannot be empty')).toBeVisible();
  132 | 
  133 |     await loginPage.emailOrMobileInput.fill('abc@');
  134 |     await loginPage.sendOtpButton.click();
  135 |     await expect(
  136 |       page.getByText('Please enter a valid email address or mobile no.'),
  137 |     ).toBeVisible();
  138 |   },
  139 | );
  140 | 
  141 | test(
  142 |   'TC-09: Verify that an unregistered email on Forgot Password shows "User Not Found" (TC_LOGIN_077)',
  143 |   { tag: ['@regression', '@pr'] },
  144 |   async ({ page }) => {
  145 |     const loginPage = new LoginPage(page);
  146 |     await loginPage.open();
  147 |     await loginPage.forgotPasswordLink.click();
  148 | 
  149 |     await loginPage.emailOrMobileInput.fill('xyz_unreg_perf@yopmail.com');
  150 |     await loginPage.sendOtpButton.click();
  151 | 
  152 |     await expect(page.getByText('User Not Found')).toBeVisible();
  153 |     await expect(page.getByText(/One time password has been sent/)).toHaveCount(
  154 |       0,
  155 |     );
  156 |   },
  157 | );
  158 | 
  159 | test(
  160 |   'TC-10: Verify that "Back To Sign In" goes back to the login screen (TC_LOGIN_084)',
  161 |   { tag: ['@regression'] },
  162 |   async ({ page }) => {
  163 |     const loginPage = new LoginPage(page);
  164 |     await loginPage.open();
  165 |     await loginPage.forgotPasswordLink.click();
  166 | 
  167 |     await loginPage.backToSignInButton.click();
  168 | 
  169 |     await expect(page).toHaveURL(/signIn/);
  170 |     await expect(loginPage.signInButton).toBeVisible();
  171 |   },
```