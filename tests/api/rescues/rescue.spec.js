// Rescue APIs one by one (Data Management -> Rescue). None of these tests saves a rescue: every Save, Edit or Delete
// below has a missing or wrong value, so the API refuses it. The journeys are in rescue-journeys.spec.js.
//
// WHAT IS CHECKED
// Rescue lists (read only, station DYY1)
//   TC-01 The Rescue screen of one day                    CHECK: only rescues of that day
//   TC-02 The list of August 2026                         CHECK: matches the expected schema
//   TC-03 August 2026 on three screens: the Rescue list,  CHECK: the same number of rescues, completed and
//         the dashboard and its rescue report                    refused
//   TC-04 A date range without its end                    CHECK: 400 "params missing"
//   TC-05 to TC-07 Known bugs: no date, an end before     CHECK: 400 (without internal error text)
//         the start, a DD-MM-YYYY date
// Save, Edit and Delete with a missing or wrong value (nothing is saved)
//   TC-08, TC-09 Save without rescues / with an empty list CHECK: 400 "Rescue data is required"
//   TC-10 to TC-12 Save without the rescuer, the receiver, CHECK: 400 and the missing field in the message
//         the date
//   TC-13 to TC-15 Known bugs: packages "abc", status      CHECK: 400 without internal error text
//         "Maybe", a DD-MM-YYYY date
//   TC-16, TC-17 Edit / Delete without a rescue            CHECK: 400 "Rescue data is required"
//   TC-18 Known bug: Delete a rescue that does not exist   CHECK: no internal error text
//   TC-19 Known bug: Edit a rescue that does not exist     CHECK: 404, not "updated successfully"
// Login and method
//   TC-20 to TC-22 No token, no account, a wrong token     CHECK: 401
//   TC-23 PUT (the web app never sends it)                 CHECK: 404 "API Not Found"

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const rescueListSchema = require('../../../schemas/rescue-list.schema');

// ---------- Rescue lists ----------

test(
  'TC-01: Verify that the Rescue screen of one day shows only the rescues of that day',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { date: '2026-08-13' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    const dates = body.data.map((rescue) => rescue.date);
    expect(dates.length).toBeGreaterThan(0);
    const otherDates = dates.filter(
      (date) => date !== '2026-08-13T00:00:00.000Z',
    );
    expect(otherDates).toHaveLength(0);
  },
);

test(
  'TC-02: Verify that the rescue list matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, rescueListSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that the Rescue list, the dashboard and the rescue report count the same rescues',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The rescues of August 2026
    const listResponse = await request.get(endpoints.rescue, {
      headers,
      params: { start: '2026-08-01', end: '2026-08-31' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const completedInList = list.data.filter(
      (rescue) => rescue.metrics.status === 'Completed',
    );
    const refusedInList = list.data.filter(
      (rescue) => rescue.metrics.status === 'Refuse',
    );

    // Dashboard: the rescue numbers of August 2026
    const dashboardResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: '2026-08-01', end: '2026-08-31' },
    });
    await addToReport(dashboardResponse);
    const dashboard = await dashboardResponse.json();

    // Dashboard: the rescue report of August 2026 (a click on the rescue number)
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: {
        start: '2026-08-01',
        end: '2026-08-31',
        report_name: 'rescueReport',
      },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();

    expect(list.data.length).toBeGreaterThan(0);
    expect(dashboard.data.team.rescue.completed).toBe(completedInList.length);
    expect(dashboard.data.team.rescue.refused).toBe(refusedInList.length);
    expect(report.data).toHaveLength(list.data.length);
  },
);

test(
  'TC-04: Verify that a date range without an end returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
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
  'TC-05: Verify that the rescue list without a date is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The web app always sends a day (date) or a range (start and end)
    const response = await request.get(endpoints.rescue, {
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
  'TC-06: Verify that end before start is rejected (BUG-API-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-31', end: '2026-08-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-07: Verify that the rescue list with a wrong date format (DD-MM-YYYY) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { date: '13-08-2026' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to date failed');
  },
);

// ---------- Save, Edit and Delete with a missing or wrong value: nothing is saved ----------

test(
  'TC-08: Verify that Save without rescues returns "Rescue data is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
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
    expect(body.message).toBe('Rescue data is required');
  },
);

test(
  'TC-09: Verify that Save with an empty list returns "Rescue data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { rescue: [] },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Rescue data is required');
  },
);

test(
  'TC-10: Verify that a rescue without a rescuer returns "Missing required field: rescuer_id"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: '',
            caller_id: '38267',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date: '2026-09-21',
            reason: 'Van broke down on route DYY1-14.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Missing required field: rescuer_id');
  },
);

test(
  'TC-11: Verify that a rescue without a receiver returns "Missing required field: caller_id"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: '',
            rescuer_name: 'Casey Brooks',
            rescuer_id: '38315',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date: '2026-09-21',
            reason: 'Van broke down on route DYY1-14.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Missing required field: caller_id');
  },
);

test(
  'TC-12: Verify that a rescue without a date returns "Missing required field: date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            reason: 'Van broke down on route DYY1-14.',
          },
        ],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Missing required field: date');
  },
);

test(
  'TC-13: Verify that packages that are not a number return a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The web app only accepts digits in "No. of Packages"
    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: 'abc',
            number_of_stops: '18',
            status: 'Completed',
            date: '2026-09-21',
            reason: 'Van broke down on route DYY1-14.',
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
  'TC-14: Verify that a status other than Completed or Refuse returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Maybe', // the web app offers only Completed and Refuse
            date: '2026-09-21',
            reason: 'Van broke down on route DYY1-14.',
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
  'TC-15: Verify that a rescue with a wrong date format (DD-MM-YYYY) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        rescue: [
          {
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            caller_id: '38267',
            rescuer_id: '38315',
            number_of_packages: '42',
            number_of_stops: '18',
            status: 'Completed',
            date: '21-09-2026',
            reason: 'Van broke down on route DYY1-14.',
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
  'TC-16: Verify that Edit without a rescue returns "Rescue data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Rescue data is required');
  },
);

test(
  'TC-17: Verify that Delete without a rescue returns "Rescue data is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.delete(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Rescue data is required');
  },
);

test(
  'TC-18: Verify that deleting a rescue that does not exist returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.delete(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        _id: '6ab0000000000000000000aa', // no rescue has this id
        rescuer_id: '38315',
        caller_id: '38267',
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
  'TC-19: Verify that editing a rescue that does not exist returns 404 (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        updateData: [
          {
            _id: '6ab0000000000000000000aa', // no rescue has this id
            caller_name: 'Jordan Whitaker',
            rescuer_name: 'Casey Brooks',
            status: 'Refuse',
            caller_id: 38267,
            rescuer_id: 38315,
            date: '2026-09-21T00:00:00.000Z',
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
  'TC-20: Verify that the rescue list without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: { 'x-access-user': user.account_id },
      params: { date: '2026-08-13' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-21: Verify that the rescue list without x-access-user returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: { 'x-access-token': user.token },
      params: { date: '2026-08-13' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-22: Verify that the rescue list with an invalid token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescue, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { date: '2026-08-13' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-23: Verify that PUT on the rescue API is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.put(endpoints.rescue, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { rescue: [] },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);
