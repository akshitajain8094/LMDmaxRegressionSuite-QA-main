const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const leaderboardDashboardSchema = require('../../../schemas/leaderboard-dashboard.schema');

// Leaderboard API: GET /lmd/prfsrv/compare/v3/dashboard (the driver table on the Leaderboard tab, no parameters)
// Ranks and ratings change with driver activity, so these tests check the structure, not exact values

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the leaderboard list of drivers is returned',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
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
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBeTruthy();
  },
);

test(
  'TC-02: Verify that leaderboard response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, leaderboardDashboardSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that the list has active and inactive drivers (the page filters them)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Only the statuses, so a failure does not print drivers' personal data
    const statuses = body.data.map((driver) => driver.status);
    expect(statuses).toContain('active');
    expect(statuses).toContain('inactive');
  },
);

test(
  'TC-04: Verify that at least one driver has a rank and a rating',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Only the ranks and ratings, so a failure does not print drivers' personal data
    const ranks = body.data.map((driver) => driver.rank);
    const ratings = body.data.map((driver) => driver.rating);
    expect(ranks).toContainEqual(expect.any(Number));
    expect(ratings).toContainEqual(expect.any(Number));
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-05: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
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
  'TC-06: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
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
  'TC-07: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
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
  'TC-08: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
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
  'TC-09: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.leaderboardDashboard, {
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

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-10: Verify that the leaderboard starts at rank 1 (BUG-API-006)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.leaderboardDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Only the ranks, so a failure does not print drivers' personal data
    const ranks = body.data.map((driver) => driver.rank);
    expect(ranks).toContain(1);
  },
);
