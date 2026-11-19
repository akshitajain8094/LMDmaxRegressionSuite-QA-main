const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const dailyInsightsSchema = require('../../../schemas/daily-insights.schema');

// Daily insights API: GET /dashboard/v1/daily_insights?start=YYYY-MM-DD&end=YYYY-MM-DD&type=dsp ("Smart Insights" panel)
// On a dashboard card the web app sends type=drivers&report_name=... instead of type=dsp

// ---------- Valid requests ----------

test(
  'TC-01: Verify that DSP insights are returned for a date range',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('daily_insights');
    // The test company has insights in this period
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title).toBeTruthy();
    expect(body.data[0].description).toBeTruthy();
  },
);

test(
  'TC-02: Verify that daily insights response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, dailyInsightsSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that driver insights are returned for a report (writeupReport)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        type: 'drivers',
        report_name: 'writeupReport',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    // The test company has write-ups in this period
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title).toBeTruthy();
  },
);

test(
  'TC-04: Verify that a period without data returns an empty list',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2030-01-01', end: '2030-12-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  },
);

// ---------- Missing or invalid dates (400) ----------

test(
  'TC-05: Verify that missing start returns "start and end are required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('start and end are required');
  },
);

test(
  'TC-06: Verify that missing end returns "start and end are required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('start and end are required');
  },
);

test(
  'TC-07: Verify that empty start and end return "start and end are required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '', end: '', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('start and end are required');
  },
);

test(
  'TC-08: Verify that non-date text returns "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: 'abc', end: 'xyz', type: 'dsp' },
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
  'TC-09: Verify that impossible dates (2026-02-30, 2026-13-45) return "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-02-30', end: '2026-13-45', type: 'dsp' },
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
  'TC-10: Verify that wrong date format (DD-MM-YYYY) returns "Invalid start or end date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '01-09-2025', end: '31-08-2026', type: 'dsp' },
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
  'TC-11: Verify that end before start returns "End date must be the same or after start date."',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-31', end: '2025-09-01', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('End date must be the same or after start date.');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-12: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: { 'x-access-user': user.account_id },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-13: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: { 'x-access-token': user.token },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-14: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-15: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
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
  'TC-16: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'dsp' },
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
  'TC-17: Verify that missing type is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
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
  },
);

test(
  'TC-18: Verify that unknown type is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'xyz' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-19: Verify that type=drivers without report_name is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31', type: 'drivers' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-20: Verify that unknown report_name is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dailyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        start: '2025-09-01',
        end: '2026-08-31',
        type: 'drivers',
        report_name: 'xyz',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);
