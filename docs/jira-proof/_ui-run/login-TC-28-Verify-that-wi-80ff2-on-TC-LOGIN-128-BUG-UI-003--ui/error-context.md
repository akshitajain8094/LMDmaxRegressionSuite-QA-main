# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\login.spec.js >> TC-28: Verify that without internet the screen says "No internet connection" (TC_LOGIN_128) (BUG-UI-003)
- Location: tests\ui\login.spec.js:474:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/no internet/i)
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/no internet/i) with timeout 15000ms
  - waiting for getByText(/no internet/i)

```

```yaml
- img
- paragraph: LMDmax
- paragraph: PERFORMANCE
- heading "Sign In" [level=1]
- textbox "E-mail ID": allchat575@gmail.com
- textbox "Password": Test@123
- button "toggle password visibility"
- paragraph: Forgot Password?
- button "Sign In"
- paragraph: OR
- button "Sign in with google":
  - img
  - text: Sign in with google
- button "Sign in with Apple ID"
- button "Sign in with OTP"
- paragraph:
  - text: Create a new account?
  - button "Sign up"
```

# Test source

```ts
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
  404 |     await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  405 |     const loginPage = new LoginPage(page);
  406 |     await loginPage.open();
  407 | 
  408 |     for (const [box, value] of [
  409 |       [loginPage.emailInput, process.env.LOGIN_EMAIL],
  410 |       [loginPage.passwordInput, process.env.LOGIN_PASSWORD],
  411 |     ]) {
  412 |       await page.evaluate((text) => navigator.clipboard.writeText(text), value);
  413 |       await box.focus();
  414 |       await page.keyboard.press('Control+V');
  415 |     }
  416 |     await expect(loginPage.emailInput).toHaveValue(process.env.LOGIN_EMAIL);
  417 |     await loginPage.signInButton.click();
  418 | 
  419 |     await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  420 |   },
  421 | );
  422 | 
  423 | test(
  424 |   'TC-26: Verify that Sign In is disabled while logging in, and a double click sends one login (TC_LOGIN_019, TC_LOGIN_130)',
  425 |   { tag: ['@regression'] },
  426 |   async ({ page }) => {
  427 |     // Slow the login down by 2 seconds, like a slow network, and count the login requests
  428 |     let loginRequests = 0;
  429 |     await page.route('**/user/perf_login', async (route) => {
  430 |       loginRequests++;
  431 |       await new Promise((resolve) => setTimeout(resolve, 2000));
  432 |       await route.continue();
  433 |     });
  434 |     const loginPage = new LoginPage(page);
  435 |     await loginPage.open();
  436 |     await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
  437 |     await loginPage.passwordInput.fill(process.env.LOGIN_PASSWORD);
  438 | 
  439 |     await loginPage.signInButton.dblclick();
  440 | 
  441 |     await expect(loginPage.signInButton).toBeDisabled();
  442 |     await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  443 |     expect(loginRequests).toBe(1);
  444 |   },
  445 | );
  446 | 
  447 | // ---------- Network problems ----------
  448 | 
  449 | test(
  450 |   'TC-27: Verify that a server error shows a message and Sign In works again (TC_LOGIN_129)',
  451 |   { tag: ['@regression'] },
  452 |   async ({ page }) => {
  453 |     // The server answers 500 to the login
  454 |     await page.route('**/user/perf_login', (route) =>
  455 |       route.fulfill({
  456 |         status: 500,
  457 |         contentType: 'application/json',
  458 |         body: JSON.stringify({
  459 |           success: false,
  460 |           message: 'Internal Server Error',
  461 |         }),
  462 |       }),
  463 |     );
  464 |     const loginPage = new LoginPage(page);
  465 |     await loginPage.open();
  466 |     await loginPage.login(process.env.LOGIN_EMAIL, 'Test@123');
  467 | 
  468 |     await expect(page.getByText('Internal Server Error')).toBeVisible();
  469 |     await expect(loginPage.signInButton).toBeEnabled();
  470 |     await expect(page).not.toHaveURL(/dashboard/);
  471 |   },
  472 | );
  473 | 
  474 | test(
  475 |   'TC-28: Verify that without internet the screen says "No internet connection" (TC_LOGIN_128) (BUG-UI-003)',
  476 |   { tag: ['@regression', '@knownbug'] },
  477 |   async ({ page, context }) => {
  478 |     const loginPage = new LoginPage(page);
  479 |     await loginPage.open();
  480 |     await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
  481 |     await loginPage.passwordInput.fill('Test@123');
  482 | 
  483 |     await context.setOffline(true);
  484 |     await loginPage.signInButton.click();
  485 | 
> 486 |     await expect(page.getByText(/no internet/i)).toBeVisible();
      |                                                  ^ Error: expect(locator).toBeVisible() failed
  487 |     await expect(loginPage.signInButton).toBeEnabled();
  488 |   },
  489 | );
  490 | 
```