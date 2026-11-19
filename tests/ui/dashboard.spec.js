const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');

// Dashboard screen

test(
  'TC-01: Verify that a logged-in user can open the dashboard',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ page }) => {
    // Log in first (every UI test starts logged out)
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    await page.goto('/v2/dashboard/daily-highlights');

    await expect(page).toHaveURL(/dashboard/);
    await expect(loginPage.signInButton).toBeHidden();
  },
);
