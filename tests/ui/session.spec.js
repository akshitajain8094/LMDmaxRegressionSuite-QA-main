const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ProfileMenu = require('../../pages/ProfileMenu');

// Sessions in the browser: after login, logout, other tabs and direct addresses
// From the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md)

const dashboardUrl = '/v2/dashboard/daily-highlights';

// Logs in on the login screen and waits for the dashboard
async function logIn(page) {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
}

test(
  'TC-01: Verify that a page of the app without login opens the login page (TC_LOGIN_060)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    await page.goto(dashboardUrl);

    await expect(page).toHaveURL(/signIn/);
    await expect(new LoginPage(page).signInButton).toBeVisible();
  },
);

test(
  'TC-02: Verify that the login page opens the dashboard when already logged in (TC_LOGIN_118)',
  { tag: ['@regression'] },
  async ({ page }) => {
    await logIn(page);

    await page.goto('/signIn');

    await expect(page).toHaveURL(/dashboard/);
  },
);

test(
  'TC-03: Verify that Back after login does not show the login page (TC_LOGIN_119)',
  { tag: ['@regression'] },
  async ({ page }) => {
    await logIn(page);

    await page.goBack();

    await expect(page).not.toHaveURL(/signIn/);
    await expect(new LoginPage(page).signInButton).toBeHidden();
  },
);

test(
  'TC-04: Verify that Log Out opens the login page, and Back does not show the dashboard again (TC_LOGIN_132, TC_LOGIN_120)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    await logIn(page);

    const logoutRequest = page.waitForRequest(/user\/logout/);
    await new ProfileMenu(page).logOut();
    await logoutRequest;
    await expect(page).toHaveURL(/signIn/);

    await page.goBack();
    await expect(page).toHaveURL(/signIn/);
  },
);

test(
  'TC-05: Verify that Log Out in one tab logs out the other tab (TC_LOGIN_123)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    await logIn(page);
    const secondTab = await context.newPage();
    await secondTab.goto(dashboardUrl);
    await expect(secondTab).toHaveURL(/dashboard/);

    await new ProfileMenu(page).logOut();
    await expect(page).toHaveURL(/signIn/);

    // The user opens a page on the second tab. The tab may already be on its way to the login page by
    // itself, which stops the click; so try again until the login page shows
    await expect(async () => {
      await secondTab.goto(dashboardUrl);
      await expect(secondTab).toHaveURL(/signIn/, { timeout: 5000 });
    }).toPass({ timeout: 30000 });
  },
);

test(
  'TC-06: Verify that clearing cookies and stored data opens the login page (TC_LOGIN_127)',
  { tag: ['@regression'] },
  async ({ page, context }) => {
    await logIn(page);

    await context.clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    await expect(page).toHaveURL(/signIn/);
  },
);

test(
  'TC-07: Verify that after login the user lands on the page they asked for (TC_LOGIN_121) (BUG-UI-005)',
  { tag: ['@regression', '@knownbug'] },
  async ({ page }) => {
    await page.goto('/v2/dashboard/your-scorecard');
    await expect(page).toHaveURL(/signIn/);

    const loginPage = new LoginPage(page);
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);

    // Today: Daily Highlights
    await expect(page).toHaveURL(/your-scorecard/, { timeout: 30000 });
  },
);
