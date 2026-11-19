// SCENARIOS: driver lifecycle (driver profile -> Edit; Leaderboard -> status switch, Suspend / Resume Driver).
// API only, no browser: each step sends the same request the web app sends when the manager clicks.
// All tests use the test driver Riley Thompson and put him back the way he was: active, not suspended, station
// DYY1 only, his own details. They run one after another (not at the same time), because they share Riley.
//
// TC-01 The manager edits the contact details
//   1. Edit -> new phone number and address -> Save        CHECK: "updated successfully"
//   2. Driver profile, driver list and leaderboard          CHECK: show the new phone number (and address)
//   3. Edit -> the old phone number and address (put back)  CHECK: the profile shows them again
// TC-02 The manager adds a second station, then removes it
//   1. Edit -> Assign Station: DYY1 + WAQA -> Save          CHECK: the profile shows both stations
//   2. Leaderboard of DYY1                                  CHECK: still shows Riley
//   3. Edit -> Assign Station: DYY1 only -> Save            CHECK: the profile shows DYY1 only
// TC-03 The manager deactivates the driver, then activates him again
//   1. Status switch off -> reason "Volume Reduction" and a note -> Inactivate
//                                                           CHECK: "ok"
//   2. Driver profile, driver list and leaderboard          CHECK: "inactive"
//   3. Status switch on                                     CHECK: "active" on all three again
// TC-04 The manager suspends the driver for 3 days, then resumes him
//   1. Suspend Driver -> From today, To in 3 days, details -> Suspend
//                                                           CHECK: 200
//   2. Driver profile, driver list and leaderboard          CHECK: "suspended" (the leaderboard with the dates)
//   3. Suspended drivers report of Riley                    CHECK: one new suspension, with the dates and details
//   4. Resume Driver                                        CHECK: "active" again; the suspension is closed
// Known bugs: they fail until the bug is fixed. Each puts Riley back first, then checks.
// TC-05 BUG-API-020: Edit with another driver's phone number                    CHECK: 409 (today: saved)
// TC-06 BUG-API-020: Edit with another driver's transporter ID                  CHECK: 409 (today: saved)
// TC-07 BUG-API-020: Edit with another driver's email                           CHECK: 409 (today: 500)
// TC-08 BUG-API-015: status "xyz"                                               CHECK: 400 (today: saved)
// TC-09 BUG-API-015: Edit with a name of 36 characters (the web app allows 35)  CHECK: 400 (today: saved)
// TC-10 BUG-API-021: a suspended driver is deactivated / suspended again        CHECK: both refused
// TC-11 BUG-API-021: an inactive driver is suspended                            CHECK: refused
// TC-12 BUG-API-002: a suspension that ends before it starts                    CHECK: 400 (today: saved)
//
// Driver: Riley Thompson (id 38308), a test driver whose phone and email reach no real person. Daily regression only
// (@adds-data): every suspension stays in the suspended drivers report (ENV-004).

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const daysAgo = require('../../../api/dates');

// The tests of this file run one after another: they all change Riley Thompson
test.describe.configure({ mode: 'default' });

// Riley Thompson's details (the tests put them back)
const riley = {
  phone: '2025550187',
  email: 'riley.thompson.qa@yopmail.com',
  transporter_id: 'A3RT8LK2P5QZNV',
  address: '418 Maple Avenue, Kansas City, MO 64106',
};
// Jordan Whitaker's details (another test driver), for the conflict tests
const jordan = {
  phone: '2025550143',
  email: 'jordan.whitaker.qa@yopmail.com',
  transporter_id: 'A2JW7QK4M9TXRB',
};

// ---------- Journeys ----------

test(
  'TC-01: Verify that edited contact details are shown on the profile, the driver list and the leaderboard',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // 1. Manager: Edit -> new phone number and address -> Save (the web app sends only what changed)
    const editResponse = await request.patch(endpoints.editDriver + '38308', {
      headers,
      data: {
        station_code: ['541'],
        phone: '2025550188',
        address: '77 Oak Lane, Kansas City, MO 64105',
        conflict_resolved: true,
      },
    });
    await addToReport(editResponse);

    expect(editResponse.status()).toBe(201);
    const edited = await editResponse.json();
    expect(edited.message).toBe('updated successfully');

    // 2. Driver profile, driver list and leaderboard show the new phone number
    const profileResponse = await request.get(
      endpoints.driverProfile + '38308',
      {
        headers,
      },
    );
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    expect(profile.data[0].phone).toBe('2025550188');
    expect(profile.data[0].address).toBe('77 Oak Lane, Kansas City, MO 64105');

    const listResponse = await request.get(endpoints.driverList, {
      headers,
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const rileyInList = list.data.find((driver) => driver.id === '38308');
    expect(rileyInList.phone).toBe('2025550188');

    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const rileyInLeaderboard = leaderboard.data.find(
      (driver) => driver.id === '38308',
    );
    expect(rileyInLeaderboard.phone).toBe('2025550188');

    // 3. Put back: Edit -> the old phone number and address -> Save
    const putBackResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: {
          station_code: ['541'],
          phone: riley.phone,
          address: riley.address,
          conflict_resolved: true,
        },
      },
    );
    await addToReport(putBackResponse);
    expect(putBackResponse.status()).toBe(201);

    const profileAfterResponse = await request.get(
      endpoints.driverProfile + '38308',
      { headers },
    );
    await addToReport(profileAfterResponse);
    const profileAfter = await profileAfterResponse.json();
    expect(profileAfter.data[0].phone).toBe(riley.phone);
    expect(profileAfter.data[0].address).toBe(riley.address);
  },
);

test(
  'TC-02: Verify that a driver can be added to a second station and removed from it again',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // 1. Manager: Edit -> Assign Station: DYY1 (541) and WAQA (542) -> Save
    const addStationResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: { station_code: ['541', '542'], conflict_resolved: true },
      },
    );
    await addToReport(addStationResponse);
    expect(addStationResponse.status()).toBe(201);

    const profileResponse = await request.get(
      endpoints.driverProfile + '38308',
      {
        headers,
      },
    );
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    // the order of the stations is not fixed (the server may return 542 first)
    expect([...profile.data[0].station_code].sort()).toEqual(['541', '542']);

    // 2. The leaderboard of DYY1 still shows Riley
    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const driverIds = leaderboard.data.map((driver) => driver.id);
    expect(driverIds).toContain('38308');

    // 3. Put back: Edit -> Assign Station: DYY1 only -> Save
    const removeStationResponse = await request.patch(
      endpoints.editDriver + '38308',
      { headers, data: { station_code: ['541'], conflict_resolved: true } },
    );
    await addToReport(removeStationResponse);
    expect(removeStationResponse.status()).toBe(201);

    const profileAfterResponse = await request.get(
      endpoints.driverProfile + '38308',
      { headers },
    );
    await addToReport(profileAfterResponse);
    const profileAfter = await profileAfterResponse.json();
    expect(profileAfter.data[0].station_code).toEqual(['541']);
  },
);

test(
  'TC-03: Verify that a deactivated driver is inactive everywhere, and active again after activation',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const today = daysAgo(0);

    // 1. Manager: status switch off -> "Mark as Inactive" window: reason and note -> Inactivate
    const reasonResponse = await request.post(endpoints.saveInactiveDriver, {
      headers,
      params: { driver_id: '38308' },
      multipart: {
        inactiveData: JSON.stringify({
          driver_name: 'Riley Thompson',
          inactive_date: today,
          reason_type: 'business_decision',
          reasons: ['Volume Reduction'],
          note: 'Route volume at DYY1 dropped for the season.',
        }),
      },
    });
    await addToReport(reasonResponse);
    expect(reasonResponse.status()).toBe(200);

    const inactiveResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'inactive', id: ['38308'], type: 'single' },
    });
    await addToReport(inactiveResponse);
    expect(inactiveResponse.status()).toBe(200);
    const inactive = await inactiveResponse.json();
    expect(inactive.message).toBe('ok');

    // 2. Driver profile, driver list and leaderboard: inactive
    const profileResponse = await request.get(
      endpoints.driverProfile + '38308',
      {
        headers,
      },
    );
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    expect(profile.data[0].status).toBe('inactive');

    const listResponse = await request.get(endpoints.driverList, {
      headers,
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const rileyInList = list.data.find((driver) => driver.id === '38308');
    expect(rileyInList.status).toBe('inactive');

    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const rileyInLeaderboard = leaderboard.data.find(
      (driver) => driver.id === '38308',
    );
    expect(rileyInLeaderboard.status).toBe('inactive');

    // 3. Manager: status switch on -> active again everywhere
    const activeResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'active', id: ['38308'], type: 'single' },
    });
    await addToReport(activeResponse);
    expect(activeResponse.status()).toBe(200);

    const profileAfterResponse = await request.get(
      endpoints.driverProfile + '38308',
      { headers },
    );
    await addToReport(profileAfterResponse);
    const profileAfter = await profileAfterResponse.json();
    expect(profileAfter.data[0].status).toBe('active');

    const listAfterResponse = await request.get(endpoints.driverList, {
      headers,
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(listAfterResponse);
    const listAfter = await listAfterResponse.json();
    const rileyInListAfter = listAfter.data.find(
      (driver) => driver.id === '38308',
    );
    expect(rileyInListAfter.status).toBe('active');

    const leaderboardAfterResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardAfterResponse);
    const leaderboardAfter = await leaderboardAfterResponse.json();
    const rileyInLeaderboardAfter = leaderboardAfter.data.find(
      (driver) => driver.id === '38308',
    );
    expect(rileyInLeaderboardAfter.status).toBe('active');
  },
);

test(
  'TC-04: Verify that a suspended driver is shown as suspended everywhere, and active again after resume',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const today = daysAgo(0);
    const inThreeDays = daysAgo(-3); // a negative number = days from now
    const details =
      'Suspended for 3 days after a preventable accident on route DYY1-19.';

    // Before: Riley's suspensions in the suspended drivers report
    const reportBeforeResponse = await request.get(endpoints.suspendedDrivers, {
      headers,
      params: { driver_id: '38308' },
    });
    await addToReport(reportBeforeResponse);
    const reportBefore = await reportBeforeResponse.json();
    const suspensionIdsBefore = reportBefore.data.map(
      (suspension) => suspension._id,
    );

    // 1. Manager: Leaderboard row menu -> Suspend Driver -> From, To, details -> Suspend
    const suspendResponse = await request.post(endpoints.suspendDriver, {
      headers,
      data: {
        suspend_data: {
          driver_id: '38308',
          start: today,
          end: inThreeDays,
          notes: details,
        },
      },
    });
    await addToReport(suspendResponse);
    expect(suspendResponse.status()).toBe(200);

    // 2. Driver profile, driver list and leaderboard: suspended
    const profileResponse = await request.get(
      endpoints.driverProfile + '38308',
      {
        headers,
      },
    );
    await addToReport(profileResponse);
    const profile = await profileResponse.json();
    expect(profile.data[0].status).toBe('suspended');
    expect(profile.data[0].is_suspended).toBe(true);

    const listResponse = await request.get(endpoints.driverList, {
      headers,
      params: { limit: '1000', offset: '0' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const rileyInList = list.data.find((driver) => driver.id === '38308');
    expect(rileyInList.status).toBe('suspended');

    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      { headers },
    );
    await addToReport(leaderboardResponse);
    const leaderboard = await leaderboardResponse.json();
    const rileyInLeaderboard = leaderboard.data.find(
      (driver) => driver.id === '38308',
    );
    expect(rileyInLeaderboard.status).toBe('suspended');
    expect(rileyInLeaderboard.start).toBe(today + 'T00:00:00.000Z');
    expect(rileyInLeaderboard.end).toBe(inThreeDays + 'T00:00:00.000Z');

    // 3. Suspended drivers report: one new suspension, with the dates and the details
    const reportResponse = await request.get(endpoints.suspendedDrivers, {
      headers,
      params: { driver_id: '38308' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const newSuspensions = report.data.filter(
      (suspension) => !suspensionIdsBefore.includes(suspension._id),
    );
    expect(newSuspensions).toHaveLength(1);
    const suspension = newSuspensions[0];
    expect(suspension.start).toBe(today + 'T00:00:00.000Z');
    expect(suspension.end).toBe(inThreeDays + 'T00:00:00.000Z');
    expect(suspension.notes).toBe(details);
    expect(suspension.is_suspended).toBe(true);

    // 4. Manager: Leaderboard row menu -> Resume Driver -> Resume Driver
    const resumeResponse = await request.post(endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38308' },
    });
    await addToReport(resumeResponse);
    expect(resumeResponse.status()).toBe(200);

    const profileAfterResponse = await request.get(
      endpoints.driverProfile + '38308',
      { headers },
    );
    await addToReport(profileAfterResponse);
    const profileAfter = await profileAfterResponse.json();
    expect(profileAfter.data[0].status).toBe('active');
    expect(profileAfter.data[0].is_suspended).toBe(false);

    const reportAfterResponse = await request.get(endpoints.suspendedDrivers, {
      headers,
      params: { driver_id: '38308' },
    });
    await addToReport(reportAfterResponse);
    const reportAfter = await reportAfterResponse.json();
    const closedSuspension = reportAfter.data.find(
      (item) => item._id === suspension._id,
    );
    expect(closedSuspension.is_suspended).toBe(false);
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------
// While a bug is open the request changes Riley, so each test first puts him back, then checks.

test(
  "TC-05: Verify that the web app's Edit refuses another driver's phone number (BUG-API-020)",
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // Edit -> Jordan Whitaker's phone number -> Save (the web app always sends conflict_resolved: true)
    const response = await request.patch(endpoints.editDriver + '38308', {
      headers,
      data: {
        station_code: ['541'],
        phone: jordan.phone,
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    // Put back first: Riley's own phone number
    const putBackResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: {
          station_code: ['541'],
          phone: riley.phone,
          conflict_resolved: true,
        },
      },
    );
    await addToReport(putBackResponse);

    // Expected: the conflict window's answer, as without conflict_resolved: 409 "phone number already exists"
    expect(response.status()).toBe(409);
  },
);

test(
  "TC-06: Verify that the web app's Edit refuses another driver's transporter ID (BUG-API-020)",
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const response = await request.patch(endpoints.editDriver + '38308', {
      headers,
      data: {
        station_code: ['541'],
        transporter_id: jordan.transporter_id,
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    // Put back first: Riley's own transporter ID
    const putBackResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: {
          station_code: ['541'],
          transporter_id: riley.transporter_id,
          conflict_resolved: true,
        },
      },
    );
    await addToReport(putBackResponse);

    expect(response.status()).toBe(409);
  },
);

test(
  "TC-07: Verify that the web app's Edit answers another driver's email with a conflict, not a server error (BUG-API-020)",
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const response = await request.patch(endpoints.editDriver + '38308', {
      headers,
      data: {
        station_code: ['541'],
        email: jordan.email,
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    // Put back first: Riley's own email (nothing changes when the request was refused)
    const putBackResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: {
          station_code: ['541'],
          email: riley.email,
          conflict_resolved: true,
        },
      },
    );
    await addToReport(putBackResponse);

    expect(response.status()).toBe(409);
  },
);

test(
  'TC-08: Verify that an unknown status ("xyz") is rejected (BUG-API-015)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    const response = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'xyz', id: ['38308'], type: 'single' },
    });
    await addToReport(response);

    // Put back first: active
    const putBackResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'active', id: ['38308'], type: 'single' },
    });
    await addToReport(putBackResponse);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-09: Verify that Edit refuses a name longer than 35 characters (BUG-API-015)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // 36 characters: one more than the web app allows
    const response = await request.patch(endpoints.editDriver + '38308', {
      headers,
      data: {
        station_code: ['541'],
        name: 'Riley Alexander Thompson Montgomerie',
        conflict_resolved: true,
      },
    });
    await addToReport(response);

    // Put back first: Riley's own name
    const putBackResponse = await request.patch(
      endpoints.editDriver + '38308',
      {
        headers,
        data: {
          station_code: ['541'],
          name: 'Riley Thompson',
          conflict_resolved: true,
        },
      },
    );
    await addToReport(putBackResponse);

    expect(response.status()).toBe(400);
  },
);

test(
  'TC-10: Verify that a suspended driver can be neither deactivated nor suspended again (BUG-API-021)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const today = daysAgo(0);
    const tomorrow = daysAgo(-1);

    // 1. Manager: suspends Riley for 2 days
    const suspendResponse = await request.post(endpoints.suspendDriver, {
      headers,
      data: {
        suspend_data: {
          driver_id: '38308',
          start: today,
          end: tomorrow,
          notes: 'Suspended for 2 days: missed the safety training.',
        },
      },
    });
    await addToReport(suspendResponse);
    expect(suspendResponse.status()).toBe(200);

    // 2. Status switch off while suspended (the web app refuses: "You have selected suspended driver ...")
    const deactivateResponse = await request.patch(
      endpoints.driverStatusUpdate,
      {
        headers,
        data: { status: 'inactive', id: ['38308'], type: 'single' },
      },
    );
    await addToReport(deactivateResponse);

    // 3. Suspend again while suspended (the web app only offers "Resume Driver")
    const suspendAgainResponse = await request.post(endpoints.suspendDriver, {
      headers,
      data: {
        suspend_data: {
          driver_id: '38308',
          start: today,
          end: tomorrow,
          notes: 'Second suspension for the same days.',
        },
      },
    });
    await addToReport(suspendAgainResponse);

    // Put back first: resume twice (once per suspension), then active
    const firstResumeResponse = await request.post(endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38308' },
    });
    await addToReport(firstResumeResponse);
    const secondResumeResponse = await request.post(endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38308' },
    });
    await addToReport(secondResumeResponse);
    const activeResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'active', id: ['38308'], type: 'single' },
    });
    await addToReport(activeResponse);

    // Both must be refused
    expect([
      deactivateResponse.status(),
      suspendAgainResponse.status(),
    ]).toEqual([400, 400]);
  },
);

test(
  'TC-11: Verify that an inactive driver cannot be suspended (BUG-API-021)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const today = daysAgo(0);

    // 1. Manager: deactivates Riley (reason, then status)
    const reasonResponse = await request.post(endpoints.saveInactiveDriver, {
      headers,
      params: { driver_id: '38308' },
      multipart: {
        inactiveData: JSON.stringify({
          driver_name: 'Riley Thompson',
          inactive_date: today,
          reason_type: 'business_decision',
          reasons: ['Volume Reduction'],
          note: 'Route volume at DYY1 dropped for the season.',
        }),
      },
    });
    await addToReport(reasonResponse);
    const inactiveResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'inactive', id: ['38308'], type: 'single' },
    });
    await addToReport(inactiveResponse);
    expect(inactiveResponse.status()).toBe(200);

    // 2. Suspend the inactive driver (in the web app, Suspend is only for active drivers)
    const suspendResponse = await request.post(endpoints.suspendDriver, {
      headers,
      data: {
        suspend_data: {
          driver_id: '38308',
          start: today,
          end: daysAgo(-1),
          notes: 'Suspension of an inactive driver.',
        },
      },
    });
    await addToReport(suspendResponse);

    // Put back first: resume, then active
    const resumeResponse = await request.post(endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38308' },
    });
    await addToReport(resumeResponse);
    const activeResponse = await request.patch(endpoints.driverStatusUpdate, {
      headers,
      data: { status: 'active', id: ['38308'], type: 'single' },
    });
    await addToReport(activeResponse);

    expect(suspendResponse.status()).toBe(400);
  },
);

test(
  'TC-12: Verify that a suspension that ends before it starts is rejected (BUG-API-002)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };

    // The web app refuses it: "The end date must be equal to or later than the start date"
    const response = await request.post(endpoints.suspendDriver, {
      headers,
      data: {
        suspend_data: {
          driver_id: '38308',
          start: daysAgo(-3),
          end: daysAgo(0),
          notes: 'End before start.',
        },
      },
    });
    await addToReport(response);

    // Put back first: resume
    const resumeResponse = await request.post(endpoints.resumeDriver, {
      headers,
      data: { driver_id: '38308' },
    });
    await addToReport(resumeResponse);

    expect(response.status()).toBe(400);
  },
);
