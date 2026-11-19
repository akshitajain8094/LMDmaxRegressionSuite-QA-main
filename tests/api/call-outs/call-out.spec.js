// Call-out APIs one by one (Data Management -> Callouts). None of these tests saves a call-out: every Save,
// Edit or Delete below has a missing or wrong value, so the API refuses it. The journeys are in
// call-out-journeys.spec.js.
//
// WHAT IS CHECKED
// Type list and call-out lists (read only, station DYY1)
//   TC-01 The "Callout Type" list of the station          CHECK: DYY1's types, e.g. Sick, Paid Time Off
//   TC-02 The Callouts screen of one day                   CHECK: only call-outs of that day
//   TC-03 The same list                                    CHECK: matches the expected schema
//   TC-04 A driver's profile: call-outs of August 2026     CHECK: only that driver's call-outs
//   TC-05 August 2026 on three screens: the Callouts list, CHECK: the same number of call-outs, excused and
//         the dashboard and its call-out report                  unexcused
//   TC-06, TC-07 A date range without its end / start      CHECK: 400 "params missing"
//   TC-08 to TC-10 Known bugs: no date, a DD-MM-YYYY date, CHECK: 400
//         an end before the start
// Save, Edit and Delete with a missing or wrong value (nothing is saved)
//   TC-11 to TC-15 Save without call-outs, with an empty   CHECK: 400 and the missing field in the message
//         list, without a driver, a date or a type
//   TC-16, TC-17 Known bugs: Save with a DD-MM-YYYY date,  CHECK: 400 without internal error text
//         Save with Excused? "Maybe"
//   TC-18, TC-19 Edit / Delete without a call-out          CHECK: 400 "CallOut data is required"
//   TC-20 Known bug: Delete a call-out that does not exist CHECK: no internal error text
//   TC-21 Known bug: Edit a call-out that does not exist   CHECK: 404, not "updated successfully"
// Login and method
//   TC-22 to TC-24 No token, no account, a wrong token     CHECK: 401
//   TC-25 PUT (the web app never sends it)                 CHECK: 404 "API Not Found"

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const callOutListSchema = require('../../../schemas/call-out-list.schema');

// ---------- Type list and call-out lists ----------

test(
  'TC-01: Verify that the call-out types of the station are returned (the "Callout Type" list)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOutTypes, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { type: 'callout' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Management data fetched successfully');
    expect(body.data[0].type).toBe('callout');
    expect(body.data[0].company_id).toBe('541');
    // Some of the types a manager can pick
    expect(body.data[0].options).toContain('Sick');
    expect(body.data[0].options).toContain('No Call No Show');
    expect(body.data[0].options).toContain('Paid Time Off');
  },
);

test(
  'TC-02: Verify that the Callouts screen of one day shows only the call-outs of that day',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { date: '2026-08-12' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('CallOut data fetched successfully');
    const dates = body.data.map((callOut) => callOut.date);
    expect(dates.length).toBeGreaterThan(0);
    const otherDates = dates.filter(
      (date) => date !== '2026-08-12T00:00:00.000Z',
    );
    expect(otherDates).toHaveLength(0);
  },
);

test(
  'TC-03: Verify that the call-out list matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, callOutListSchema)).toBe('No errors');
  },
);

test(
  "TC-04: Verify that a driver's profile shows only that driver's call-outs",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Driver profile -> call-outs of August 2026 (driver 36190 has call-outs in August)
    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2026-08-01',
        end: '2026-08-31',
        driver_id: '36190',
        company_id: '541',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    const driverIds = body.data.map((callOut) => callOut.driver_id);
    expect(driverIds.length).toBeGreaterThan(0);
    const otherDriverIds = driverIds.filter((driverId) => driverId !== 36190);
    expect(otherDriverIds).toHaveLength(0);
  },
);

test(
  'TC-05: Verify that the Callouts list, the dashboard and the call-out report count the same call-outs',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const august = { start: '2026-08-01', end: '2026-08-31' };

    // The call-outs of August 2026 (the list the Callouts screen and the reports use)
    const listResponse = await request.get(endpoints.callOut, {
      headers,
      params: august,
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const excusedInList = list.data.filter(
      (callOut) => callOut.metrics.excused === 'Yes',
    );
    const unexcusedInList = list.data.filter(
      (callOut) => callOut.metrics.excused === 'No',
    );

    // Dashboard: the call-out numbers of August 2026
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: august,
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();

    // Dashboard: the call-out report of August 2026 (a click on the call-out number)
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: {
        start: '2026-08-01',
        end: '2026-08-31',
        report_name: 'callOutReport',
      },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();

    expect(list.data.length).toBeGreaterThan(0);
    expect(dashboard.data.team.callouts.total).toBe(list.data.length);
    expect(dashboard.data.team.callouts.excused).toBe(excusedInList.length);
    expect(dashboard.data.team.callouts.unexcused).toBe(unexcusedInList.length);
    expect(report.data).toHaveLength(list.data.length);
  },
);

test(
  'TC-06: Verify that a date range without an end returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-07: Verify that a date range without a start returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-08: Verify that the call-out list without a date is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The web app always sends a day (date) or a range (start and end)
    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-09: Verify that a wrong date format (DD-MM-YYYY) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { date: '25-08-2026' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-10: Verify that end before start is rejected (BUG-API-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-31', end: '2026-08-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

// ---------- Save, Edit and Delete with a missing or wrong value: nothing is saved ----------

test(
  'TC-11: Verify that Save without call-outs returns "CallOut data is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('CallOut data is required');
  },
);

test(
  'TC-12: Verify that Save with an empty list returns "CallOut data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { callOut: [] },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('CallOut data is required');
  },
);

test(
  'TC-13: Verify that a call-out without a driver returns "Missing required field: driver_id"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'No',
            date: '2026-09-21',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Missing required field: driver_id');
  },
);

test(
  'TC-14: Verify that a call-out without a date returns "Missing required field: date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'No',
            driver_id: '38267',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Missing required field: date');
  },
);

test(
  'TC-15: Verify that a call-out without a type returns "Missing required field: callout_time"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            excused: 'No',
            driver_id: '38267',
            date: '2026-09-21',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Missing required field: callout_time');
  },
);

test(
  'TC-16: Verify that a call-out with a wrong date format (DD-MM-YYYY) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'No',
            driver_id: '38267',
            date: '21-09-2026',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to date failed');
  },
);

test(
  'TC-17: Verify that Excused? other than Yes or No returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'Maybe', // the web app offers only Yes and No
            driver_id: '38267',
            date: '2026-09-21',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('validation failed');
  },
);

test(
  'TC-18: Verify that Edit without a call-out returns "CallOut data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('CallOut data is required');
  },
);

test(
  'TC-19: Verify that Delete without a call-out returns "CallOut data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.delete(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('CallOut data is required');
  },
);

test(
  'TC-20: Verify that deleting a call-out that does not exist returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.delete(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        _id: '6ab0000000000000000000aa', // no call-out has this id
        driver_id: '38267',
        date: '2026-09-21',
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).not.toContain('Cannot read properties');
  },
);

test(
  'TC-21: Verify that editing a call-out that does not exist returns 404 (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        callOut: [
          {
            _id: '6ab0000000000000000000aa', // no call-out has this id
            name: 'Jordan Whitaker',
            callout_time: 'Sick',
            excused: 'Yes',
            driver_id: 38267,
            date: '2026-09-21T00:00:00.000Z',
            reason: 'Called at 5:40 AM: fever since last night.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
  },
);

// ---------- Login and method ----------

test(
  'TC-22: Verify that the call-out list without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: { 'x-access-user': user.account_id },
      params: { date: '2026-08-12' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-23: Verify that the call-out list without x-access-user returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: { 'x-access-token': user.token },
      params: { date: '2026-08-12' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-24: Verify that the call-out list with an invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.callOut, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { date: '2026-08-12' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-25: Verify that PUT on the call-out API is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.put(endpoints.callOut, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { callOut: [] },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);
