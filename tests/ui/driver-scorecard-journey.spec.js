// SCENARIO: the manager looks at a driver's weekly scorecard, all the week's ratings, and an earlier week.
// Tested on the real screens (UI). Read only: nothing is saved.
//
// 1. Manager, in the web app: opens the Weekly tab of driver 36363 (Driver page -> Weekly)
//    CHECK: the week is "Week: 34", "Rating: Week 34" shows 8.89
//    CHECK: the ScoreCard shows Delivered 1134, Photo-On-Delivery 99.9%, POD Opps. 770
// 2. Manager: "View all week's ratings"
//    CHECK: Week 34 = 8.89, Week 33 = N/A, Week 32 = 8.81, Week 31 = 8.81
//    - "10 Weeks"
//    CHECK: the list goes back to Week 25
//    - "Close"
// 3. Manager: "Week: 34" -> clicks 5 August in the calendar (a day of week 32)
//    CHECK: the week is "Week: 32", "Rating: Week 32" shows 8.81
//    CHECK: the ScoreCard shows Delivered 461, Photo-On-Delivery 99.7%
//
// Driver: 36363, a staging driver of station DYY1 with scorecards in weeks 31, 32 and 34 of 2026.

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const DriverWeeklyPage = require('../../pages/DriverWeeklyPage');

test(
  "TC-01: Verify that a driver's weekly scorecard, all the week's ratings and an earlier week are shown correctly",
  { tag: ['@regression'] },
  async ({ page }) => {
    // 1. Manager: logs in and opens the Weekly tab of driver 36363
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    const weeklyPage = new DriverWeeklyPage(page);
    await weeklyPage.open('36363');
    await expect(weeklyPage.weekButton).toHaveText('Week: 34');
    await expect(weeklyPage.ratingBox).toContainText('Rating: Week 34');
    await expect(weeklyPage.ratingBox).toContainText('8.89');
    await expect(weeklyPage.scoreRow('Delivered')).toContainText('1134');
    await expect(weeklyPage.scoreRow('Photo-On-Delivery')).toContainText(
      '99.9%',
    );
    await expect(weeklyPage.scoreRow('POD Opps.')).toContainText('770');

    // 2. Manager: "View all week's ratings" (6 weeks), then "10 Weeks"
    await weeklyPage.allRatingsButton.click();
    await expect(weeklyPage.ratingRow('Week 34')).toContainText('8.89');
    await expect(weeklyPage.ratingRow('Week 33')).toContainText('N/A');
    await expect(weeklyPage.ratingRow('Week 32')).toContainText('8.81');
    await expect(weeklyPage.ratingRow('Week 31')).toContainText('8.81');
    await page.getByRole('button', { name: '10 Weeks' }).click();
    await expect(weeklyPage.ratingRow('Week 25')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(weeklyPage.ratingsWindow).toHaveCount(0);

    // 3. Manager: chooses week 32 in the calendar (5 August 2026)
    await weeklyPage.chooseWeekByDay(5);
    await expect(weeklyPage.weekButton).toHaveText('Week: 32');
    await expect(weeklyPage.ratingBox).toContainText('Rating: Week 32');
    await expect(weeklyPage.ratingBox).toContainText('8.81');
    await expect(weeklyPage.scoreRow('Delivered')).toContainText('461');
    await expect(weeklyPage.scoreRow('Photo-On-Delivery')).toContainText(
      '99.7%',
    );
  },
);
