const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const dashboardDataWeeklySchema = require('../../../schemas/dashboard-data-weekly.schema');

// Dashboard weekly API: GET /dashboard/v1/dashboard_data_weekly?week_number=YYYYWW&compare_with=4|6|8|10 ("Your Scorecard" tab)

// ---------- Valid requests ----------

test(
  'TC-01: Verify that scorecard data is returned for a week',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('get_report');
    expect(body.week).toBe('202634');
    expect(Object.keys(body.data)).toEqual([
      'safety_and_compliance',
      'quality',
      'service_reliability',
    ]);
    // The test company has a scorecard for week 34 of 2026
    expect(body.data.safety_and_compliance[0].key).toBe('overall_standing');
    expect(body.data.safety_and_compliance[0].value).toBeTruthy();
  },
);

test(
  'TC-02: Verify that weekly response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, dashboardDataWeeklySchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that without week_number the latest week is returned',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.week).toBeTruthy();
    expect(body.data).toHaveProperty('safety_and_compliance');
    expect(body.data).toHaveProperty('quality');
    expect(body.data).toHaveProperty('service_reliability');
  },
);

test(
  'TC-04: Verify that compare_with=10 returns value, change and color',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634', compare_with: '10' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(body.data.safety_and_compliance[0].key).toBe('overall_standing');
    expect(typeof body.data.safety_and_compliance[0].value).toBe('number');
    expect(typeof body.data.safety_and_compliance[0].change).toBe('number');
    expect(body.data.safety_and_compliance[0].color).toBeTruthy();
  },
);

test(
  'TC-05: Verify that compare_with=4 returns value, change and color',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634', compare_with: '4' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(typeof body.data.safety_and_compliance[0].value).toBe('number');
    expect(typeof body.data.safety_and_compliance[0].change).toBe('number');
  },
);

test(
  'TC-06: Verify that empty week_number returns the latest week',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.week).toBeTruthy();
  },
);

// ---------- Weeks without data (400) ----------

test(
  'TC-07: Verify that a week without data returns "No data found for the specified week"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202601' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('No data found for the specified week');
  },
);

test(
  'TC-08: Verify that a future week returns "No data found for the specified week"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '203001' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('No data found for the specified week');
  },
);

test(
  'TC-09: Verify that an impossible week (week 99) returns "No data found for the specified week"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202699' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('No data found for the specified week');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-10: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: { 'x-access-user': user.account_id },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-11: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: { 'x-access-token': user.token },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-12: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-13: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe(
      'Failed to authenticate token at Lv1, session not found',
    );
  },
);

// ---------- Wrong HTTP method ----------

test(
  'TC-14: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '202634' },
    });
    await addToReport(response);

    // Ideally 405 Method Not Allowed (SUG-API-001)
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-15: Verify that text as week_number (abc) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: 'abc' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-16: Verify that a date-like week_number (2026-34) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDataWeekly, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { week_number: '2026-34' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);
