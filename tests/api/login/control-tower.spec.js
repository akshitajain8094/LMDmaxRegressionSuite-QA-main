const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');

// Control Tower sign-in: login.lmdmax.com opens the Performance app with a login_id instead of a password
// POST /lmd/usrsrv/control_tower/v1/sign_in_by_login_id, and its logout control_tower_logout

test(
  'TC-01: Verify that an unknown login_id gives no login',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.controlTowerSignIn, {
      data: {
        login_id: 'invalid-login-id',
        app_name: 'perf_login',
        company_id: process.env.TEST_STATION_ID,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('No sessions found');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-02: Verify that a sign-in without login_id gives no login',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.controlTowerSignIn, {
      data: {},
    });
    await addToReport(response);

    // Today 409 "params missing" (400 would be clearer: SUG-API-011)
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-03: Verify that a login_id sent as an object (NoSQL injection) gives no login',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.controlTowerSignIn, {
      data: {
        login_id: { $ne: '' },
        app_name: 'perf_login',
        company_id: process.env.TEST_STATION_ID,
      },
    });
    await addToReport(response);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-04: Verify that the Control Tower logout needs a login (BUG-API-028)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    // No x-access-token / x-access-user, and a login_id of nobody
    const response = await request.post(endpoints.controlTowerLogout, {
      data: { login_id: 'invalid-login-id' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
  },
);
