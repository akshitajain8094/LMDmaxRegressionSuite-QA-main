const { test, expect } = require('@playwright/test');
const {
  login,
  bodyOf,
  newDriverDetails,
  addDriver,
  tryAdd,
  cleanUp,
  driversWithEmail,
  loginAsSuperAdmin,
  superAdminApi,
  sendRequest,
  raiseRequest,
  cleanUpRequests,
  requestOf,
} = require('../../../api/rehire');
const addToReport = require('../../../api/report');

// Send Request To Super Admin and the Super Admin's actions (sheet REQ-04, REQ-09, REQ-10, REQ-17).
// ONLY on requests the tests raise themselves (raiseRequest: a new QA driver in Brothers, the same person added
// in earthhh), never on other people's requests; Clear Data is never used. Allowed by the user on 2026-11-05.
// A request still pending after a test is cancelled; the QA drivers are made inactive.
// The calls are the ones the web app sends (seen 2026-11-05 on staging).

const tags = { tag: ['@rehire', '@adds-data'] };

test.skip(
  !process.env.SUPER_ADMIN_EMAIL || !process.env.REHIRE_B_EMAIL,
  'SUPER_ADMIN_* and REHIRE_* are not set in .env',
);

test.afterEach(async ({ request }) => {
  await cleanUpRequests(request);
  await cleanUp(request);
});

// A driver as company A or B lists it (by email), e.g. to read status / allow_signin
const driverIn = async (request, company, email) =>
  (await driversWithEmail(request, company, email))[0];

// ---------- Send Request (admin side) ----------

test(
  'TC_036: Verify that Send Request creates a pending request and the new driver stays without app access',
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);

    const now = await requestOf(request, req.id);
    expect(now.conflict_status).toBe('PENDING');
    expect(now.company_name).toBe('earthhh');
    expect(now.detail.sentFrom.details.userName).toBe(req.newDriver.name);
    expect(now.detail.sentTo.companyName).toBe('Brothers');
    // TC_070: the request is in the Super Admin's list
    const list = await superAdminApi.list(
      request,
      await loginAsSuperAdmin(request),
    );
    const ids = (await bodyOf(list)).data.map((r) => String(r._id));
    expect(ids).toContain(String(req.id));
    // Not added with access: no sign-in until the Super Admin resolves it
    const inB = await driverIn(request, 'B', req.newDriver.email);
    expect(inB?.allow_signin ?? false).toBe(false);
  },
);

test(
  'TC_141: Verify that the same conflict cannot create a second pending request',
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);

    const again = await sendRequest(
      request,
      'B',
      req.newDriver,
      [req.existingDriver.id],
      req.requestType,
    );
    await addToReport(again);
    const body = await bodyOf(again);

    // Either refused, or the same request id again (no duplicate)
    if (again.status() === 200) {
      expect(body.data.ids).toEqual([req.id]);
    } else {
      expect(again.status()).toBeGreaterThanOrEqual(400);
    }
  },
);

test(
  'TC_142: Verify that a double click on Send Request creates one request',
  tags,
  async ({ request }) => {
    const existing = await addDriver(request, 'A');
    const details = newDriverDetails('B', {
      email: existing.email,
      phone: existing.phone,
    });
    const added = await tryAdd(request, 'B', details);
    const newDriver = { ...details, id: added.body.data.id };
    const type = ['signin_grant_conflict', 'email_conflict', 'phone_conflict'];

    const [first, second] = await Promise.all([
      sendRequest(request, 'B', newDriver, [existing.id], type),
      sendRequest(request, 'B', newDriver, [existing.id], type),
    ]);
    const ids = [
      ...((await bodyOf(first)).data?.ids ?? []),
      ...((await bodyOf(second)).data?.ids ?? []),
    ];
    // Cancel whatever was created (our own requests)
    const sa = await loginAsSuperAdmin(request);
    for (const id of new Set(ids)) {
      await superAdminApi.cancel(request, sa, { id });
    }

    expect(new Set(ids).size, 'requests created').toBe(1);
  },
);

// ---------- Quick-Accept ----------

test(
  'TC_084, TC_100: Verify that Quick-Accept grants sign-in in B, makes the driver in A inactive and resolves the request',
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);

    const response = await superAdminApi.quickAccept(
      request,
      await loginAsSuperAdmin(request),
      req,
    );
    await addToReport(response);

    expect(response.status()).toBe(200);
    expect((await bodyOf(response)).message).toBe(
      'Conflict resolved and LMD sign-in granted successfully',
    );
    const now = await requestOf(request, req.id);
    expect(now.conflict_status).toBe('RESOLVED');
    expect(now.resolutionType).toBe('quick');
    expect(now.resolution_changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'allow_signin', to: 'true' }),
      ]),
    );
    // TC_133: one active identity: A inactive, B active
    const inA = await driverIn(request, 'A', req.existingDriver.email);
    expect(inA?.status ?? 'inactive').toBe('inactive');
    const inB = await driverIn(request, 'B', req.newDriver.email);
    expect(inB.status).toBe('active');
  },
);

test(
  'TC_088, TC_097: Verify that a resolved request cannot be accepted, updated or cancelled again',
  tags,
  async ({ request }) => {
    const sa = await loginAsSuperAdmin(request);
    const req = await raiseRequest(request);
    const first = await superAdminApi.quickAccept(request, sa, req);
    expect(first.status()).toBe(200);

    const again = await superAdminApi.quickAccept(request, sa, req);
    await addToReport(again);
    const cancel = await superAdminApi.cancel(request, sa, req);
    await addToReport(cancel);

    expect(again.status(), 'second Quick-Accept').toBeGreaterThanOrEqual(400);
    expect(cancel.status(), 'cancel after resolve').toBeGreaterThanOrEqual(400);
    expect((await requestOf(request, req.id)).conflict_status).toBe('RESOLVED');
  },
);

// ---------- Update & Resolve ----------

test(
  "TC_090, TC_091, TC_112: Verify that Update & Resolve with a new email and phone for A's driver resolves the request",
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);
    const fresh = newDriverDetails('A');

    const response = await superAdminApi.updateAndResolve(
      request,
      await loginAsSuperAdmin(request),
      req,
      { email: fresh.email, phone: fresh.phone },
    );
    await addToReport(response);

    expect(response.status()).toBe(200);
    expect((await bodyOf(response)).message).toBe(
      'Conflict resolved successfully',
    );
    expect((await requestOf(request, req.id)).conflict_status).toBe('RESOLVED');
    // A's driver now has the new details and is still active
    const inA = await driverIn(request, 'A', fresh.email);
    expect(inA, "A's driver has the new email").toBeTruthy();
    expect(inA.phone).toBe(fresh.phone);
    expect(inA.status).toBe('active');
  },
);

test(
  "TC_092, TC_113: Verify that Update & Resolve that makes A's driver inactive resolves the request",
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);

    const response = await superAdminApi.updateAndResolve(
      request,
      await loginAsSuperAdmin(request),
      req,
      { status: 'inactive' },
    );
    await addToReport(response);

    expect(response.status()).toBe(200);
    expect((await requestOf(request, req.id)).conflict_status).toBe('RESOLVED');
    const inA = await driverIn(request, 'A', req.existingDriver.email);
    expect(inA?.status ?? 'inactive').toBe('inactive');
  },
);

test(
  'TC_093: Verify that Update & Resolve to a phone another driver uses is refused',
  tags,
  async ({ request }) => {
    const other = await addDriver(request, 'A');
    const req = await raiseRequest(request);

    const response = await superAdminApi.updateAndResolve(
      request,
      await loginAsSuperAdmin(request),
      req,
      { email: newDriverDetails('A').email, phone: other.phone },
    );
    await addToReport(response);

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect((await requestOf(request, req.id)).conflict_status).toBe('PENDING');
  },
);

test(
  'TC_094: Verify that Update & Resolve with a wrong email or phone format is refused (BUG-API-039)',
  { tag: ['@rehire', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const sa = await loginAsSuperAdmin(request);
    const req = await raiseRequest(request);

    for (const fields of [
      { email: 'abc@', phone: newDriverDetails('A').phone },
      { email: newDriverDetails('A').email, phone: '12345' },
    ]) {
      const response = await superAdminApi.updateAndResolve(
        request,
        sa,
        req,
        fields,
      );
      await addToReport(response);
      expect(response.status(), JSON.stringify(fields)).toBeGreaterThanOrEqual(
        400,
      );
    }
    expect((await requestOf(request, req.id)).conflict_status).toBe('PENDING');
  },
);

// ---------- Cancel Request ----------

test(
  'TC_095: Verify that Cancel Request declines the request and changes no driver',
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);

    const response = await superAdminApi.cancel(
      request,
      await loginAsSuperAdmin(request),
      req,
    );
    await addToReport(response);

    expect(response.status()).toBe(200);
    expect((await bodyOf(response)).message).toBe(
      'Conflict request declined successfully',
    );
    // The sheet says "Cancelled"; the app says DECLINED
    expect((await requestOf(request, req.id)).conflict_status).toBe('DECLINED');
    const inA = await driverIn(request, 'A', req.existingDriver.email);
    expect(inA.status).toBe('active');
    const inB = await driverIn(request, 'B', req.newDriver.email);
    expect(inB?.allow_signin ?? false).toBe(false);
  },
);

// ---------- Access ----------

test(
  "TC_074: Verify that an owner cannot use the Super Admin's actions",
  tags,
  async ({ request }) => {
    const req = await raiseRequest(request);
    const owner = await login('B');

    const response = await superAdminApi.quickAccept(request, owner, req);
    await addToReport(response);

    expect([401, 403]).toContain(response.status());
    expect((await requestOf(request, req.id)).conflict_status).toBe('PENDING');
  },
);
