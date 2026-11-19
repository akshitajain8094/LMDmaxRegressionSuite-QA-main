const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');

// Login screen
// TC-03 and later are from the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md)

test(
  'TC-01: Verify that login with valid credentials opens the dashboard',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);

    // Logging in can be slow, so wait up to 30 seconds (30000 ms)
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  },
);

test(
  'TC-02: Verify that wrong password keeps the user on the login page',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, 'WrongPassword@123');

    await expect(loginPage.signInButton).toBeVisible();
    await expect(page).not.toHaveURL(/dashboard/);
  },
);

// ---------- How the screen looks ----------

test(
  'TC-03: Verify that the login page opens over HTTPS without console errors (TC_LOGIN_001)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.signInButton).toBeVisible();

    expect(page.url()).toMatch(/^https:\/\//);
    expect(consoleErrors).toEqual([]);
  },
);

test(
  'TC-04: Verify that the login page is ready within 3 seconds (TC_LOGIN_001) (BUG-UI-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.signInButton).toBeVisible();

    // The time from opening the address until the page was ready (domContentLoaded), in milliseconds
    const readyAfter = await page.evaluate(
      () =>
        performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
    );
    expect(readyAfter).toBeLessThan(3000);
  },
);

test(
  'TC-05: Verify that the product name, tab title and favicon are shown (TC_LOGIN_002, TC_LOGIN_003)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await expect(page.getByText('LMDmax', { exact: true })).toBeVisible();
    await expect(page.getByText('PERFORMANCE', { exact: true })).toBeVisible();
    await expect(page).toHaveTitle('Performance App');
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
      'href',
      '/favicon.ico',
    );
  },
);

test(
  'TC-06: Verify that the "Sign In" heading is shown (TC_LOGIN_004)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await expect(loginPage.heading).toBeVisible();
  },
);

test(
  'TC-07: Verify that the email and password boxes are shown, editable and have placeholders (TC_LOGIN_005, TC_LOGIN_006)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await expect(loginPage.emailInput).toBeEditable();
    await expect(loginPage.passwordInput).toBeEditable();
    await expect(loginPage.emailInput).toHaveAttribute(
      'placeholder',
      'E-mail ID',
    );
    await expect(loginPage.passwordInput).toHaveAttribute(
      'placeholder',
      'Password',
    );
  },
);

test(
  'TC-08: Verify that all sign-in buttons and links are shown (TC_LOGIN_007, TC_LOGIN_010)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    await expect(loginPage.signInButton).toBeEnabled();
    await expect(loginPage.googleButton).toBeEnabled();
    await expect(loginPage.appleButton).toBeEnabled();
    await expect(loginPage.otpButton).toBeEnabled();
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(page.getByText('OR', { exact: true })).toBeVisible();
    await expect(page.getByText('Create a new account?')).toBeVisible();
    await expect(loginPage.signUpLink).toBeVisible();
  },
);

test(
  'TC-09: Verify that the login page has no Terms and Privacy Policy links, as designed (TC_LOGIN_012)',
  { tag: ['@regression'] },
  async ({ page }) => {
    // The sheet notes this as a consistency question: the Sign Up page has both links
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await expect(loginPage.signInButton).toBeVisible();

    await expect(page.getByText(/Terms/)).toHaveCount(0);
    await expect(page.getByText('Privacy Policy')).toHaveCount(0);
  },
);

test(
  'TC-10: Verify that the Tab key goes Email → Password → eye icon → Forgot Password? → Sign In (TC_LOGIN_013) (BUG-UI-004)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.emailInput.focus();

    await page.keyboard.press('Tab');
    await expect(loginPage.passwordInput).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.eyeIcon).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.forgotPasswordLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(loginPage.signInButton).toBeFocused();
  },
);

test(
  'TC-11: Verify that the screen fits at desktop, tablet and phone widths (TC_LOGIN_015)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    for (const [width, height] of [
      [1920, 1080],
      [1366, 768],
      [1280, 720],
      [768, 1024],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      await expect(loginPage.signInButton, 'width ' + width).toBeInViewport();
      const scrollsSideways = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      );
      expect(scrollsSideways, 'side scroll at width ' + width).toBe(false);
    }
  },
);

test(
  'TC-12: Verify that buttons and links show the hand cursor (TC_LOGIN_018)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    for (const element of [
      loginPage.signInButton,
      loginPage.forgotPasswordLink,
      loginPage.googleButton,
      loginPage.otpButton,
      loginPage.signUpLink,
    ]) {
      await expect(element).toHaveCSS('cursor', 'pointer');
    }
  },
);

// ---------- Email and password boxes ----------

test(
  'TC-13: Verify that an empty email shows "Field cannot be empty" (TC_LOGIN_020)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('', 'Test@123');

    await expect(page.getByText('Field cannot be empty')).toBeVisible();
    await expect(page).not.toHaveURL(/dashboard/);
  },
);

test(
  'TC-14: Verify that every invalid email format of the sheet shows "Please enter a valid email address" (TC_LOGIN_021)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    for (const email of [
      'abc',
      'abc@',
      '@yopmail.com',
      'abc@yopmail',
      'abc@@yopmail.com',
      'abc yopmail.com',
      'abc@.com',
    ]) {
      await loginPage.login(email, 'Test@123');
      await expect(
        page.getByText('Please enter a valid email address'),
        email,
      ).toBeVisible();
    }
  },
);

test(
  'TC-15: Verify that an unregistered email shows "Invalid Credentials" (TC_LOGIN_024)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('notexist123@yopmail.com', 'Wrong@123');

    // The same message as a wrong password: it does not tell whether the account exists
    await expect(page.getByText('Invalid Credentials')).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  },
);

test(
  'TC-16: Verify that an email of more than 255 characters shows a message, not a broken page (TC_LOGIN_025)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('a'.repeat(260) + '@yopmail.com', 'Test@123');

    await expect(
      page.getByText('Please enter a valid email address'),
    ).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  },
);

test(
  'TC-17: Verify that an empty password shows "Field cannot be empty" (TC_LOGIN_029)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login('ds1@yopmail.com', '');

    await expect(page.getByText('Field cannot be empty')).toBeVisible();
    await expect(page).not.toHaveURL(/dashboard/);
  },
);

test(
  'TC-18: Verify that both empty boxes show a message each (TC_LOGIN_030) (BUG-UI-006)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.signInButton.click();

    await expect(page.getByText('Field cannot be empty')).toHaveCount(2);
  },
);

test(
  'TC-19: Verify that the password is hidden (dots) by default (TC_LOGIN_033)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.passwordInput.fill('Test@123');

    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  },
);

test(
  'TC-20: Verify that the eye icon shows the password, and a second click hides it again (TC_LOGIN_034, TC_LOGIN_035)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.passwordInput.fill('Test@123');

    await loginPage.eyeIcon.click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    await expect(loginPage.passwordInput).toHaveValue('Test@123');

    await loginPage.eyeIcon.click();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  },
);

test(
  'TC-21: Verify that a hidden password cannot be copied (TC_LOGIN_037)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.passwordInput.fill('Secret@123');
    await page.evaluate(() => navigator.clipboard.writeText('nothing copied'));

    await loginPage.passwordInput.focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+C');

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toBe('nothing copied');
  },
);

test(
  'TC-22: Verify that a password of more than 200 characters shows "Invalid Credentials", not a broken page (TC_LOGIN_039)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, 'P@1' + 'x'.repeat(200));

    await expect(page.getByText('Invalid Credentials')).toBeVisible();
    await expect(loginPage.signInButton).toBeVisible();
  },
);

test(
  'TC-23: Verify that the message goes away when the user types (TC_LOGIN_131)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.signInButton.click();
    await expect(page.getByText('Field cannot be empty')).toBeVisible();

    await loginPage.emailInput.pressSequentially('a');

    await expect(page.getByText('Field cannot be empty')).toBeHidden();
  },
);

// ---------- Logging in ----------

test(
  'TC-24: Verify that the Enter key logs in like the Sign In button (TC_LOGIN_014) (BUG-UI-007)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
    await loginPage.passwordInput.fill(process.env.LOGIN_PASSWORD);

    await loginPage.passwordInput.press('Enter');

    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  },
);

test(
  'TC-25: Verify that a pasted email and password log in (TC_LOGIN_027, TC_LOGIN_038)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const loginPage = new LoginPage(page);
    await loginPage.open();

    for (const [box, value] of [
      [loginPage.emailInput, process.env.LOGIN_EMAIL],
      [loginPage.passwordInput, process.env.LOGIN_PASSWORD],
    ]) {
      await page.evaluate((text) => navigator.clipboard.writeText(text), value);
      await box.focus();
      await page.keyboard.press('Control+V');
    }
    await expect(loginPage.emailInput).toHaveValue(process.env.LOGIN_EMAIL);
    await loginPage.signInButton.click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  },
);

test(
  'TC-26: Verify that Sign In is disabled while logging in, and a double click sends one login (TC_LOGIN_019, TC_LOGIN_130)',
  { tag: ['@regression'] },
  async ({ page }) => {
    // Slow the login down by 2 seconds, like a slow network, and count the login requests
    let loginRequests = 0;
    await page.route('**/user/perf_login', async (route) => {
      loginRequests++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
    await loginPage.passwordInput.fill(process.env.LOGIN_PASSWORD);

    await loginPage.signInButton.dblclick();

    await expect(loginPage.signInButton).toBeDisabled();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
    expect(loginRequests).toBe(1);
  },
);

// ---------- Network problems ----------

test(
  'TC-27: Verify that a server error shows a message and Sign In works again (TC_LOGIN_129)',
  { tag: ['@regression'] },
  async ({ page }) => {
    // The server answers 500 to the login
    await page.route('**/user/perf_login', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Internal Server Error',
        }),
      }),
    );
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, 'Test@123');

    await expect(page.getByText('Internal Server Error')).toBeVisible();
    await expect(loginPage.signInButton).toBeEnabled();
    await expect(page).not.toHaveURL(/dashboard/);
  },
);

test(
  'TC-28: Verify that without internet the screen says "No internet connection" (TC_LOGIN_128) (BUG-UI-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.emailInput.fill(process.env.LOGIN_EMAIL);
    await loginPage.passwordInput.fill('Test@123');

    await context.setOffline(true);
    await loginPage.signInButton.click();

    await expect(page.getByText(/no internet/i)).toBeVisible();
    await expect(loginPage.signInButton).toBeEnabled();
  },
);
