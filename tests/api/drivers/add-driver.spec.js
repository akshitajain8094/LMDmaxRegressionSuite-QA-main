const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const addDriverSchema = require('../../../schemas/add-driver.schema');
const leaderboardDashboardSchema = require('../../../schemas/leaderboard-dashboard.schema');

// Add Driver API: POST /lmd/usrsrv/drivers/v1/driver (Leaderboard tab -> "Add Driver", same body as the web app)
// A driver cannot be deleted (there is no delete API). Only TC-01 adds a driver: it runs in the daily
// regression and deactivates the driver at the end. The other tests never save a driver.
// Jordan Whitaker (id 38267) was added through the web app on 2026-09-24 for these tests: do not edit him.

// ---------- Add a driver (daily regression only: a new driver every run) ----------

test(
  'TC-01: Verify that an added driver is saved and shown with the same details in the other driver APIs',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    // A new driver every run: name, email, phone and transporter ID must not exist yet.
    // Realistic names and address (faker); safe contacts: yopmail inbox, area code 555 (no real phones)
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const runNumber = String(Date.now());
    const today = new Date().toISOString().slice(0, 10);
    const newDriver = {
      name: firstName + ' ' + lastName,
      // Like an Amazon transporter ID: "A" and 12 capital letters or digits
      transporter_id:
        'A' +
        Date.now().toString(36).toUpperCase() +
        faker.string.alphanumeric({ length: 4, casing: 'upper' }),
      email:
        (firstName + '.' + lastName).toLowerCase().replace(/[^a-z.]/g, '') +
        '.' +
        runNumber.slice(-6) +
        '@yopmail.com',
      phone: '555' + runNumber.slice(-7),
      netradyne_id: '',
      address:
        faker.location.streetAddress() +
        ', ' +
        faker.location.city() +
        ', ' +
        faker.location.state({ abbreviated: true }) +
        ' ' +
        faker.location.zipCode('#####'),
      hire_date: today,
      status: 'active',
      date_of_birth: null,
      work_anniversary: today,
      station_code: ['541'],
    };

    // 1. Add the driver
    const addResponse = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: newDriver,
    });
    await addToReport(addResponse);

    expect(addResponse.status()).toBe(200);
    const added = await addResponse.json();
    expect(added.success).toBe(true);
    expect(added.message).toBe('ok');
    expect(added.action).toBe('insert_driver');
    expect(getSchemaErrors(added, addDriverSchema)).toBe('No errors');
    expect(added.data.name).toBe(newDriver.name);
    expect(added.data.email).toBe(newDriver.email);
    expect(added.data.phone).toBe(newDriver.phone);
    expect(added.data.transporter_id).toBe(newDriver.transporter_id);
    expect(added.data.station_code).toEqual(['541']);
    // A new driver cannot sign in until someone allows it
    expect(added.data.allow_signin).toBe(false);
    const driverId = added.data.id;

    // 2. Like the web app, ask for the driver's rating: a new driver has none yet
    const ratingResponse = await request.patch(endpoints.driverRatingUpdate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { transporter_id: newDriver.transporter_id },
    });
    await addToReport(ratingResponse);

    expect(ratingResponse.status()).toBe(200);
    const rating = await ratingResponse.json();
    expect(rating.message).toBe('No data found');

    // 3. The leaderboard shows the driver with the same details
    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(leaderboardResponse);

    expect(leaderboardResponse.status()).toBe(200);
    const leaderboard = await leaderboardResponse.json();
    // Only the new driver, so a failure does not print other drivers' personal data
    const onLeaderboard = leaderboard.data.find(
      (driver) => driver.id === driverId,
    );
    expect(onLeaderboard).toBeTruthy();
    expect(onLeaderboard.name).toBe(newDriver.name);
    expect(onLeaderboard.email).toBe(newDriver.email);
    expect(onLeaderboard.phone).toBe(newDriver.phone);
    expect(onLeaderboard.transporter_id).toBe(newDriver.transporter_id);
    expect(onLeaderboard.status).toBe('active');
    // No rating and no rank yet
    expect(onLeaderboard.rating).toBe(null);
    expect(onLeaderboard.rank).toBe(null);
    // The leaderboard still matches its schema with the new driver in it
    expect(getSchemaErrors(leaderboard, leaderboardDashboardSchema)).toBe(
      'No errors',
    );

    // 4. The driver list (used by many pages) shows the driver
    const listResponse = await request.get(endpoints.driverList, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(listResponse);

    expect(listResponse.status()).toBe(200);
    const list = await listResponse.json();
    const inList = list.data.find((driver) => driver.id === driverId);
    expect(inList).toBeTruthy();
    expect(inList.name).toBe(newDriver.name);
    expect(inList.email).toBe(newDriver.email);
    expect(inList.status).toBe('active');

    // 5. The driver profile shows every field that was sent
    const profileResponse = await request.get(
      endpoints.driverProfile + driverId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(profileResponse);

    expect(profileResponse.status()).toBe(200);
    const profile = await profileResponse.json();
    // The profile API returns a list with one driver
    expect(profile.data[0].name).toBe(newDriver.name);
    expect(profile.data[0].email).toBe(newDriver.email);
    expect(profile.data[0].phone).toBe(newDriver.phone);
    expect(profile.data[0].transporter_id).toBe(newDriver.transporter_id);
    expect(profile.data[0].address).toBe(newDriver.address);
    expect(profile.data[0].hire_date).toBe(today + 'T00:00:00.000Z');
    expect(profile.data[0].work_anniversary).toBe(today + 'T00:00:00.000Z');
    expect(profile.data[0].station_code).toEqual(['541']);

    // 6. Clean up like the web app's status switch: save the reason, then deactivate the driver
    const reasonResponse = await request.post(endpoints.saveInactiveDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: driverId },
      multipart: {
        inactiveData: JSON.stringify({
          driver_name: newDriver.name,
          inactive_date: today,
          reason_type: 'business_decision',
          reasons: ['QA automation test driver'],
          note: 'Added and deactivated by the daily API test (add-driver.spec.js TC-01)',
        }),
      },
    });
    await addToReport(reasonResponse);
    expect(reasonResponse.status()).toBe(200);

    const statusResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { status: 'inactive', id: [driverId], type: 'single' },
    });
    await addToReport(statusResponse);

    expect(statusResponse.status()).toBe(200);
    const statusBody = await statusResponse.json();
    expect(statusBody.message).toBe('ok');
  },
);

// ---------- Duplicates (409): nothing is saved ----------

test(
  'TC-02: Verify that an email that already exists returns "email address already exists"',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      // Jordan Whitaker's email; the other details are new
      data: {
        name: 'Avery Collins',
        transporter_id: 'A7KQ2MZ9XL4TR',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '3125550164',
        hire_date: '2026-09-24',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('email address already exists');
  },
);

test(
  'TC-03: Verify that a phone number that already exists returns "phone number already exists"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      // Jordan Whitaker's phone number; the other details are new
      data: {
        name: 'Blake Morrison',
        transporter_id: 'A5AHCJTYRDQ2',
        email: 'blake.morrison.qa@yopmail.com',
        phone: '2025550143',
        hire_date: '2026-09-24',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('phone number already exists');
  },
);

test(
  'TC-04: Verify that a transporter ID that already exists returns "transporter id already exists"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      // Jordan Whitaker's transporter ID; the other details are new
      data: {
        name: 'Casey Holloway',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'casey.holloway.qa@yopmail.com',
        phone: '6175550183',
        hire_date: '2026-09-24',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('transporter id already exists');
  },
);

test(
  'TC-05: Verify that a name that already exists returns "Similar drivers found"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      // Jordan Whitaker's name; the other details are new
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'AWJE0XMQIRF',
        email: 'j.whitaker.second.qa@yopmail.com',
        phone: '7135550161',
        hire_date: '2026-09-24',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Similar drivers found');
    // The web app lists these drivers so the user can pick one: only the ids are checked
    const similarIds = body.data.fuzzy_matches.map((driver) => driver.id);
    expect(similarIds).toContain('38267');
  },
);

// ---------- Missing or wrong input (400) ----------
// These use Jordan Whitaker's contact details, so nothing is saved even if a check is missing

test(
  'TC-06: Verify that a missing name returns "params missing"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
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
  'TC-07: Verify that a missing email returns "email is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"email" is required');
  },
);

test(
  'TC-08: Verify that a missing phone returns "phone is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"phone" is required');
  },
);

test(
  'TC-09: Verify that an empty body returns "email is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"email" is required');
  },
);

test(
  'TC-10: Verify that a hire date that is not YYYY-MM-DD returns "must be in ISO 8601 date format"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        hire_date: '31-12-2026',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"hire_date" must be in ISO 8601 date format');
  },
);

// ---------- Login headers missing or wrong (401) ----------

test(
  'TC-11: Verify that request without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: { 'x-access-user': user.account_id },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    // Other APIs answer { success, message }; this one answers { error } (SUG-API-007)
    expect(body.error).toBe('Access token required in Authorization header.');
  },
);

test(
  'TC-12: Verify that request without x-access-user returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: { 'x-access-token': user.token },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Failed to authenticate token at Lv1');
  },
);

test(
  'TC-13: Verify that invalid token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Failed to authenticate token at Lv1');
  },
);

test(
  'TC-14: Verify that valid token with another user id returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: { 'x-access-token': user.token, 'x-access-user': '1' },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Failed to authenticate token at Lv1');
  },
);

// ---------- Wrong HTTP method ----------

test(
  'TC-15: Verify that GET method is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    // Ideally 405 Method Not Allowed (SUG-API-001)
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('Not Found');
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------
// Jordan Whitaker's contact details again: while the bug is open the API answers 409 (duplicate)
// instead of saving a new driver. Once the check is added, it answers 400 and the test passes.

test(
  'TC-16: Verify that a missing transporter ID is rejected (BUG-API-015)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-17: Verify that an unknown status (xyz) is rejected (BUG-API-015)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'xyz',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-18: Verify that a name longer than 35 characters is rejected (BUG-API-015)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      // 36 characters; the web app allows 35
      data: {
        name: 'Jordan Whitaker Montgomery-Ellington',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-19: Verify that a station the user cannot open is rejected with 400 (BUG-API-015)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '2025550143',
        status: 'active',
        station_code: ['999999'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-20: Verify that a wrong email returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa',
        phone: '2025550143',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('fails to match the required pattern');
  },
);

test(
  'TC-21: Verify that a wrong phone (5 digits) returns a clear error message (BUG-API-003)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.addDriver, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        name: 'Jordan Whitaker',
        transporter_id: 'A2JW7QK4M9TXRB',
        email: 'jordan.whitaker.qa@yopmail.com',
        phone: '55501',
        status: 'active',
        station_code: ['541'],
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).not.toContain('fails to match the required pattern');
  },
);

// ---------- The added driver in the other APIs (no new driver: Jordan Whitaker, added through the web app) ----------

test(
  'TC-22: Verify that the leaderboard shows a driver added through the web app with the same details',
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

    expect(response.status()).toBe(200);
    const body = await response.json();
    // Only Jordan Whitaker, so a failure does not print other drivers' personal data
    const jordan = body.data.find((driver) => driver.id === '38267');
    expect(jordan).toBeTruthy();
    expect(jordan.name).toBe('Jordan Whitaker');
    expect(jordan.email).toBe('jordan.whitaker.qa@yopmail.com');
    expect(jordan.phone).toBe('2025550143');
    expect(jordan.transporter_id).toBe('A2JW7QK4M9TXRB');
  },
);

test(
  'TC-23: Verify that the driver list shows a driver added through the web app with the same details',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverList, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    const jordan = body.data.find((driver) => driver.id === '38267');
    expect(jordan).toBeTruthy();
    expect(jordan.name).toBe('Jordan Whitaker');
    expect(jordan.email).toBe('jordan.whitaker.qa@yopmail.com');
    expect(jordan.phone).toBe('2025550143');
    expect(jordan.transporter_id).toBe('A2JW7QK4M9TXRB');
  },
);

test(
  'TC-24: Verify that the driver profile shows every field entered in the web app',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.driverProfile + '38267', {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    // The profile API returns a list with one driver
    expect(body.data[0].name).toBe('Jordan Whitaker');
    expect(body.data[0].email).toBe('jordan.whitaker.qa@yopmail.com');
    expect(body.data[0].phone).toBe('2025550143');
    expect(body.data[0].transporter_id).toBe('A2JW7QK4M9TXRB');
    expect(body.data[0].address).toBe('221 Oak Street, Kansas City, MO 64105');
    expect(body.data[0].hire_date).toBe('2026-09-24T00:00:00.000Z');
    expect(body.data[0].work_anniversary).toBe('2026-09-24T00:00:00.000Z');
    expect(body.data[0].station_code).toEqual(['541']);
  },
);
