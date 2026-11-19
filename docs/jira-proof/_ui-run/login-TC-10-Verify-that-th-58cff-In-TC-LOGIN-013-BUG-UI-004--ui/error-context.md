# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\login.spec.js >> TC-10: Verify that the Tab key goes Email → Password → eye icon → Forgot Password? → Sign In (TC_LOGIN_013) (BUG-UI-004)
- Location: tests\ui\login.spec.js:149:1

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByText('Forgot Password?')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" getByText('Forgot Password?') with timeout 15000ms
  - waiting for getByText('Forgot Password?')
    33 × locator resolved to <p class="MuiTypography-root MuiTypography-body1 css-12cf1mx">Forgot Password?</p>
       - unexpected value "inactive"

```

```yaml
- paragraph: Forgot Password?
```

# Test source

```ts
  62  |       () =>
  63  |         performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
  64  |     );
  65  |     expect(readyAfter).toBeLessThan(3000);
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
> 162 |     await expect(loginPage.forgotPasswordLink).toBeFocused();
      |                                                ^ Error: expect(locator).toBeFocused() failed
  163 |     await page.keyboard.press('Tab');
  164 |     await expect(loginPage.signInButton).toBeFocused();
  165 |   },
  166 | );
  167 | 
  168 | test(
  169 |   'TC-11: Verify that the screen fits at desktop, tablet and phone widths (TC_LOGIN_015)',
  170 |   { tag: ['@regression'] },
  171 |   async ({ page }) => {
  172 |     const loginPage = new LoginPage(page);
  173 |     await loginPage.open();
  174 | 
  175 |     for (const [width, height] of [
  176 |       [1920, 1080],
  177 |       [1366, 768],
  178 |       [1280, 720],
  179 |       [768, 1024],
  180 |       [375, 812],
  181 |     ]) {
  182 |       await page.setViewportSize({ width, height });
  183 |       await expect(loginPage.signInButton, 'width ' + width).toBeInViewport();
  184 |       const scrollsSideways = await page.evaluate(
  185 |         () =>
  186 |           document.documentElement.scrollWidth >
  187 |           document.documentElement.clientWidth,
  188 |       );
  189 |       expect(scrollsSideways, 'side scroll at width ' + width).toBe(false);
  190 |     }
  191 |   },
  192 | );
  193 | 
  194 | test(
  195 |   'TC-12: Verify that buttons and links show the hand cursor (TC_LOGIN_018)',
  196 |   { tag: ['@regression'] },
  197 |   async ({ page }) => {
  198 |     const loginPage = new LoginPage(page);
  199 |     await loginPage.open();
  200 | 
  201 |     for (const element of [
  202 |       loginPage.signInButton,
  203 |       loginPage.forgotPasswordLink,
  204 |       loginPage.googleButton,
  205 |       loginPage.otpButton,
  206 |       loginPage.signUpLink,
  207 |     ]) {
  208 |       await expect(element).toHaveCSS('cursor', 'pointer');
  209 |     }
  210 |   },
  211 | );
  212 | 
  213 | // ---------- Email and password boxes ----------
  214 | 
  215 | test(
  216 |   'TC-13: Verify that an empty email shows "Field cannot be empty" (TC_LOGIN_020)',
  217 |   { tag: ['@regression', '@pr'] },
  218 |   async ({ page }) => {
  219 |     const loginPage = new LoginPage(page);
  220 |     await loginPage.open();
  221 |     await loginPage.login('', 'Test@123');
  222 | 
  223 |     await expect(page.getByText('Field cannot be empty')).toBeVisible();
  224 |     await expect(page).not.toHaveURL(/dashboard/);
  225 |   },
  226 | );
  227 | 
  228 | test(
  229 |   'TC-14: Verify that every invalid email format of the sheet shows "Please enter a valid email address" (TC_LOGIN_021)',
  230 |   { tag: ['@regression'] },
  231 |   async ({ page }) => {
  232 |     const loginPage = new LoginPage(page);
  233 |     await loginPage.open();
  234 | 
  235 |     for (const email of [
  236 |       'abc',
  237 |       'abc@',
  238 |       '@yopmail.com',
  239 |       'abc@yopmail',
  240 |       'abc@@yopmail.com',
  241 |       'abc yopmail.com',
  242 |       'abc@.com',
  243 |     ]) {
  244 |       await loginPage.login(email, 'Test@123');
  245 |       await expect(
  246 |         page.getByText('Please enter a valid email address'),
  247 |         email,
  248 |       ).toBeVisible();
  249 |     }
  250 |   },
  251 | );
  252 | 
  253 | test(
  254 |   'TC-15: Verify that an unregistered email shows "Invalid Credentials" (TC_LOGIN_024)',
  255 |   { tag: ['@regression', '@pr'] },
  256 |   async ({ page }) => {
  257 |     const loginPage = new LoginPage(page);
  258 |     await loginPage.open();
  259 |     await loginPage.login('notexist123@yopmail.com', 'Wrong@123');
  260 | 
  261 |     // The same message as a wrong password: it does not tell whether the account exists
  262 |     await expect(page.getByText('Invalid Credentials')).toBeVisible();
```