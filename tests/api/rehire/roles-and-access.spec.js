const { test, expect } = require('@playwright/test');
const rehire = require('../../../api/rehire');
const addToReport = require('../../../api/report');

// Admins, promotion, sign-in (LMD Drive App access) and activation (sheet REQ-03, REQ-06, REQ-11, REQ-12).
// Company A = Brothers (ABC), B = earthhh (TTT). Every test adds its own QA drivers / admins; at the end the
// drivers are made inactive and the admins are removed from the admin role. The calls are the ones the web
// app sends (Settings → Admins → Add Admin / Remove from admin role, Leaderboard → Promote As An Admin, Edit
// Driver), seen on staging on 2026-11-05.

const tags = { tag: ['@rehire', '@adds-data'] };

test.skip(
  !process.env.REHIRE_A_EMAIL || !process.env.REHIRE_B_EMAIL,
  'REHIRE_* is not set in .env',
);

test.afterEach(async ({ request }) => {
  await rehire.cleanUpRequests(request);
  await rehire.cleanUp(request);
});

// A driver as the company's driver list shows it (with userid, allow_signin, status)
const driverIn = async (request, company, email) =>
  (await rehire.driversWithEmail(request, company, email))[0];

// A QA driver of A and the same person added in B (saved there with an access issue)
async function samePersonInAandB(request) {
  const inA = await rehire.addDriver(request, 'A');
  const details = rehire.newDriverDetails('B', {
    email: inA.email,
    phone: inA.phone,
  });
  const added = await rehire.tryAdd(request, 'B', details);
  expect(added.status, added.body.message).toBe(200);
  return { inA, inB: { ...details, id: added.body.data.id } };
}

// ---------- REQ-03: Driver → Admin in the same company ----------

test(
  'TC_024: Verify that adding a driver of the same company as an admin is refused and offers the promotion',
  tags,
  async ({ request }) => {
    const driver = await rehire.addDriver(request, 'A');

    const result = await rehire.tryAddAdmin(
      request,
      'A',
      rehire.newAdminDetails('A', { email: driver.email, phone: driver.phone }),
    );

    expect(result.status).toBe(409);
    expect(result.body.message).toBe(
      'This user is already a driver in Station ' +
        rehire.stationOf('A') +
        '. Do you want to promote them to an admin there?',
    );
    const conflict = rehire.conflictWith(result.body, driver.id);
    expect(conflict.role).toBe('driver');
    expect(conflict.conflict_type).toBe('same_company');
    expect(conflict.matched_on).toEqual(
      expect.arrayContaining(['email', 'phone']),
    );
    // No admin was made
    const users = await rehire.usersWithEmail(request, 'A', driver.email);
    expect(users.filter((u) => u.role === 'admin')).toHaveLength(0);
  },
);

// ---------- REQ-06: promotion ----------

test(
  'TC_063: Verify that a driver without a conflict is promoted to admin, and can be removed from the admin role',
  tags,
  async ({ request }) => {
    const user = await rehire.login('A');
    const created = await rehire.addDriver(request, 'A');
    const driver = await driverIn(request, 'A', created.email);
    rehire.trackAdmin('A', created.email);

    const promoted = await rehire.api.promote(request, user, driver, [
      rehire.stationOf('A'),
    ]);
    await addToReport(promoted);

    expect(promoted.status()).toBe(200);
    expect((await promoted.json()).message).toBe(
      'User shared as admin successfully',
    );
    // Settings → Admins → Remove from admin role
    const removed = await rehire.api.demote(request, user, driver.userid, [
      rehire.stationOf('A'),
    ]);
    await addToReport(removed);
    expect(removed.status()).toBe(200);
  },
);

// ---------- REQ-06 / REQ-11: sign-in (LMD Drive App access) ----------

test(
  'TC_105: Verify that sign-in is granted to a driver without a conflict',
  tags,
  async ({ request }) => {
    const driver = await rehire.addDriver(request, 'B');

    const response = await rehire.api.grantSignin(
      request,
      await rehire.login('B'),
      driver.id,
      driver.station_code,
    );
    await addToReport(response);

    expect(response.status()).toBe(201);
    expect((await driverIn(request, 'B', driver.email)).allow_signin).toBe(
      true,
    );
  },
);

test(
  'TC_059, TC_098, TC_103: Verify that sign-in is refused while a cross-company conflict is open',
  tags,
  async ({ request }) => {
    const { inA, inB } = await samePersonInAandB(request);

    const response = await rehire.api.grantSignin(
      request,
      await rehire.login('B'),
      inB.id,
      inB.station_code,
    );
    await addToReport(response);
    const body = await response.json();

    expect(response.status()).toBe(409);
    expect(body.message).toBe(
      'Cross-company conflict must be resolved by Super Admin before enabling sign-in or activating this driver.',
    );
    expect(rehire.conflictWith(body, inA.id)?.conflict_type).toBe(
      'cross_company',
    );
    // TC_103: never two sign-ins for the same person
    expect((await driverIn(request, 'B', inB.email)).allow_signin).toBe(false);
  },
);

test(
  'TC_061: Verify that sign-in works after the Super Admin resolved the conflict (Quick-Accept)',
  tags,
  async ({ request }) => {
    const req = await rehire.raiseRequest(request);
    const accepted = await rehire.superAdminApi.quickAccept(
      request,
      await rehire.loginAsSuperAdmin(request),
      req,
    );
    expect(accepted.status()).toBe(200);

    const inB = await driverIn(request, 'B', req.newDriver.email);
    expect(inB.allow_signin, 'granted by Quick-Accept').toBe(true);
    // Granting again (the admin's switch) gives no conflict any more
    const again = await rehire.api.grantSignin(
      request,
      await rehire.login('B'),
      req.newDriver.id,
      req.newDriver.station_code,
    );
    expect(again.status()).toBe(201);
  },
);

// ---------- REQ-12: activation ----------

test(
  'TC_106: Verify that activating a driver who is active in another company is refused until the Super Admin resolves it (BUG-API-042)',
  { tag: ['@rehire', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    // Active in A, the same person added in B (with an access issue) and made inactive in B
    const { inB } = await samePersonInAandB(request);
    await rehire.deactivate(request, 'B', inB);
    const user = await rehire.login('B');

    // The Leaderboard's status switch, and Edit Driver → Status Active
    const toggle = await rehire.api.setStatus(request, user, inB.id, 'active');
    await addToReport(toggle);
    const edit = await rehire.api.edit(request, user, inB.id, {
      station_code: inB.station_code,
      status: 'active',
    });
    await addToReport(edit);

    // Both are checked, so a failure shows which way lets the driver in
    expect.soft(toggle.status(), 'status switch').toBe(409);
    expect.soft(edit.status(), 'Edit Driver').toBe(409);
    expect(
      (await driverIn(request, 'B', inB.email))?.status ?? 'inactive',
    ).toBe('inactive');
  },
);

test(
  'TC_035 (other direction): Verify that company A adding a driver of company B also reports the conflict (BUG-API-041)',
  { tag: ['@rehire', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const inB = await rehire.addDriver(request, 'B');

    const result = await rehire.tryAdd(
      request,
      'A',
      rehire.newDriverDetails('A', { email: inB.email, phone: inB.phone }),
    );

    expect(result.status, result.body.message).toBe(200);
    expect(
      rehire.conflictWith(result.body, inB.id)?.conflict_type,
      'a cross-company conflict with the driver of B',
    ).toBe('cross_company');
  },
);

test(
  'TC_025: Verify that adding an admin again in the same company is refused (no Super Admin request)',
  tags,
  async ({ request }) => {
    const admin = await rehire.addAdmin(request, 'A');

    const result = await rehire.tryAddAdmin(request, 'A', {
      ...rehire.newAdminDetails('A'),
      email: admin.email,
      phone: admin.phone,
    });

    expect(result.status).toBe(409);
    expect(result.body.message).toBe(
      'This user is already an admin in Station ' + rehire.stationOf('A') + '.',
    );
    expect(result.body.data.conflicted[0].conflict_kind).toBe(
      'admin_same_station',
    );
  },
);

test(
  'TC_034: Verify that a driver of company A cannot be added as an admin in company B without the Super Admin',
  tags,
  async ({ request }) => {
    const driver = await rehire.addDriver(request, 'A');

    const result = await rehire.tryAddAdmin(
      request,
      'B',
      rehire.newAdminDetails('B', { email: driver.email, phone: driver.phone }),
    );

    expect(result.status).toBe(409);
    expect(result.body.message).toBe(
      'Same OR Cross-company conflict must be resolved by Super Admin.',
    );
    const conflict = rehire.conflictWith(result.body, driver.id);
    expect(conflict.conflict_type).toBe('cross_company');
    expect(conflict.conflict_kind).toBe('cross_company_driver');
  },
);

test(
  'TC_134: Verify that an admin of company A cannot be added as an admin in company B (no duplicate admin)',
  tags,
  async ({ request }) => {
    const admin = await rehire.addAdmin(request, 'A');

    const result = await rehire.tryAddAdmin(
      request,
      'B',
      rehire.newAdminDetails('B', { email: admin.email, phone: admin.phone }),
    );

    expect(result.status).toBe(409);
    expect(result.body.data.conflicted[0].conflict_kind).toBe(
      'cross_company_admin',
    );
    expect(await rehire.usersWithEmail(request, 'B', admin.email)).toHaveLength(
      0,
    );
  },
);

test(
  'TC_060: Verify that promoting a driver whose details are used in another company is blocked until the Super Admin approves (BUG-API-040)',
  { tag: ['@rehire', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const { inA } = await samePersonInAandB(request);
    const driver = await driverIn(request, 'A', inA.email);
    rehire.trackAdmin('A', inA.email);

    const promoted = await rehire.api.promote(
      request,
      await rehire.login('A'),
      driver,
      [rehire.stationOf('A')],
    );
    await addToReport(promoted);
    // Undo a promotion that should not have happened
    if (promoted.ok()) {
      await rehire.api.demote(request, await rehire.login('A'), driver.userid, [
        rehire.stationOf('A'),
      ]);
    }

    expect(promoted.status(), (await promoted.text()).slice(0, 200)).toBe(409);
  },
);
