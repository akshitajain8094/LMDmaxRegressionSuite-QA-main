// Driver lifecycle APIs one by one: the suspended drivers report, the driver timeline, and the checks of Edit,
// status, Suspend and Resume. None of these tests changes a driver: every request below has a missing or wrong
// value, so the API refuses it. The journeys are in driver-lifecycle-journeys.spec.js.
//
// WHAT IS CHECKED
// Reports (read only, station DYY1)
//   TC-01 The suspended drivers report                     CHECK: 200 and a list of suspensions
//   TC-02 The same report                                  CHECK: matches the expected schema
//   TC-03 The report of one driver (driver profile)        CHECK: only that driver's suspensions
//   TC-04 A driver's timeline (the latest 10 changes)      CHECK: only that driver's changes, at most 10
//   TC-05 The same timeline                                CHECK: matches the expected schema
// Suspend, Resume and status with a missing or wrong value
//   TC-06, TC-07 Suspend without dates / without a driver  CHECK: 400
//   TC-08 Suspend with DD-MM-YYYY dates                    CHECK: 400 "Invalid start/end date"
//   TC-09 Resume without a driver                          CHECK: 400
//   TC-10, TC-11 Status without the status / without id    CHECK: 400 '"status" is required' / '"id" is required'
//   TC-12 Status of a driver that does not exist           CHECK: 404 "Driver not found"
// Edit with a missing or wrong value
//   TC-13 Edit a driver that does not exist                CHECK: "Driver not found"
//   TC-14, TC-15 Known bugs: an email that is not an email, CHECK: 400 without the internal pattern
//         a phone number of 5 digits
// Login
//   TC-16 to TC-18 Edit, Suspend and status without login  CHECK: 401

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const daysAgo = require('../../../api/dates');
const suspendedDriversSchema = require('../../../schemas/suspended-drivers.schema');
const driverTimelineSchema = require('../../../schemas/driver-timeline.schema');

// ---------- Reports ----------

test(
  'TC-01: Verify that the suspended drivers report returns the suspensions of the station',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.suspendedDrivers, {
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
    expect(body.action).toBe('suspended_drivers_controller');
    expect(body.data.length).toBeGreaterThan(0);
  },
);

test(
  'TC-02: Verify that the suspended drivers report matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.suspendedDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, suspendedDriversSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that the suspended drivers report of one driver shows only that driver',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Driver profile -> suspensions of the test driver Riley Thompson (38308)
    const response = await request.get(endpoints.suspendedDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38308' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    const driverIds = body.data.map((suspension) => suspension.id);
    expect(driverIds.length).toBeGreaterThan(0);
    const otherDriverIds = driverIds.filter((driverId) => driverId !== '38308');
    expect(otherDriverIds).toHaveLength(0);
  },
);

test(
  "TC-04: Verify that a driver's timeline shows only that driver's latest changes",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // Driver profile -> Timeline: the latest 10 changes of Jordan Whitaker (38267)
    const response = await request.get(endpoints.driverTimeline, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267', offset: '0', limit: '10' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.message).toBe('Success');
    const driverIds = body.data.map((change) => change.driver_id);
    expect(driverIds.length).toBeGreaterThan(0);
    expect(driverIds.length).toBeLessThanOrEqual(10);
    const otherDriverIds = driverIds.filter((driverId) => driverId !== '38267');
    expect(otherDriverIds).toHaveLength(0);
  },
);

test(
  "TC-05: Verify that a driver's timeline matches the expected schema",
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverTimeline, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267', offset: '0', limit: '10' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, driverTimelineSchema)).toBe('No errors');
  },
);

// ---------- Suspend, Resume and status with a missing or wrong value: no driver changes ----------

test(
  'TC-06: Verify that Suspend without dates is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.suspendDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        suspend_data: {
          driver_id: '38308',
          notes: 'Suspended after a preventable accident.',
        },
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Required structured suspension parameter payloads are missing or invalid.',
    );
  },
);

test(
  'TC-07: Verify that Suspend without a driver is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.suspendDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        suspend_data: {
          start: daysAgo(0),
          end: daysAgo(-3),
          notes: 'Suspended after a preventable accident.',
        },
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'Required structured suspension parameter payloads are missing or invalid.',
    );
  },
);

test(
  'TC-08: Verify that Suspend with a wrong date format (DD-MM-YYYY) returns "Invalid start/end date"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.suspendDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        suspend_data: {
          driver_id: '38308',
          start: '25-09-2026',
          end: '28-09-2026',
          notes: 'Suspended after a preventable accident.',
        },
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid start/end date');
  },
);

test(
  'TC-09: Verify that Resume without a driver is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.resumeDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain('driver_id');
  },
);

test(
  'TC-10: Verify that a status change without the status returns \'"status" is required\'',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.driverStatusUpdate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { id: ['38308'], type: 'single' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"status" is required');
  },
);

test(
  'TC-11: Verify that a status change without the driver returns \'"id" is required\'',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.driverStatusUpdate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { status: 'active', type: 'single' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"id" is required');
  },
);

test(
  'TC-12: Verify that a status change of a driver that does not exist returns 404 "Driver not found"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.driverStatusUpdate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { status: 'active', id: ['99999999'], type: 'single' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Driver not found');
  },
);

// ---------- Edit with a missing or wrong value: no driver changes ----------

test(
  'TC-13: Verify that editing a driver that does not exist returns "Driver not found"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.editDriver + '99999999', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        station_code: ['541'],
        phone: '2025550199',
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Driver not found');
  },
);

test(
  'TC-14: Verify that Edit with an email that is not an email returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.editDriver + '38308', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        station_code: ['541'],
        email: 'riley.thompson.qa',
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('fails to match the required pattern');
  },
);

test(
  'TC-15: Verify that Edit with a phone number of 5 digits returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.patch(endpoints.editDriver + '38308', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { station_code: ['541'], phone: '55501', conflict_resolved: true },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('fails to match the required pattern');
  },
);

// ---------- Login ----------

test(
  'TC-16: Verify that Edit without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.patch(endpoints.editDriver + '38308', {
      data: { station_code: ['541'], phone: '2025550187' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    // The users service answers in another format (SUG-API-007)
    expect(body.error).toBe('Access token required in Authorization header.');
  },
);

test(
  'TC-17: Verify that Suspend without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.suspendDriver, {
      data: {
        suspend_data: {
          driver_id: '38308',
          start: daysAgo(0),
          end: daysAgo(-3),
          notes: 'Suspended after a preventable accident.',
        },
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
  'TC-18: Verify that a status change without x-access-token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.patch(endpoints.driverStatusUpdate, {
      data: { status: 'inactive', id: ['38308'], type: 'single' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Access token required in Authorization header.');
  },
);
