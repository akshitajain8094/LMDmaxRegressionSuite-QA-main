const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');

// The other ways to sign in, on the login screen: OTP, Forgot Password, Sign Up, Google and Apple
// From the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md).
// Only addresses that reach nobody are used: an OTP to the test user would send a real email.

// ---------- Sign In With OTP ----------

test(
  'TC-01: Verify that "Sign In With OTP" opens the OTP screen (TC_LOGIN_100)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.otpButton.click();

    await expect(
      page.getByText('Request an OTP on your registered Email ID or Mobile no'),
    ).toBeVisible();
    await expect(loginPage.emailOrMobileInput).toBeEditable();
    await expect(loginPage.sendOtpButton).toBeEnabled();
  },
);

test(
  'TC-02: Verify that Send OTP with an empty box shows "Field cannot be empty"',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.requestOtp('');

    await expect(page.getByText('Field cannot be empty')).toBeVisible();
  },
);

test(
  'TC-03: Verify that an invalid email or mobile number shows a message (TC_LOGIN_109)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.otpButton.click();

    for (const value of ['abc@', '12@']) {
      await loginPage.emailOrMobileInput.fill(value);
      await loginPage.sendOtpButton.click();
      await expect(
        page.getByText('Please enter a valid email address or mobile no.'),
        value,
      ).toBeVisible();
    }
  },
);

test(
  'TC-04: Verify that an unregistered email gets no OTP and a clear message (TC_LOGIN_133, TC_LOGIN_110) (BUG-UI-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.requestOtp('unreg_perf01@yopmail.com');

    // No OTP was sent, so the OTP boxes and Verify do not appear
    await expect(page.getByText(/One time password has been sent/)).toHaveCount(
      0,
    );
    await expect(page.getByRole('button', { name: 'Verify' })).toHaveCount(0);
    // Today: "Something went wrong"
    await expect(page.getByText(/not found|not registered/i)).toBeVisible();
  },
);

test(
  'TC-05: Verify that an unregistered mobile number gets no OTP and a clear message (TC_LOGIN_134) (BUG-UI-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.requestOtp('5550001234');

    await expect(page.getByRole('button', { name: 'Verify' })).toHaveCount(0);
    await expect(page.getByText(/not found|not registered/i)).toBeVisible();
  },
);

test(
  'TC-06: Verify that "Sign In With Email ID" goes back to the email and password login (TC_LOGIN_112)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.otpButton.click();

    await loginPage.signInWithEmailButton.click();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
  },
);

// ---------- Forgot Password ----------

test(
  'TC-07: Verify that "Forgot Password?" opens the Forgot Password screen (TC_LOGIN_075)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.forgotPasswordLink.click();

    await expect(page).toHaveURL(/resetPassword/);
    await expect(
      page.getByText('Forgot Password', { exact: true }),
    ).toBeVisible();
    await expect(loginPage.emailOrMobileInput).toBeEditable();
    await expect(loginPage.sendOtpButton).toBeEnabled();
  },
);

test(
  'TC-08: Verify that an empty or invalid email on Forgot Password shows a message (TC_LOGIN_078)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.forgotPasswordLink.click();

    await loginPage.sendOtpButton.click();
    await expect(page.getByText('Field cannot be empty')).toBeVisible();

    await loginPage.emailOrMobileInput.fill('abc@');
    await loginPage.sendOtpButton.click();
    await expect(
      page.getByText('Please enter a valid email address or mobile no.'),
    ).toBeVisible();
  },
);

test(
  'TC-09: Verify that an unregistered email on Forgot Password shows "User Not Found" (TC_LOGIN_077)',
  { tag: ['@regression', '@pr'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.forgotPasswordLink.click();

    await loginPage.emailOrMobileInput.fill('xyz_unreg_perf@yopmail.com');
    await loginPage.sendOtpButton.click();

    await expect(page.getByText('User Not Found')).toBeVisible();
    await expect(page.getByText(/One time password has been sent/)).toHaveCount(
      0,
    );
  },
);

test(
  'TC-10: Verify that "Back To Sign In" goes back to the login screen (TC_LOGIN_084)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.forgotPasswordLink.click();

    await loginPage.backToSignInButton.click();

    await expect(page).toHaveURL(/signIn/);
    await expect(loginPage.signInButton).toBeVisible();
  },
);

// ---------- Sign Up, Google and Apple ----------

test(
  'TC-11: Verify that "Sign Up" opens the registration page, which links back to Sign In (TC_LOGIN_113)',
  { tag: ['@regression'] },
  async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.signUpLink.click();

    await expect(page).toHaveURL(/signUp/);
    await expect(page.getByText('Get Started')).toBeVisible();

    await page.getByText('Sign In', { exact: true }).click();
    await expect(page).toHaveURL(/signIn/);
  },
);

test(
  'TC-12: Verify that "Sign In With Google" opens the Google account chooser (TC_LOGIN_085)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();
    // The button does nothing until Google's sign-in script has loaded
    await page.waitForFunction(() => window.google && window.google.accounts);

    const popupPromise = context.waitForEvent('page');
    await loginPage.googleButton.click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/accounts\.google\.com/);
    // The login screen stays open behind the window
    await expect(loginPage.signInButton).toBeVisible();
  },
);

test(
  'TC-13: Verify that "Sign In With Apple ID" opens the Apple sign-in page (TC_LOGIN_093)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    await loginPage.open();

    const popupPromise = context.waitForEvent('page');
    await loginPage.appleButton.click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/appleid\.apple\.com/);
    await expect(loginPage.signInButton).toBeVisible();
  },
);
