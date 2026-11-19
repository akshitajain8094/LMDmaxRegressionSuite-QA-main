// SCENARIO: the manager suspends a driver for today, finds him in the suspended drivers, then resumes him.
// Tested on the real screens (UI), on the Leaderboard.
//
// 0. Start clean (API): resume Morgan Ellis and make him active, in case an earlier run stopped halfway
// 1. Manager, in the web app: Dashboard -> Leaderboard -> searches "Morgan Ellis"
//    - the row's ⋮ menu -> "Suspend Driver" -> From: today, To: today (a click on the day in each calendar)
//    CHECK: both date boxes show today
//    - details -> "Suspend"
//    CHECK: "Driver suspended successfully"
// 2. Manager: list switch "Active drivers" -> "Suspended Drivers" -> searches "Morgan Ellis"
//    CHECK: Morgan Ellis is in the list of suspended drivers
// 3. Manager: the row's ⋮ menu -> "Resume Driver"
//    CHECK: the window shows "Suspension Details", From and To = today, and the details
//    - "Resume Driver"
//    CHECK: "Driver resumed successfully"
// 4. Manager: list switch "Suspended Drivers" -> "Active drivers" -> searches "Morgan Ellis"
//    CHECK: Morgan Ellis is active again
//
// Driver: Morgan Ellis (id 38309), a test driver whose phone and email reach no real person.
// Daily regression only (@adds-data): every suspension stays in the suspended drivers report (ENV-004).

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const LeaderboardPage = require('../../pages/LeaderboardPage');
const endpoints = require('../../api/endpoints');
const loginAsTestUser = require('../../api/auth');

test(
  'TC-01: Verify that a driver suspended in the web app is listed as suspended and can be resumed',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    // 0. Start clean: resume Morgan Ellis and make him active (both change nothing if he already is)
    const user = await loginAsTestUser();
    const headers = {
      'app-type': '2',
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    await request.post(process.env.API_BASE_URL + endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38309' },
    });
    await request.patch(
      process.env.API_BASE_URL + endpoints.driverStatusUpdate,
      {
        headers,
        data: { status: 'active', id: ['38309'], type: 'single' },
      },
    );
    const details = 'Suspended for one day: missed the safety training.';
    // Today as the date boxes show it (09/25/2026) and as the Suspension Details window shows it (09-25-2026)
    const todayInBox = new Date().toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const todayText = todayInBox.replaceAll('/', '-');

    // 1. Manager: logs in, opens the Leaderboard and suspends Morgan Ellis for today
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    const leaderboardPage = new LeaderboardPage(page);
    await leaderboardPage.open();
    await leaderboardPage.search('Morgan Ellis');
    await leaderboardPage.openRowMenu('Morgan Ellis');
    await page.getByText('Suspend Driver').click();
    await leaderboardPage.chooseToday('From');
    await leaderboardPage.chooseToday('To');
    await expect(page.getByPlaceholder('From')).toHaveValue(todayInBox);
    await expect(page.getByPlaceholder('To')).toHaveValue(todayInBox);
    await leaderboardPage.detailsBox.fill(details);
    await leaderboardPage.suspendButton.click();
    await expect(page.getByText('Driver suspended successfully')).toBeVisible();

    // 2. Manager: the list of suspended drivers shows Morgan Ellis
    await leaderboardPage.showList('Active drivers', 'Suspended Drivers');
    await leaderboardPage.search('Morgan Ellis');
    await expect(leaderboardPage.row('Morgan Ellis')).toBeVisible();

    // 3. Manager: Resume Driver -> the window shows the suspension -> Resume Driver
    await leaderboardPage.openRowMenu('Morgan Ellis');
    await page.getByText('Resume Driver').click();
    await expect(page.getByText('Suspension Details')).toBeVisible();
    await expect(page.getByText(todayText)).toHaveCount(2); // From and To
    await expect(page.getByText(details)).toBeVisible();
    await leaderboardPage.resumeButton.click();
    await expect(page.getByText('Driver resumed successfully')).toBeVisible();

    // 4. Manager: Morgan Ellis is in the list of active drivers again
    await leaderboardPage.showList('Suspended Drivers', 'Active drivers');
    await leaderboardPage.search('Morgan Ellis');
    await expect(leaderboardPage.row('Morgan Ellis')).toBeVisible();
  },
);
