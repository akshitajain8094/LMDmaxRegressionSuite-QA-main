// SCENARIOS: call-out journeys (Data Management -> Callouts). A call-out = a driver who does not come to work.
// API only, no browser: each step sends the same request the web app sends when the manager clicks.
// Every test uses its own day (1 to 6 days ago), so tests that run at the same time never share a day.
//
// TC-01 The manager adds a call-out: every screen counts it
//   1. Manager adds a call-out for Jordan Whitaker:     CHECK: saved for that day, by this manager, from the
//      type "Sick", Excused? No, a reason                      web app
//   2. Callouts screen: the list of that day            CHECK: shows the call-out
//   3. Driver profile: Jordan's call-outs               CHECK: shows the call-out
//   4. Dashboard: call-outs of that day                 CHECK: total +1, unexcused +1
//   5. Dashboard: the call-out report of that day       CHECK: lists the call-out
//   6. Leaderboard                                      CHECK: Jordan's Call-Outs count is 1 or more
//   7. Manager deletes it (clean up)
// TC-02 The manager marks a call-out as excused
//   1. Manager adds a call-out: type "Car Trouble", Excused? No
//   2. Manager edits it: Excused? Yes, a new reason     CHECK: "CallOut data updated successfully"
//   3. Callouts screen                                  CHECK: Excused? Yes, the new reason, "Updated by" this
//                                                              manager
//   4. Dashboard: call-outs of that day                 CHECK: excused +1, unexcused -1, total the same
//   5. Manager deletes it (clean up)
// TC-03 The manager deletes a call-out: every screen stops counting it
//   1. Manager adds a call-out: type "Personal Emergency"
//   2. Manager deletes it                               CHECK: "CallOut data deleted successfully"
//   3. Callouts screen, driver profile, call-out report CHECK: the call-out is gone
//   4. Dashboard: call-outs of that day                 CHECK: total -1
// TC-04 Time zones: a manager in New York saves, a manager in India reads
//   1. Manager in New York adds a call-out for the day  CHECK: saved for that day
//   2. Manager in India: Callouts screen                CHECK: on that day, not on the day before
//   3. Manager in India: dashboard of that day          CHECK: counts it (total = the number in the day's list)
// TC-05 Time zones: a manager in India saves, managers in Los Angeles and Auckland read
//   1. Manager in India adds a call-out for the day
//   2. Los Angeles, then Auckland: Callouts screen and  CHECK: on that day; the dashboard total = the number
//      dashboard of that day                                   in the day's list
// Known bug: it fails until the bug is fixed, and deletes what it saved before its checks.
// TC-06 BUG-API-018: a second call-out for the same driver and day         CHECK: refused (the web app allows one)
// Other wrong call-outs that the API saves (a type not in the station's list, a reason over 250 characters, a
// driver that does not exist, an impossible date) have no test yet: see BUG-API-015 and ENV-005 in
// docs/known-bugs/api-bugs.md.
//
// Driver: Jordan Whitaker (id 38267), a test driver whose phone and email reach no real person.
// Every test deletes its call-outs (daily regression only: @adds-data). If a test stops before its last step, its
// call-out stays: delete it in the web app (Data Management -> Callouts -> that day).

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const daysAgo = require('../../../api/dates');

// ---------- Journeys ----------

test(
  'TC-01: Verify that a call-out added by the manager is counted on every screen that shows call-outs',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(1); // this test's own day

    // Before: the dashboard's call-outs of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.callouts;

    // 1. Manager: Add New CallOut -> Jordan Whitaker -> type, Excused?, reason -> Save Changes
    const addResponse = await request.post(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick', // the call-out type
            excused: 'No',
            driver_id: '38267',
            date,
            reason:
              "Called at 5:40 AM: fever since last night, will bring a doctor's note.",
          },
        ],
      },
    });
    await addToReport(addResponse);

    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    expect(added.message).toBe('CallOut data saved successfully');
    const callOut = added.data[0];
    expect(callOut.date).toBe(date + 'T00:00:00.000Z');
    expect(callOut.driver_id).toBe(38267); // a number in this API (BUG-API-005)
    expect(callOut.metrics.callout_time).toBe('Sick');
    expect(callOut.metrics.excused).toBe('No');
    expect(callOut.created_by).toBe(user.account_id);
    expect(callOut.created_from_app_type).toBe('2'); // 2 = the performance web app

    // 2. Callouts screen: the list of that day shows it
    const listResponse = await request.get(endpoints.callOut, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((item) => item._id);
    expect(listIds).toContain(callOut._id);

    // 3. Driver profile: Jordan Whitaker's call-outs show it
    const profileResponse = await request.get(endpoints.callOut, {
      headers,
      params: { start: date, end: date, driver_id: '38267', company_id: '541' },
    });
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    const profileIds = profile.data.map((item) => item._id);
    expect(profileIds).toContain(callOut._id);

    // 4. Dashboard: one more call-out, and one more unexcused
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    const after = dashboard.data.team.callouts;
    expect(after.total).toBe(before.total + 1);
    expect(after.unexcused).toBe(before.unexcused + 1);
    expect(after.excused).toBe(before.excused);

    // 5. Dashboard: the call-out report of that day (a click on the call-out number) lists it
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: { start: date, end: date, report_name: 'callOutReport' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).toContain(callOut._id);

    // 6. Leaderboard: Jordan Whitaker's Call-Outs column counts it
    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const jordan = leaderboard.data.find((driver) => driver.id === '38267');
    expect(jordan.callout).toBeGreaterThan(0);

    // 7. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.callOut, {
      headers,
      params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

test(
  'TC-02: Verify that a call-out marked as excused moves from unexcused to excused on the dashboard',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(2); // this test's own day

    // 1. Manager: adds a call-out (Excused? No)
    const addResponse = await request.post(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Car Trouble',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Car broke down on the way to the station at 6:15 AM.',
          },
        ],
      },
    });
    await addToReport(addResponse);
    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const callOut = added.data[0];

    // Before the edit: the dashboard's call-outs of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.callouts;

    // 2. Manager: Start Editing -> Excused? Yes, a new reason -> Save Changes (the web app sends the whole row)
    const editResponse = await request.patch(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            _id: callOut._id,
            name: 'Jordan Whitaker',
            callout_time: 'Car Trouble',
            status: 'callout',
            excused: 'Yes',
            reason:
              'Car broke down on the way to the station at 6:15 AM. Tow truck receipt checked: excused.',
            date: callOut.date,
            driver_id: callOut.driver_id,
            msg_sent: false,
            is_type_deleted: false,
            created_from_app_type: '2',
            created_by: callOut.created_by,
            created_at: callOut.created_at,
          },
        ],
      },
    });
    await addToReport(editResponse);

    expect(editResponse.status()).toBe(200);
    const edited = await editResponse.json();
    expect(edited.message).toBe('CallOut data updated successfully');

    // 3. Callouts screen: the call-out shows the change, and who changed it ("Updated by ..." in the web app)
    const listResponse = await request.get(endpoints.callOut, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const changed = list.data.find((item) => item._id === callOut._id);
    expect(changed.metrics.excused).toBe('Yes');
    expect(changed.metrics.reason).toContain('Tow truck receipt checked');
    expect(changed.updated_by).toBe(user.account_id);
    expect(changed.updated_from_app_type).toBe('2');
    expect(changed.updated_at).not.toBe(changed.created_at);

    // 4. Dashboard: one more excused, one less unexcused, the same total
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    const after = dashboard.data.team.callouts;
    expect(after.excused).toBe(before.excused + 1);
    expect(after.unexcused).toBe(before.unexcused - 1);
    expect(after.total).toBe(before.total);

    // 5. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.callOut, {
      headers,
      params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

test(
  'TC-03: Verify that a deleted call-out is no longer shown or counted on any screen',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(3); // this test's own day

    // 1. Manager: adds a call-out
    const addResponse = await request.post(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Personal Emergency',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Family emergency, called the dispatcher at 6:00 AM.',
          },
        ],
      },
    });
    await addToReport(addResponse);
    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const callOut = added.data[0];

    // Before the delete: the dashboard's call-outs of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.callouts;

    // 2. Manager: Delete (the bin icon of the row). The web app sends the id, the driver and the saved date.
    const deleteResponse = await request.delete(endpoints.callOut, {
      headers,
      params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
    });
    await addToReport(deleteResponse);

    expect(deleteResponse.status()).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.message).toBe('CallOut data deleted successfully');

    // 3. Callouts screen, driver profile and call-out report: the call-out is gone
    const listResponse = await request.get(endpoints.callOut, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((item) => item._id);
    expect(listIds).not.toContain(callOut._id);

    const profileResponse = await request.get(endpoints.callOut, {
      headers,
      params: { start: date, end: date, driver_id: '38267', company_id: '541' },
    });
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    const profileIds = profile.data.map((item) => item._id);
    expect(profileIds).not.toContain(callOut._id);

    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: { start: date, end: date, report_name: 'callOutReport' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).not.toContain(callOut._id);

    // 4. Dashboard: one call-out less
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    const after = dashboard.data.team.callouts;
    expect(after.total).toBe(before.total - 1);
  },
);

test(
  'TC-04: Verify that a call-out saved by a manager in New York is on the same day for a manager in India',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const date = daysAgo(4); // this test's own day
    const dayBefore = daysAgo(5);

    // 1. Manager in New York: adds a call-out (the web app sends the browser's time zone)
    const addResponse = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'America/New_York',
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Called at 5:30 AM Eastern time: stomach flu.',
          },
        ],
      },
    });
    await addToReport(addResponse);

    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const callOut = added.data[0];
    expect(callOut.date).toBe(date + 'T00:00:00.000Z');

    // 2. Manager in India: the Callouts screen shows it on that day, not on the day before
    const listResponse = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'Asia/Calcutta',
      },
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((item) => item._id);
    expect(listIds).toContain(callOut._id);

    const dayBeforeResponse = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'Asia/Calcutta',
      },
      params: { date: dayBefore },
    });
    await addToReport(dayBeforeResponse);
    const dayBeforeList = await dayBeforeResponse.json();
    const dayBeforeIds = dayBeforeList.data.map((item) => item._id);
    expect(dayBeforeIds).not.toContain(callOut._id);

    // 3. Manager in India: the dashboard of that day counts every call-out of the day's list
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'Asia/Calcutta',
      },
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    expect(dashboard.data.team.callouts.total).toBe(list.data.length);

    // 4. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

test(
  'TC-05: Verify that a call-out saved by a manager in India is on the same day in Los Angeles and Auckland',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const date = daysAgo(5); // this test's own day

    // 1. Manager in India: adds a call-out
    const addResponse = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'Asia/Calcutta',
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'No Call No Show',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Did not come to the station and did not answer calls.',
          },
        ],
      },
    });
    await addToReport(addResponse);
    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const callOut = added.data[0];

    // 2. Manager in Los Angeles (8 to 13 hours behind India): the same day, counted on the dashboard
    const losAngelesListResponse = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'America/Los_Angeles',
      },
      params: { date },
    });
    await addToReport(losAngelesListResponse);
    const losAngelesList = await losAngelesListResponse.json();
    const losAngelesIds = losAngelesList.data.map((item) => item._id);
    expect(losAngelesIds).toContain(callOut._id);

    const losAngelesDashboardResponse = await request.get(
      endpoints.dashboardData,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
          'client-time-zone': 'America/Los_Angeles',
        },
        params: { start: date, end: date },
      },
    );
    await addToReport(losAngelesDashboardResponse);
    const losAngelesDashboard = await losAngelesDashboardResponse.json();
    expect(losAngelesDashboard.data.team.callouts.total).toBe(
      losAngelesList.data.length,
    );

    // 3. Manager in Auckland (6 to 8 hours ahead of India): the same day, counted on the dashboard
    const aucklandListResponse = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
        'client-time-zone': 'Pacific/Auckland',
      },
      params: { date },
    });
    await addToReport(aucklandListResponse);
    const aucklandList = await aucklandListResponse.json();
    const aucklandIds = aucklandList.data.map((item) => item._id);
    expect(aucklandIds).toContain(callOut._id);

    const aucklandDashboardResponse = await request.get(
      endpoints.dashboardData,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
          'client-time-zone': 'Pacific/Auckland',
        },
        params: { start: date, end: date },
      },
    );
    await addToReport(aucklandDashboardResponse);
    const aucklandDashboard = await aucklandDashboardResponse.json();
    expect(aucklandDashboard.data.team.callouts.total).toBe(
      aucklandList.data.length,
    );

    // 4. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { _id: callOut._id, driver_id: '38267', date: callOut.date },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

// ---------- Known bug: this fails until the bug is fixed (docs/known-bugs/api-bugs.md) ----------
// While the bug is open both call-outs are saved, so the test first deletes Jordan Whitaker's call-outs of its
// own day, then checks.

test(
  'TC-06: Verify that a driver cannot get two call-outs on the same day (BUG-API-018)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(6); // this test's own day

    // 1. Manager: adds a call-out for Jordan Whitaker
    const firstResponse = await request.post(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(firstResponse);
    expect(firstResponse.status()).toBe(200);

    // 2. A second call-out for the same driver and day (e.g. by another manager, or by the Scheduler app).
    // In the web app, picking the driver again removes the first one: one call-out per driver and day.
    const secondResponse = await request.post(endpoints.callOut, {
      headers,
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'No Call No Show',
            excused: 'No',
            driver_id: '38267',
            date,
            reason: 'Did not come to the station.',
          },
        ],
      },
    });
    await addToReport(secondResponse);
    const second = await secondResponse.json();

    // 3. Callouts screen: Jordan Whitaker's call-outs of that day
    const listResponse = await request.get(endpoints.callOut, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const jordanCallOuts = list.data.filter((item) => item.driver_id === 38267);

    // Clean up first: delete Jordan Whitaker's call-outs of that day
    for (const item of jordanCallOuts) {
      const deleteResponse = await request.delete(endpoints.callOut, {
        headers,
        params: { _id: item._id, driver_id: '38267', date: item.date },
      });
      await addToReport(deleteResponse);
    }

    expect(second.success).toBe(false);
    const jordanCallOutIds = jordanCallOuts.map((item) => item._id);
    expect(jordanCallOutIds).toHaveLength(1);
  },
);
