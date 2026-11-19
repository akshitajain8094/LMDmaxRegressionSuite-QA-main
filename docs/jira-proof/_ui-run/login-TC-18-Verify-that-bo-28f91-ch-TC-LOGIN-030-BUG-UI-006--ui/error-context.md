# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\login.spec.js >> TC-18: Verify that both empty boxes show a message each (TC_LOGIN_030) (BUG-UI-006)
- Location: tests\ui\login.spec.js:295:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByText('Field cannot be empty')
Expected: 2
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" getByText('Field cannot be empty') with timeout 15000ms
  - waiting for getByText('Field cannot be empty')
    33 × locator resolved to 1 element
       - unexpected value "1"

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
        - textbox "E-mail ID" [ref=e19]
        - paragraph [ref=e23]: Field cannot be empty
        - generic [ref=e25]:
          - textbox "Password" [ref=e26]
          - button "toggle password visibility" [ref=e28] [cursor=pointer]
        - paragraph [ref=e31] [cursor=pointer]: Forgot Password?
        - button "Sign In" [active] [ref=e32] [cursor=pointer]
      - paragraph [ref=e33]: OR
      - button [ref=e34] [cursor=pointer]
      - button [ref=e41] [cursor=pointer]
      - button "Sign in with OTP" [ref=e45] [cursor=pointer]
      - paragraph [ref=e46]:
        - text: Create a new account?
        - button "Sign up" [ref=e47] [cursor=pointer]
```

# Test source

```ts
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
  263 |     await expect(loginPage.signInButton).toBeVisible();
  264 |   },
  265 | );
  266 | 
  267 | test(
  268 |   'TC-16: Verify that an email of more than 255 characters shows a message, not a broken page (TC_LOGIN_025)',
  269 |   { tag: ['@regression'] },
  270 |   async ({ page }) => {
  271 |     const loginPage = new LoginPage(page);
  272 |     await loginPage.open();
  273 |     await loginPage.login('a'.repeat(260) + '@yopmail.com', 'Test@123');
  274 | 
  275 |     await expect(
  276 |       page.getByText('Please enter a valid email address'),
  277 |     ).toBeVisible();
  278 |     await expect(loginPage.signInButton).toBeVisible();
  279 |   },
  280 | );
  281 | 
  282 | test(
  283 |   'TC-17: Verify that an empty password shows "Field cannot be empty" (TC_LOGIN_029)',
  284 |   { tag: ['@regression', '@pr'] },
  285 |   async ({ page }) => {
  286 |     const loginPage = new LoginPage(page);
  287 |     await loginPage.open();
  288 |     await loginPage.login('ds1@yopmail.com', '');
  289 | 
  290 |     await expect(page.getByText('Field cannot be empty')).toBeVisible();
  291 |     await expect(page).not.toHaveURL(/dashboard/);
  292 |   },
  293 | );
  294 | 
  295 | test(
  296 |   'TC-18: Verify that both empty boxes show a message each (TC_LOGIN_030) (BUG-UI-006)',
  297 |   { tag: ['@regression', '@knownbug'] },
  298 |   async ({ page }) => {
  299 |     const loginPage = new LoginPage(page);
  300 |     await loginPage.open();
  301 |     await loginPage.signInButton.click();
  302 | 
> 303 |     await expect(page.getByText('Field cannot be empty')).toHaveCount(2);
      |                                                           ^ Error: expect(locator).toHaveCount(expected) failed
  304 |   },
  305 | );
  306 | 
  307 | test(
  308 |   'TC-19: Verify that the password is hidden (dots) by default (TC_LOGIN_033)',
  309 |   { tag: ['@regression', '@pr'] },
  310 |   async ({ page }) => {
  311 |     const loginPage = new LoginPage(page);
  312 |     await loginPage.open();
  313 |     await loginPage.passwordInput.fill('Test@123');
  314 | 
  315 |     await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  316 |   },
  317 | );
  318 | 
  319 | test(
  320 |   'TC-20: Verify that the eye icon shows the password, and a second click hides it again (TC_LOGIN_034, TC_LOGIN_035)',
  321 |   { tag: ['@regression'] },
  322 |   async ({ page }) => {
  323 |     const loginPage = new LoginPage(page);
  324 |     await loginPage.open();
  325 |     await loginPage.passwordInput.fill('Test@123');
  326 | 
  327 |     await loginPage.eyeIcon.click();
  328 |     await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
  329 |     await expect(loginPage.passwordInput).toHaveValue('Test@123');
  330 | 
  331 |     await loginPage.eyeIcon.click();
  332 |     await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  333 |   },
  334 | );
  335 | 
  336 | test(
  337 |   'TC-21: Verify that a hidden password cannot be copied (TC_LOGIN_037)',
  338 |   { tag: ['@regression'] },
  339 |   async ({ page, context }) => {
  340 |     await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  341 |     const loginPage = new LoginPage(page);
  342 |     await loginPage.open();
  343 |     await loginPage.passwordInput.fill('Secret@123');
  344 |     await page.evaluate(() => navigator.clipboard.writeText('nothing copied'));
  345 | 
  346 |     await loginPage.passwordInput.focus();
  347 |     await page.keyboard.press('Control+A');
  348 |     await page.keyboard.press('Control+C');
  349 | 
  350 |     const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  351 |     expect(clipboard).toBe('nothing copied');
  352 |   },
  353 | );
  354 | 
  355 | test(
  356 |   'TC-22: Verify that a password of more than 200 characters shows "Invalid Credentials", not a broken page (TC_LOGIN_039)',
  357 |   { tag: ['@regression'] },
  358 |   async ({ page }) => {
  359 |     const loginPage = new LoginPage(page);
  360 |     await loginPage.open();
  361 |     await loginPage.login(process.env.LOGIN_EMAIL, 'P@1' + 'x'.repeat(200));
  362 | 
  363 |     await expect(page.getByText('Invalid Credentials')).toBeVisible();
  364 |     await expect(loginPage.signInButton).toBeVisible();
  365 |   },
  366 | );
  367 | 
  368 | test(
  369 |   'TC-23: Verify that the message goes away when the user types (TC_LOGIN_131)',
  370 |   { tag: ['@regression'] },
  371 |   async ({ page }) => {
  372 |     const loginPage = new LoginPage(page);
  373 |     await loginPage.open();
  374 |     await loginPage.signInButton.click();
  375 |     await expect(page.getByText('Field cannot be empty')).toBeVisible();
  376 | 
  377 |     await loginPage.emailInput.pressSequentially('a');
  378 | 
  379 |     await expect(page.getByText('Field cannot be empty')).toBeHidden();
  380 |   },
  381 | );
  382 | 
  383 | // ---------- Logging in ----------
  384 | 
  385 | test(
  386 |   'TC-24: Verify that the Enter key logs in like the Sign In button (TC_LOGIN_014) (BUG-UI-007)',
  387 |   { tag: ['@regression', '@knownbug'] },
  388 |   async ({ page }) => {
  389 |     const loginPage = new LoginPage(page);
  390 |     await loginPage.open();
  391 |     await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
  392 |     await loginPage.passwordInput.fill(process.env.LOGIN_PASSWORD);
  393 | 
  394 |     await loginPage.passwordInput.press('Enter');
  395 | 
  396 |     await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  397 |   },
  398 | );
  399 | 
  400 | test(
  401 |   'TC-25: Verify that a pasted email and password log in (TC_LOGIN_027, TC_LOGIN_038)',
  402 |   { tag: ['@regression'] },
  403 |   async ({ page, context }) => {
```