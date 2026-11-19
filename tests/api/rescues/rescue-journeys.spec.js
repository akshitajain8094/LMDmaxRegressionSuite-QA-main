// SCENARIOS: rescue journeys (Data Management -> Rescue). A rescue = a driver (the rescuer) takes over packages and
// stops of another driver (the receiver) on a day. API only, no browser: each step sends the same request the web
// app sends when the manager clicks. Every test uses its own day (1 to 6 days ago), so tests that run at the same
// time never share a day.
//
// TC-01 The manager adds a rescue: it is counted
//   1. Manager adds a rescue: Casey Brooks rescues        CHECK: saved for that day, "Completed", 42 packages,
//      Jordan Whitaker, 42 packages, 18 stops, a reason          18 stops
//   2. Rescue screen: the list of that day                CHECK: shows the rescue
//   3. Dashboard: rescues of that day                     CHECK: completed +1
//   4. Dashboard: the rescue report of that day           CHECK: lists the rescue
//   5. Manager deletes it (clean up)
// TC-02 The manager changes a rescue to "Refuse"
//   1. Manager adds a rescue ("Completed")
//   2. Start Editing -> Status "Refuse" -> Save Changes   CHECK: "Rescue data updated successfully"
//   3. Rescue screen                                      CHECK: the rescue shows "Refuse"
//   4. Dashboard: rescues of that day                     CHECK: completed -1, refused +1
//   5. Manager deletes it (clean up)
// TC-03 The manager deletes a rescue: it is no longer shown or counted
//   1. Manager adds a rescue
//   2. Manager deletes it (bin icon)                      CHECK: "Rescue data deleted successfully"
//   3. Rescue screen and the rescue report                CHECK: the rescue is gone
//   4. Dashboard: rescues of that day                     CHECK: completed -1
// Known bugs: they fail until the bug is fixed. Each deletes what it saved before its checks.
// TC-04 BUG-API-022: a driver rescues himself (rescuer = receiver; the web app cannot pick him twice)  CHECK: 400
// TC-05 BUG-API-022: an inactive driver as the rescuer (the web app only offers drivers who are not inactive)
//                                                                                                      CHECK: 400
// TC-06 BUG-API-017: editing a rescue changes its "updated_at"                                         CHECK: changed
//
// Drivers: Casey Brooks (38315, the rescuer) and Jordan Whitaker (38267, the receiver), test drivers whose phones and
// emails reach no real person; 38272 is a test driver deactivated by the Add Driver tests.
// Every test deletes its rescues (daily regression only: @adds-data).

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const daysAgo = require('../../../api/dates');

// ---------- Journeys ----------

test(
  'TC-01: Verify that a rescue added by the manager is counted as completed and listed in the rescue report',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(1); // this test's own day

    // Before: the dashboard's rescues of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.rescue;

    // 1. Manager: Add New Rescue -> Rescuer, Receiver, packages, stops, reason -> Save Changes
    const addResponse = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker', // the receiver
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date,
            reason:
              'Van broke down on route DYY1-14, Casey took the last 18 stops.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(addResponse);

    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    expect(added.message).toBe('Rescue data saved successfully');
    const rescue = added.data[0];
    expect(rescue.date).toBe(date + 'T00:00:00.000Z');
    expect(rescue.caller_id).toBe(38267); // numbers in this API
    expect(rescue.rescuer_id).toBe(38315);
    expect(rescue.metrics.status).toBe('Completed');
    expect(rescue.metrics.number_of_packages).toBe(42);
    expect(rescue.metrics.number_of_stops).toBe(18);

    // 2. Rescue screen: the list of that day shows it
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((item) => item._id);
    expect(listIds).toContain(rescue._id);

    // 3. Dashboard: one more completed rescue
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    expect(dashboard.data.team.rescue.completed).toBe(before.completed + 1);
    expect(dashboard.data.team.rescue.refused).toBe(before.refused);

    // 4. Dashboard: the rescue report of that day (a click on the rescue number) lists it
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: { start: date, end: date, report_name: 'rescueReport' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).toContain(rescue._id);

    // 5. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.rescue, {
      headers,
      params: {
        _id: rescue._id,
        rescuer_id: '38315',
        caller_id: '38267',
        date: rescue.date,
      },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

test(
  'TC-02: Verify that a rescue changed to "Refuse" moves from completed to refused on the dashboard',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(2); // this test's own day

    // 1. Manager: adds a rescue ("Completed")
    const addResponse = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '30',
            number_of_stops: '12',
            status: 'Completed',
            date,
            reason: 'Jordan was behind schedule on route DYY1-22.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(addResponse);
    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const rescue = added.data[0];

    // Before the edit: the dashboard's rescues of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.rescue;

    // 2. Manager: Start Editing -> Status "Refuse" -> Save Changes (the web app sends the whole row)
    const editResponse = await request.patch(endpoints.rescue, {
      headers,
      data: {
        updateData: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            status: 'Refuse',
            number_of_packages: 30,
            number_of_stops: 12,
            reason:
              'Jordan was behind schedule on route DYY1-22. Casey could not take the stops.',
            _id: rescue._id,
            date: rescue.date,
            caller_id: rescue.caller_id,
            rescuer_id: rescue.rescuer_id,
          },
        ],
      },
    });
    await addToReport(editResponse);

    expect(editResponse.status()).toBe(200);
    const edited = await editResponse.json();
    expect(edited.message).toBe('Rescue data updated successfully');

    // 3. Rescue screen: the rescue shows "Refuse"
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const changed = list.data.find((item) => item._id === rescue._id);
    expect(changed.metrics.status).toBe('Refuse');

    // 4. Dashboard: one completed less, one refused more
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    expect(dashboard.data.team.rescue.completed).toBe(before.completed - 1);
    expect(dashboard.data.team.rescue.refused).toBe(before.refused + 1);

    // 5. Clean up: the manager deletes it
    const deleteResponse = await request.delete(endpoints.rescue, {
      headers,
      params: {
        _id: rescue._id,
        rescuer_id: '38315',
        caller_id: '38267',
        date: rescue.date,
      },
    });
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
  },
);

test(
  'TC-03: Verify that a deleted rescue is no longer shown or counted',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(3); // this test's own day

    // 1. Manager: adds a rescue
    const addResponse = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '25',
            number_of_stops: '9',
            status: 'Completed',
            date,
            reason: 'Flat tire on route DYY1-31.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(addResponse);
    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    const rescue = added.data[0];

    // Before the delete: the dashboard's rescues of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.rescue;

    // 2. Manager: Delete (bin icon). The web app sends the id, both drivers and the saved date.
    const deleteResponse = await request.delete(endpoints.rescue, {
      headers,
      params: {
        _id: rescue._id,
        rescuer_id: '38315',
        caller_id: '38267',
        date: rescue.date,
      },
    });
    await addToReport(deleteResponse);

    expect(deleteResponse.status()).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.message).toBe('Rescue data deleted successfully');

    // 3. Rescue screen and the rescue report: the rescue is gone
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((item) => item._id);
    expect(listIds).not.toContain(rescue._id);

    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: { start: date, end: date, report_name: 'rescueReport' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).not.toContain(rescue._id);

    // 4. Dashboard: one completed rescue less
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();
    expect(dashboard.data.team.rescue.completed).toBe(before.completed - 1);
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------
// While a bug is open the rescue is saved, so each test first deletes the rescues it saved on its own day, then
// checks.

test(
  'TC-04: Verify that a driver cannot rescue himself (BUG-API-022)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(4); // this test's own day

    // Jordan Whitaker as rescuer and receiver (in the web app, the Receiver list does not offer the rescuer)
    const response = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Jordan Whitaker',
            caller_id: '38267',
            rescuer_id: '38267',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date,
            reason: 'Rescue of himself.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(response);

    // Clean up first: delete the rescues of that day where Jordan Whitaker is the rescuer
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const saved = list.data.filter((item) => item.rescuer_id === 38267);
    for (const item of saved) {
      const deleteResponse = await request.delete(endpoints.rescue, {
        headers,
        params: {
          _id: item._id,
          rescuer_id: '38267',
          caller_id: String(item.caller_id),
          date: item.date,
        },
      });
      await addToReport(deleteResponse);
    }

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-05: Verify that an inactive driver cannot be the rescuer (BUG-API-022)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(5); // this test's own day

    // 38272: a test driver deactivated by the Add Driver tests (the web app only offers drivers who are not inactive)
    const response = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Inactive test driver',
            caller_id: '38267',
            rescuer_id: '38272',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date,
            reason: 'Rescue by an inactive driver.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(response);

    // Clean up first: delete the rescues of that day by driver 38272
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const saved = list.data.filter((item) => item.rescuer_id === 38272);
    for (const item of saved) {
      const deleteResponse = await request.delete(endpoints.rescue, {
        headers,
        params: {
          _id: item._id,
          rescuer_id: '38272',
          caller_id: String(item.caller_id),
          date: item.date,
        },
      });
      await addToReport(deleteResponse);
    }

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-06: Verify that editing a rescue changes its "updated_at" time (BUG-API-017)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(6); // this test's own day

    const addResponse = await request.post(endpoints.rescue, {
      headers,
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '20',
            number_of_stops: '8',
            status: 'Completed',
            date,
            reason: 'Late start on route DYY1-05.',
            is_caller_empty: false,
            is_rescuer_empty: false,
          },
        ],
      },
    });
    await addToReport(addResponse);
    const added = await addResponse.json();
    const rescue = added.data[0];

    // Start Editing -> 10 stops instead of 8 -> Save Changes
    const editResponse = await request.patch(endpoints.rescue, {
      headers,
      data: {
        updateData: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            status: 'Completed',
            number_of_packages: 20,
            number_of_stops: 10,
            reason: 'Late start on route DYY1-05.',
            _id: rescue._id,
            date: rescue.date,
            caller_id: rescue.caller_id,
            rescuer_id: rescue.rescuer_id,
          },
        ],
      },
    });
    await addToReport(editResponse);
    expect(editResponse.status()).toBe(200);

    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { date },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const edited = list.data.find((item) => item._id === rescue._id);

    // Clean up first, then check
    const deleteResponse = await request.delete(endpoints.rescue, {
      headers,
      params: {
        _id: rescue._id,
        rescuer_id: '38315',
        caller_id: '38267',
        date: rescue.date,
      },
    });
    await addToReport(deleteResponse);

    expect(edited.metrics.number_of_stops).toBe(10);
    expect(edited.updated_at).not.toBe(rescue.updated_at);
  },
);
