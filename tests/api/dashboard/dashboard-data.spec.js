const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const dashboardSchema = require('../../../schemas/dashboard-data.schema');

// Dashboard data API: GET /dashboard/v1/dashboard_data?start=YYYY-MM-DD&end=YYYY-MM-DD

// ---------- Valid requests ----------

test(
  'TC-01: Verify that proper dashboard data is returned for a valid date range',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('get_dashboard_data');
    // data has exactly these three parts, in this order
    expect(Object.keys(body.data)).toEqual(['safety', 'quality', 'team']);
    // The test user has write-ups in this period
    expect(body.data.team.writeup.total).toBeGreaterThan(0);
  },
);

test(
  'TC-02: Verify that dashboard response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, dashboardSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that every safety metric is returned with a total and correct label',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    // Each metric must have a number as "total" and its own name as "label"
    expect(body.data.safety).toMatchObject({
      'Sign/Signal Violations': {
        total: expect.any(Number),
        label: 'Sign/Signal Violations',
      },
      'Driver Distraction': {
        total: expect.any(Number),
        label: 'Driver Distraction',
      },
      'Following Distance': {
        total: expect.any(Number),
        label: 'Following Distance',
      },
      'Speeding Violations': {
        total: expect.any(Number),
        label: 'Speeding Violations',
      },
      'Seatbelt Compliance': {
        total: expect.any(Number),
        label: 'Seatbelt Compliance',
      },
      Acceleration: { total: expect.any(Number), label: 'Acceleration' },
      Braking: { total: expect.any(Number), label: 'Braking' },
      Cornering: { total: expect.any(Number), label: 'Cornering' },
      Speeding: { total: expect.any(Number), label: 'Speeding' },
      Distraction: { total: expect.any(Number), label: 'Distraction' },
      Seatbelt: { total: expect.any(Number), label: 'Seatbelt' },
      Total: { total: expect.any(Number), label: 'Total' },
    });
  },
);

test(
  'TC-04: Verify that every quality and team metric is returned',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.data.quality).toHaveProperty('DSB DNR');
    expect(body.data.quality).toHaveProperty('packages_delivered');
    expect(body.data.quality).toHaveProperty('dcr');
    expect(body.data.quality).toHaveProperty('pod');
    expect(body.data.quality).toHaveProperty('customer_negative_feedback');
    expect(body.data.team).toHaveProperty('writeup');
    expect(body.data.team).toHaveProperty('working_devices');
    expect(body.data.team).toHaveProperty('callouts');
    expect(body.data.team).toHaveProperty('rescue');
    expect(body.data.team).toHaveProperty('acknowledgement');
  },
);

test(
  'TC-05: Verify that same start and end date returns dashboard data',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-01-15', end: '2026-01-15' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
  },
);

test(
  'TC-06: Verify that a future date range returns data with zero totals',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2030-01-01', end: '2030-12-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.safety.Total.total).toBe(0);
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-07: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: { 'x-access-user': user.account_id },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-08: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: { 'x-access-token': user.token },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-09: Verify that request without any auth headers returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.get(endpoints.dashboardData, {
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-10: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-11: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: { start: '2025-09-01', end: '2026-08-31' },
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
  'TC-12: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    // Ideally 405 Method Not Allowed (SUG-API-001)
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);

// ---------- Missing or invalid dates (400) ----------

test(
  'TC-13: Verify that missing start returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
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
  'TC-14: Verify that missing end returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-15: Verify that missing start and end are rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-16: Verify that empty start and end return "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '', end: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-17: Verify that wrong date format (DD-MM-YYYY) returns "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Must be DD-MM-YYYY: US dates (MM-DD-YYYY) are valid
    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '01-09-2025', end: '31-08-2026' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-18: Verify that non-date text returns "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: 'abc', end: 'xyz' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-19: Verify that impossible dates (2026-02-30, 2026-13-45) return "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-02-30', end: '2026-13-45' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-20: Verify that end before start returns "End date must be the same or after start date."',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardData, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-31', end: '2025-09-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('End date must be the same or after start date.');
  },
);
