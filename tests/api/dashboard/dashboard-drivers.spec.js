const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const dashboardDriversSchema = require('../../../schemas/dashboard-drivers.schema');

// Dashboard drivers API: GET /dashboard/v1/dashboard_drivers (the list behind each dashboard card)

// ---------- Valid requests ----------

test(
  'TC-01: Verify that write-up drivers are returned for a valid date range',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('get_drivers_by_report_and_metric');
    // The test user has write-ups in this period
    expect(body.data.length).toBeGreaterThan(0);
  },
);

test(
  'TC-02: Verify that dashboard drivers response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, dashboardDriversSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that callOutReport returns a list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'callOutReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
  },
);

test(
  'TC-04: Verify that rescueReport returns a list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'rescueReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
  },
);

test(
  'TC-05: Verify that deliveryConcessions returns a list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'deliveryConcessions',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
  },
);

test(
  'TC-06: Verify that qualityReport returns a list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'qualityReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(Array.isArray(body.data)).toBe(true);
  },
);

test(
  'TC-07: Verify that workingDeviceReport returns reports and vehicles',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'workingDeviceReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(body.data).toHaveProperty('reports');
    expect(body.data).toHaveProperty('vehicles');
  },
);

test(
  'TC-08: Verify that deliveryReport returns quality and delivery lists',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'deliveryReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(body.data).toHaveProperty('quality');
    expect(body.data).toHaveProperty('delivery');
  },
);

// ---------- Missing or invalid input (400) ----------

test(
  'TC-09: Verify that missing report_name returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-10: Verify that unknown report_name returns "Invalid report_name"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', report_name: 'xyz' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid report_name');
  },
);

test(
  'TC-11: Verify that report_name is case-sensitive',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupreport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Invalid report_name');
  },
);

test(
  'TC-12: Verify that missing start returns "start and end are required for daily reports"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { end: '2026-08-31', report_name: 'writeupReport' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('start and end are required for daily reports');
  },
);

test(
  'TC-13: Verify that missing end returns "start and end are required for daily reports"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', report_name: 'writeupReport' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('start and end are required for daily reports');
  },
);

test(
  'TC-14: Verify that missing start and end returns "start and end are required for daily reports"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { report_name: 'writeupReport' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('start and end are required for daily reports');
  },
);

test(
  'TC-15: Verify that empty start and end return "start and end are required for daily reports"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '', end: '', report_name: 'writeupReport' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('start and end are required for daily reports');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-16: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: { 'x-access-user': user.account_id },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-17: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: { 'x-access-token': user.token },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-18: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-19: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
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
  'TC-20: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        report_name: 'writeupReport',
      },
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
  'TC-21: Verify that wrong date format (DD-MM-YYYY) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '01-09-2025',
        end: '31-08-2026',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-22: Verify that impossible dates (2026-02-30, 2026-13-45) return a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2026-02-30',
        end: '2026-13-45',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid start or end date. Expected format: YYYY-MM-DD',
    );
  },
);

test(
  'TC-23: Verify that end before start is rejected (BUG-API-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2026-08-31',
        end: '2025-09-01',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('End date must be the same or after start date.');
  },
);
