// Threshold APIs one by one (Settings -> Set Threshold). None of these tests changes a threshold: they read, or
// they send a request the API refuses. The journey (change and put back) is in threshold-journeys.spec.js.
//
// WHAT IS CHECKED
//   TC-01 The Scorecard thresholds of the station          CHECK: the 15 weekly metrics, e.g. FICO score, POD
//   TC-02 The same thresholds                              CHECK: match the expected schema
//   TC-03 Every other type of the web app (Daily Driver    CHECK: 200 and its own type
//         Scorecard, POD, Negative CDF, Delivery
//         Concession, DVIC, EOC)
//   TC-04 An unknown type                                  CHECK: 400 "invalid type: xyz"
//   TC-05 to TC-07 Save without a type, with an unknown    CHECK: 400 and a clear message
//         type, without data
//   TC-08, TC-09 Read / Save without login                 CHECK: 401

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const thresholdsSchema = require('../../../schemas/thresholds.schema');

test(
  'TC-01: Verify that the Scorecard thresholds of the station are returned',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Settings -> Set Threshold -> Scorecard (type "weekly")
    const response = await request.get(endpoints.thresholds + '/weekly', {
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
    expect(body.data.type).toBe('weekly');
    expect(body.data.company_id).toBe('541');
    const metrics = body.data.threshold.map((metric) => metric.field);
    expect(metrics).toHaveLength(15);
    expect(metrics).toContain('fico_score');
    expect(metrics).toContain('pod');
    expect(metrics).toContain('seatbelt_off_rate');
  },
);

test(
  'TC-02: Verify that the Scorecard thresholds match the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.thresholds + '/weekly', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, thresholdsSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that every other threshold type of the web app is returned with its own type',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Daily Driver Scorecard, POD, Negative CDF, Delivery Concession, DVIC Report, EOC Report
    for (const type of [
      'daily',
      'pod',
      'cdf',
      'delivery_concessions',
      'dvic_report',
      'eoc',
    ]) {
      const response = await request.get(endpoints.thresholds + '/' + type, {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      });
      await addToReport(response);

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.data.type).toBe(type);
    }
  },
);

test(
  'TC-04: Verify that an unknown threshold type returns "invalid type"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.thresholds + '/xyz', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('invalid type: xyz');
  },
);

test(
  'TC-05: Verify that saving thresholds without a type returns "type is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.thresholds, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { data: { fields: { threshold: [] } } },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('type is required');
  },
);

test(
  'TC-06: Verify that saving thresholds of an unknown type returns "invalid type"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // One metric (an empty list is refused before the type is checked: "threshold array cannot be empty")
    const response = await request.post(endpoints.thresholds, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        data: {
          type: 'xyz',
          fields: {
            threshold: [
              {
                field: 'fico_score',
                enable: true,
                order: 'normal',
                values: [{ value: '800' }, { value: '800' }],
              },
            ],
          },
        },
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('invalid type: xyz');
  },
);

test(
  'TC-07: Verify that saving thresholds without data returns "payload is missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.thresholds, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('payload is missing');
  },
);

test(
  'TC-08: Verify that reading thresholds without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.thresholds + '/weekly', {
      headers: { 'x-access-user': user.account_id },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-09: Verify that saving thresholds without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // The thresholds as they are now: even if the login check were missing, nothing would change
    const currentResponse = await request.get(
      endpoints.thresholds + '/weekly',
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(currentResponse);
    const current = await currentResponse.json();

    const response = await request.post(endpoints.thresholds, {
      headers: { 'x-access-user': user.account_id },
      data: {
        data: { type: 'weekly', fields: { threshold: current.data.threshold } },
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);
