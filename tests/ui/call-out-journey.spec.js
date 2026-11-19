// SCENARIO: the manager records that a driver called out, marks it as excused, then deletes it.
// Tested on the real screens (UI), on today's Callouts screen.
//
// 0. Start clean (API): delete Jordan Whitaker's call-out of today, in case an earlier run stopped halfway
//    (in the web app, picking a driver who already has a call-out that day deletes it)
// 1. Manager, in the web app: Data Management -> Callouts (today is selected)
//    - "Add New CallOut" -> searches "Jordan Whitaker" -> clicks him -> closes the window
//    CHECK: "Jordan Whitaker has been added"
//    - Callout Type "Sick"
//    CHECK: Excused? shows "No"
//    - a reason -> "Save Changes"
//    CHECK: "Callouts Added Successfully"
// 2. Manager reloads the page (the list comes from the server again)
//    CHECK: Jordan Whitaker's row shows "Sick", "No" and the reason
// 3. Manager: "Start Editing" -> Callout Type "Paid Time Off"
//    CHECK: Excused? changes to "Yes" by itself (paid time off is always excused)
//    - a new reason -> "Save Changes"
//    CHECK: "Callouts Edit Successfully"
// 4. Manager reloads the page
//    CHECK: the row shows "Paid Time Off", "Yes" and the new reason
// 5. Manager: the bin icon of the row
//    CHECK: "CallOut deleted successfully", and the row is gone
//
// Driver: Jordan Whitaker (id 38267), a test driver whose phone and email reach no real person.
// The test deletes its call-out at the end (daily regression only: @adds-data). "Send Message" is never clicked.

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const CallOutsPage = require('../../pages/CallOutsPage');
const endpoints = require('../../api/endpoints');
const loginAsTestUser = require('../../api/auth');

test(
  'TC-01: Verify that a call-out added in the web app can be marked as excused and deleted',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    // 0. Start clean: delete Jordan Whitaker's call-out of today (the browser's today, YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA');
    const user = await loginAsTestUser();
    const headers = {
      'app-type': '2',
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const listResponse = await request.get(
      process.env.API_BASE_URL + endpoints.callOut,
      { headers, params: { date: today } },
    );
    const list = await listResponse.json();
    const jordanCallOuts = list.data.filter(
      (callOut) => callOut.driver_id === 38267,
    );
    for (const callOut of jordanCallOuts) {
      await request.delete(process.env.API_BASE_URL + endpoints.callOut, {
        headers,
        params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
      });
    }

    // 1. Manager: logs in, opens Data Management -> Callouts and adds Jordan Whitaker
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    const callOutsPage = new CallOutsPage(page);
    await callOutsPage.open();
    await callOutsPage.addDriver('Jordan Whitaker');
    await expect(
      page.getByText('Jordan Whitaker has been added'),
    ).toBeVisible();

    await callOutsPage.chooseType('Jordan Whitaker', 'Sick');
    await expect(callOutsPage.excusedSelect('Jordan Whitaker')).toHaveText(
      'No',
    );
    await callOutsPage.fillReason(
      'Jordan Whitaker',
      'Called at 5:40 AM: fever since last night.',
    );
    await callOutsPage.saveButton.click();
    await expect(page.getByText('Callouts Added Successfully')).toBeVisible();

    // 2. Reload: the saved call-out comes from the server
    await page.reload();
    const row = callOutsPage.row('Jordan Whitaker');
    await expect(row).toContainText('Sick');
    await expect(row).toContainText('No');
    await expect(row).toContainText(
      'Called at 5:40 AM: fever since last night.',
    );

    // 3. Manager: Start Editing -> "Paid Time Off": Excused? becomes "Yes" by itself
    await callOutsPage.editButton.click();
    await callOutsPage.chooseType('Jordan Whitaker', 'Paid Time Off');
    await expect(callOutsPage.excusedSelect('Jordan Whitaker')).toHaveText(
      'Yes',
    );
    await callOutsPage.fillReason(
      'Jordan Whitaker',
      'Paid time off approved by the station manager.',
    );
    await callOutsPage.saveButton.click();
    await expect(page.getByText('Callouts Edit Successfully')).toBeVisible();

    // 4. Reload: the change is saved
    await page.reload();
    await expect(row).toContainText('Paid Time Off');
    await expect(row).toContainText('Yes');
    await expect(row).toContainText(
      'Paid time off approved by the station manager.',
    );

    // 5. Manager: deletes the call-out (bin icon)
    await callOutsPage.deleteRow('Jordan Whitaker');
    await expect(page.getByText('CallOut deleted successfully')).toBeVisible();
    await expect(
      page.getByText('Jordan Whitaker', { exact: true }),
    ).toHaveCount(0);
  },
);
