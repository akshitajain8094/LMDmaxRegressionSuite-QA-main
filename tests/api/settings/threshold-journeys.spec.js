// SCENARIOS: threshold journeys (Settings -> Set Threshold -> Scorecard). The web app saves the whole list of the
// 15 weekly metrics after each change. API only, no browser: each step sends the same request as the web app.
// Every test reads the thresholds first and puts them back right after its change, before any check. The tests run
// one after another (not at the same time), because they change the same thresholds.
//
// TC-01 The manager changes the FICO score target, then puts it back
//   1. Manager: FICO score 800 -> 790 (the page saves at once)   CHECK: "Success"
//   2. The Scorecard thresholds                                  CHECK: FICO score 790, the other metrics unchanged
//   3. Manager: FICO score back to 800                           CHECK: the thresholds are exactly as before
// Known bugs: they fail until the bug is fixed. Each puts the thresholds back first, then checks.
// TC-02 BUG-API-015: an empty FICO value (the web app refuses: "Threshold Value Can Not Be Empty")   CHECK: 400
// TC-03 BUG-API-015: a FICO value that is not a number ("abc")                                      CHECK: 400
//
// Station DYY1. Daily regression only (@adds-data): the tests change a station setting for a moment.

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');

// The tests of this file run one after another: they all change the Scorecard thresholds
test.describe.configure({ mode: 'default' });

test(
  'TC-01: Verify that a changed Scorecard threshold is saved and can be put back',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // Before: the Scorecard thresholds (FICO score 800)
    const beforeResponse = await request.get(endpoints.thresholds + '/weekly', {
      headers,
    });
    await addToReport(beforeResponse);
    const before = await beforeResponse.json();
    const original = before.data.threshold;

    // 1. Manager: FICO score 800 -> 790 (the web app sends all 15 metrics)
    const changed = original.map((metric) =>
      metric.field === 'fico_score'
        ? { ...metric, values: [{ value: '790' }, { value: '790' }] }
        : metric,
    );
    const changeResponse = await request.post(endpoints.thresholds, {
      headers,
      data: { data: { type: 'weekly', fields: { threshold: changed } } },
    });
    await addToReport(changeResponse);

    // 2. The Scorecard thresholds now
    const afterChangeResponse = await request.get(
      endpoints.thresholds + '/weekly',
      { headers },
    );
    await addToReport(afterChangeResponse);
    const afterChange = await afterChangeResponse.json();

    // 3. Manager: puts the thresholds back as they were
    const putBackResponse = await request.post(endpoints.thresholds, {
      headers,
      data: { data: { type: 'weekly', fields: { threshold: original } } },
    });
    await addToReport(putBackResponse);

    const afterPutBackResponse = await request.get(
      endpoints.thresholds + '/weekly',
      { headers },
    );
    await addToReport(afterPutBackResponse);
    const afterPutBack = await afterPutBackResponse.json();

    // Checks (after the thresholds are back)
    expect(changeResponse.status()).toBe(200);
    const change = await changeResponse.json();
    expect(change.message).toBe('Success');
    expect(afterChange.data.threshold).toEqual(changed);
    expect(putBackResponse.status()).toBe(200);
    expect(afterPutBack.data.threshold).toEqual(original);
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-02: Verify that an empty threshold value is rejected (BUG-API-015)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const beforeResponse = await request.get(endpoints.thresholds + '/weekly', {
      headers,
    });
    await addToReport(beforeResponse);
    const before = await beforeResponse.json();
    const original = before.data.threshold;

    // An empty FICO value (the web app refuses it: "Threshold Value Can Not Be Empty")
    const response = await request.post(endpoints.thresholds, {
      headers,
      data: {
        data: {
          type: 'weekly',
          fields: {
            threshold: original.map((metric) =>
              metric.field === 'fico_score'
                ? { ...metric, values: [{ value: '' }, { value: '' }] }
                : metric,
            ),
          },
        },
      },
    });
    await addToReport(response);

    // Put back first: the thresholds as they were
    const putBackResponse = await request.post(endpoints.thresholds, {
      headers,
      data: { data: { type: 'weekly', fields: { threshold: original } } },
    });
    await addToReport(putBackResponse);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-03: Verify that a threshold value that is not a number is rejected (BUG-API-015)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const beforeResponse = await request.get(endpoints.thresholds + '/weekly', {
      headers,
    });
    await addToReport(beforeResponse);
    const before = await beforeResponse.json();
    const original = before.data.threshold;

    const response = await request.post(endpoints.thresholds, {
      headers,
      data: {
        data: {
          type: 'weekly',
          fields: {
            threshold: original.map((metric) =>
              metric.field === 'fico_score'
                ? { ...metric, values: [{ value: 'abc' }, { value: 'abc' }] }
                : metric,
            ),
          },
        },
      },
    });
    await addToReport(response);

    // Put back first: the thresholds as they were
    const putBackResponse = await request.post(endpoints.thresholds, {
      headers,
      data: { data: { type: 'weekly', fields: { threshold: original } } },
    });
    await addToReport(putBackResponse);

    expect(response.status()).toBe(400);
  },
);
