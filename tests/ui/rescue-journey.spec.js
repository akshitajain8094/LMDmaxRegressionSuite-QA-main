// SCENARIO: the manager records a rescue, changes it to "Refuse", then deletes it.
// Tested on the real screens (UI), on today's Rescue screen.
//
// 0. Start clean (API): delete today's rescues of Jordan Whitaker, in case an earlier run stopped halfway
// 1. Manager, in the web app: Data Management -> Rescue (today is selected)
//    - "Add New Rescue" -> Rescuer "Casey Brooks", Receiver "Jordan Whitaker"
//    CHECK: Status shows "Completed"
//    - 42 packages, 18 stops, a reason -> "Save Changes"
//    CHECK: "Rescue Added Successfully"
// 2. Manager reloads the page (the list comes from the server again)
//    CHECK: the row shows Casey Brooks, "Completed", 42, 18 and the reason
// 3. Manager: "Start Editing" -> Status "Refuse" -> "Save Changes"
//    CHECK: "Rescue Edit Successfully"
// 4. Manager reloads the page
//    CHECK: the row shows "Refuse" (no longer "Completed")
// 5. Manager: the bin icon of the row
//    CHECK: "Rescue deleted successfully", and the row is gone
//
// Drivers: Casey Brooks (38315, the rescuer) and Jordan Whitaker (38267, the receiver), test drivers whose phones
// and emails reach no real person. The test deletes its rescue at the end (daily regression only: @adds-data).

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const RescuePage = require('../../pages/RescuePage');
const endpoints = require('../../api/endpoints');
const loginAsTestUser = require('../../api/auth');

test(
  'TC-01: Verify that a rescue added in the web app can be changed to "Refuse" and deleted',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    // 0. Start clean: delete Jordan Whitaker's rescues of today (the browser's today, YYYY-MM-DD)
    const today = new Date().toLocaleDateString('en-CA');
    const user = await loginAsTestUser();
    const headers = {
      'app-type': '2',
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const listResponse = await request.get(
      process.env.API_BASE_URL + endpoints.rescue,
      { headers, params: { date: today } },
    );
    const list = await listResponse.json();
    const jordanRescues = list.data.filter(
      (rescue) => rescue.caller_id === 38267,
    );
    for (const rescue of jordanRescues) {
      await request.delete(process.env.API_BASE_URL + endpoints.rescue, {
        headers,
        params: {
          _id: rescue._id,
          rescuer_id: String(rescue.rescuer_id),
          caller_id: '38267',
          date: rescue.date,
        },
      });
    }

    // 1. Manager: logs in, opens Data Management -> Rescue and adds a rescue
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    const rescuePage = new RescuePage(page);
    await rescuePage.open();
    await rescuePage.addButton.click();
    await rescuePage.pickDriver(rescuePage.rescuerBox, 'Casey Brooks');
    await rescuePage.pickDriver(rescuePage.receiverBox, 'Jordan Whitaker');
    await expect(rescuePage.statusSelect).toContainText('Completed');
    await rescuePage.packagesBox.fill('42');
    await rescuePage.stopsBox.fill('18');
    await rescuePage.reasonBox.fill(
      'Van broke down on the route, Casey took over the last stops.',
    );
    await rescuePage.saveButton.click();
    await expect(page.getByText('Rescue Added Successfully')).toBeVisible();

    // 2. Reload: the saved rescue comes from the server
    await page.reload();
    const row = rescuePage.row('Jordan Whitaker');
    await expect(row).toContainText('Casey Brooks');
    await expect(row).toContainText('Completed');
    await expect(row).toContainText('42');
    await expect(row).toContainText('18');
    await expect(row).toContainText(
      'Van broke down on the route, Casey took over the last stops.',
    );

    // 3. Manager: Start Editing -> Status "Refuse" -> Save Changes
    await rescuePage.editButton.click();
    await rescuePage.chooseStatus('Refuse');
    await rescuePage.saveButton.click();
    await expect(page.getByText('Rescue Edit Successfully')).toBeVisible();

    // 4. Reload: the change is saved
    await page.reload();
    await expect(row).toContainText('Refuse');
    await expect(row).not.toContainText('Completed');

    // 5. Manager: deletes the rescue (bin icon)
    await rescuePage.deleteRow('Jordan Whitaker');
    await expect(page.getByText('Rescue deleted successfully')).toBeVisible();
    await expect(
      page.getByText('Jordan Whitaker', { exact: true }),
    ).toHaveCount(0);
  },
);
