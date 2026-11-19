const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const rescueDashboardSchema = require('../../../schemas/rescue-dashboard.schema');

// Rescue dashboard API: GET /lmd/prfsrv/graph/v2/rescue_dashboard?start=YYYY-MM-DD&end=YYYY-MM-DD
// Rescues per driver and a graph. Not used by the web app (2026-09-24): parameters from Swagger

// ---------- Valid requests ----------

test(
  'TC-01: Verify that the rescue graph and drivers are returned for a date range',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('success');
    expect(body.data.start).toBe('2025-09-01');
    expect(body.data.end).toBe('2026-08-31');
    // The labels of the graph, in order
    const labels = body.data.graph_data.map((item) => item.label);
    expect(labels).toEqual(['Completed', 'Refused', 'Received', 'Total']);
    // Station DYY1 has rescues in this period
    expect(body.data.driver_data.length).toBeGreaterThan(0);
  },
);

test(
  'TC-02: Verify that rescue dashboard response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, rescueDashboardSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that Total is Completed + Refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // graph_data[0] = Completed, [1] = Refused, [2] = Received (drivers who got help), [3] = Total
    const graph = body.data.graph_data;
    expect(graph[0].value + graph[1].value).toBe(graph[3].value);
  },
);

test(
  'TC-04: Verify that a period without data returns no drivers and a Total of 0',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2030-01-01', end: '2030-12-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.driver_data).toHaveLength(0);
    expect(body.data.graph_data[3].value).toBe(0);
  },
);

// ---------- Missing dates (400) ----------

test(
  'TC-05: Verify that missing start returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-06: Verify that missing end returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

test(
  'TC-07: Verify that empty start and end return "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '', end: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('params missing');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-08: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: { 'x-access-user': user.account_id },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-09: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: { 'x-access-token': user.token },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-10: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

test(
  'TC-11: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      params: { start: '2025-09-01', end: '2026-08-31' },
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
  'TC-12: Verify that POST method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2025-09-01', end: '2026-08-31' },
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
  'TC-13: Verify that wrong date format (DD-MM-YYYY) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '01-09-2025', end: '31-08-2026' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('Cast to date failed');
  },
);

test(
  'TC-14: Verify that end before start is rejected (BUG-API-002)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.rescueDashboard, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: '2026-08-31', end: '2025-09-01' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);
