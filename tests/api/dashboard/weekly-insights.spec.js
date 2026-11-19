const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const weeklyInsightsSchema = require('../../../schemas/weekly-insights.schema');

// Weekly insights API: GET /dashboard/v1/weekly_insights?start=YYYYWW&end=YYYYWW&type=dsp ("Smart Insights" on the Your Scorecard tab)
// start and end are week numbers (e.g. 202634), not dates as Swagger says: BUG-API-011

// ---------- Valid requests ----------

test(
  'TC-01: Verify that DSP insights are returned for a week',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('weekly_insights');
    // The test company has a scorecard for week 34 of 2026
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].title).toBeTruthy();
    expect(body.data[0].description).toBeTruthy();
  },
);

test(
  'TC-02: Verify that weekly insights response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, weeklyInsightsSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that insights are returned for a 10-week range (Compare with 10 Weeks)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202625', end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('ok');
    expect(body.data.length).toBeGreaterThan(0);
  },
);

// ---------- Missing weeks (400) ----------

test(
  'TC-04: Verify that missing start returns "Params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Params missing');
  },
);

test(
  'TC-05: Verify that missing end returns "Params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Params missing');
  },
);

test(
  'TC-06: Verify that empty start and end return "Params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '', end: '', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Params missing');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-07: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: { 'x-access-user': user.account_id },
      params: { start: '202634', end: '202634', type: 'dsp' },
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

    const response = await request.get(endpoints.weeklyInsights, {
      headers: { 'x-access-token': user.token },
      params: { start: '202634', end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-09: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-10: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: { start: '202634', end: '202634', type: 'dsp' },
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
  'TC-11: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634', type: 'dsp' },
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
  'TC-12: Verify that missing type is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-13: Verify that unknown type is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202634', type: 'xyz' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-14: Verify that text as week (abc) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: 'abc', end: 'xyz', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-15: Verify that a date (2026-08-17, as Swagger says) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-17', end: '2026-08-23', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-16: Verify that an impossible week (week 99) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202699', end: '202699', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-17: Verify that a week without data does not return a server crash message (BUG-API-004)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202601', end: '202601', type: 'dsp' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.message).not.toContain('Cannot read properties');
  },
);

test(
  'TC-18: Verify that a future week does not return a server crash message (BUG-API-004)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '203001', end: '203001', type: 'dsp' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.message).not.toContain('Cannot read properties');
  },
);

test(
  'TC-19: Verify that end week before start week is rejected (BUG-API-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.weeklyInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '202634', end: '202625', type: 'dsp' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);
