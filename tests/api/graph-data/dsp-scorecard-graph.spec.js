const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const dspScorecardGraphSchema = require('../../../schemas/dsp-scorecard-graph.schema');

// DSP scorecard graph API: GET /lmd/prfsrv/graph/v2/dsp_scorecard_graph?field=...&range=6&week_number=YYYYWW (chart on the Your Scorecard tab)
// The answer has one value per week; -0.01 means "no data for that week"

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the Safety and Compliance graph is returned for 6 weeks',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
    expect(body.field).toBe('safety_and_compliance');
    // The 6 weeks that end with the selected week
    expect(Object.keys(body.data)).toEqual([
      '202629',
      '202630',
      '202631',
      '202632',
      '202633',
      '202634',
    ]);
    // The test company has a scorecard for week 34 of 2026
    expect(body.data['202634']).toBe('Fantastic');
  },
);

test(
  'TC-02: Verify that graph response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, dspScorecardGraphSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that range=4 returns the last 4 weeks',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-04: Verify that the overall standing graph is returned for 10 weeks (Compare with 10 Weeks)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'overall_standing', range: '10', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.field).toBe('overall_standing');
    expect(Object.keys(body.data)).toHaveLength(10);
    expect(body.data['202634']).toContain('Fantastic');
  },
);

test(
  'TC-05: Verify that the Quality tab graph (delivery_quality) is returned',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'delivery_quality', range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.field).toBe('delivery_quality');
    expect(body.data['202634']).toBe('Fantastic');
  },
);

test(
  'TC-06: Verify that the Service Reliability tab graph is returned',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'service_reliability',
        range: '6',
        week_number: '202634',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.field).toBe('service_reliability');
    expect(body.data['202634']).toBe('Fantastic');
  },
);

test(
  'TC-07: Verify that a metric graph (seatbelt_off_rate) shows events per 100 trips',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'seatbelt_off_rate', range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.field).toBe('seatbelt_off_rate');
    expect(body.data['202634']).toContain('events per 100 trips');
  },
);

test(
  'TC-08: Verify that a week without data returns -0.01 (no data)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
        range: '6',
        week_number: '202601',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data['202601']).toBe(-0.01);
  },
);

// ---------- Missing input (400) ----------

test(
  'TC-09: Verify that missing field returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-10: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: { 'x-access-user': user.account_id },
      params: {
        field: 'safety_and_compliance',
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
  'TC-11: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: { 'x-access-token': user.token },
      params: {
        field: 'safety_and_compliance',
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
  'TC-12: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-13: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: {
        field: 'safety_and_compliance',
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
  'TC-14: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-15: Verify that an unknown field (xyz) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'xyz', range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-16: Verify that Swagger example field "score" is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { field: 'score', range: '6', week_number: '202634' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-17: Verify that range=0 is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-18: Verify that text as range (abc) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-19: Verify that text as week_number (abc) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
  'TC-20: Verify that an impossible week (week 99) is rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.dspScorecardGraph, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: {
        field: 'safety_and_compliance',
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
