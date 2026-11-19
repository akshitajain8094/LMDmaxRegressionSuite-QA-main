const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const leaderboardInsightsSchema = require('../../../schemas/leaderboard-insights.schema');

// Leaderboard insights API: GET /lmd/prfsrv/compare/v3/insights (the 3 Smart Insights on the Leaderboard tab, no parameters)
// Each insight is a rank change of one driver, or null when there is none right now

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the three leaderboard insights are returned',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Success');
    expect(body.action).toBe('driver_dashboard_controller');
    expect(body.data).toHaveProperty('performance_spike');
    expect(body.data).toHaveProperty('huge_rank_drop');
    expect(body.data).toHaveProperty('consistent_topper');
  },
);

test(
  'TC-02: Verify that leaderboard insights response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, leaderboardInsightsSchema)).toBe('No errors');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-03: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: { 'x-access-user': user.account_id },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-04: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: { 'x-access-token': user.token },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-05: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
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
  'TC-06: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardInsights, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
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
  'TC-07: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.leaderboardInsights, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    // Ideally 405 Method Not Allowed (SUG-API-001)
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);
