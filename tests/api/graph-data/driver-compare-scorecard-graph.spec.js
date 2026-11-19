const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const driverCompareScorecardGraphSchema = require('../../../schemas/driver-compare-scorecard-graph.schema');

// Driver graph API: GET /lmd/prfsrv/graph/v2/driver_compare_scorecard_graph?transporter_id=...&field=...&range=6&week_number=YYYYWW
// ("Weekly Scorecard Trend" on a driver's Weekly page). One { current, trailing } per week; -0.01 means "no data"
// Driver A39FCSHRDP87JW (station DYY1) has a scorecard in weeks 31, 32 and 34 of 2026. No DYY1 driver has trailing data.

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the Delivered graph of a driver is returned for 6 weeks',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
    // The 6 weeks that end with the selected week, then the field name
    expect(Object.keys(body.data)).toEqual([
      '202629',
      '202630',
      '202631',
      '202632',
      '202633',
      '202634',
      'field',
    ]);
    expect(body.data.field).toBe('delivered');
    // The driver delivered 1132 packages in week 34 of 2026
    expect(body.data['202634'].current).toBe('1132');
  },
);

test(
  'TC-02: Verify that driver graph response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
    expect(getSchemaErrors(body, driverCompareScorecardGraphSchema)).toBe(
      'No errors',
    );
  },
);

test(
  'TC-03: Verify that the first graph of the page (S No., field s_no) is returned',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: 'A39FCSHRDP87JW',
        field: 's_no',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.field).toBe('s_no');
    expect(body.data['202634'].current).toBe('80');
  },
);

test(
  'TC-04: Verify that a percentage metric (pod) is returned as text with %',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
    expect(body.data.field).toBe('pod');
    expect(body.data['202634'].current).toBe('100.0%');
  },
);

test(
  'TC-05: Verify that range=4 returns the last 4 weeks',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
      'field',
    ]);
  },
);

test(
  'TC-06: Verify that a week without data returns -0.01 (no data)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
    expect(body.data['202001'].current).toBe(-0.01);
    expect(body.data['202001'].trailing).toBe(-0.01);
  },
);

// ---------- Missing input (400) ----------

test(
  'TC-07: Verify that missing transporter_id returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
  'TC-08: Verify that empty transporter_id returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        transporter_id: '',
        field: 'delivered',
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

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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

    const response = await request.post(endpoints.driverCompareScorecardGraph, {
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
  'TC-14: Verify that missing field returns "params missing" (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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

    // driver_current_scorecard_graph already does this
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-15: Verify that an unknown field (xyz) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
  'TC-16: Verify that range=0 is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
  'TC-17: Verify that text as range (abc) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
  'TC-18: Verify that text as week_number (abc) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
  'TC-19: Verify that an impossible week (week 99) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverCompareScorecardGraph, {
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
