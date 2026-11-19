const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const driverCurrentScorecardGraphSchema = require('../../../schemas/driver-current-scorecard-graph.schema');

// Driver graph API: GET /lmd/prfsrv/graph/v2/driver_current_scorecard_graph?transporter_id=...&field=...&range=6&week_number=YYYYWW
// Not used by the web app (2026-09-24): parameters from Swagger, answers checked on staging. -0.01 means "no data"
// Driver A39FCSHRDP87JW (station DYY1) has a scorecard in weeks 31, 32 and 34 of 2026

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the Delivered graph of a driver is returned for 6 weeks',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('ok');
    expect(body.action).toBe('get_report');
    expect(body.field).toBe('delivered');
    // The 6 weeks that end with the selected week
    expect(Object.keys(body.data)).toEqual([
      '202629',
      '202630',
      '202631',
      '202632',
      '202633',
      '202634',
    ]);
    // The driver delivered 1132 packages in week 34 of 2026
    expect(body.data['202634']).toBe('1132');
  },
);

test(
  'TC-02: Verify that driver graph response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, driverCurrentScorecardGraphSchema)).toBe(
      'No errors',
    );
  },
);

test(
  'TC-03: Verify that a percentage metric (pod) is returned as text with %',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'pod',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.field).toBe('pod');
    expect(body.data['202634']).toBe('100.0%');
  },
);

test(
  'TC-04: Verify that range=4 returns the last 4 weeks',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '4',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Object.keys(body.data)).toEqual([
      '202631',
      '202632',
      '202633',
      '202634',
    ]);
  },
);

test(
  'TC-05: Verify that a week without data returns -0.01 (no data)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202001',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data['202001']).toBe(-0.01);
  },
);

// ---------- Missing input (400) ----------

test(
  'TC-06: Verify that missing transporter_id returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'delivered', range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-07: Verify that missing field returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        range: '6',
        week_number: '202634',
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
  'TC-08: Verify that empty field returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: '',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-09: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: { 'x-access-user': user.account_id },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
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
  'TC-10: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: { 'x-access-token': user.token },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
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
  'TC-11: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
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
  'TC-12: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
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
  'TC-13: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202634',
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
  'TC-14: Verify that an unknown field (xyz) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'xyz',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-15: Verify that range=0 is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '0',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-16: Verify that text as range (abc) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: 'abc',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-17: Verify that text as week_number (abc) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: 'abc',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to Number failed');
  },
);

test(
  'TC-18: Verify that an impossible week (week 99) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCurrentScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 'delivered',
        range: '6',
        week_number: '202699',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);
