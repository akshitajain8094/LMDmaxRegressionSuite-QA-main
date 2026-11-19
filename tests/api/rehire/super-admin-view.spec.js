const { test, expect } = require('@playwright/test');
const {
  login,
  bodyOf,
  loginAsSuperAdmin,
  superAdminApi,
  isOwnRequest,
} = require('../../../api/rehire');
const addToReport = require('../../../api/report');

// Super Admin → Conflict Requests, the server side. VIEW ONLY: these tests only read (GET); the actions on
// the tests' own requests are in super-admin-actions.spec.js. Most requests on staging were raised by other
// people, so the tests check the shape and the rules, not fixed values. Statuses: PENDING, RESOLVED, DECLINED.

const tags = { tag: ['@rehire'] };

test.skip(!process.env.SUPER_ADMIN_EMAIL, 'SUPER_ADMIN_* is not set in .env');

// The first page of the list (20 requests, newest first)
async function firstPage(request) {
  const response = await superAdminApi.list(
    request,
    await loginAsSuperAdmin(request),
  );
  await addToReport(response);
  expect(response.status()).toBe(200);
  return (await bodyOf(response)).data;
}

test(
  'TC_069, TC_070: Verify that the Super Admin gets the conflict requests with requester, company, user, conflict and status',
  tags,
  async ({ request }) => {
    const requests = await firstPage(request);

    expect(requests.length).toBeGreaterThan(0);
    for (const r of requests) {
      expect(r.requested_by, 'requested by').toBeTruthy();
      expect(r.company_name, 'DSP').toBeTruthy();
      expect(r.affected_user, 'new user').toBeTruthy();
      expect(r.request_type.length, 'conflict details').toBeGreaterThan(0);
      // The sheet says Pending / Resolved / Cancelled; the app says DECLINED for a cancelled request
      expect(['PENDING', 'RESOLVED', 'DECLINED']).toContain(r.conflict_status);
    }
  },
);

test(
  'TC_071, TC_072: Verify that a request shows the new request and the existing user',
  tags,
  async ({ request }) => {
    const sa = await loginAsSuperAdmin(request);
    const [first] = await firstPage(request);

    const response = await superAdminApi.get(request, sa, first._id);
    await addToReport(response);
    expect(response.status()).toBe(200);
    const { detail } = (await bodyOf(response)).data;

    // New request: company, user name, role, email/phone (transporter ID only for a driver)
    expect(detail.sentFrom.companyName).toBeTruthy();
    expect(detail.sentFrom.requestedBy.name).toBeTruthy();
    expect(detail.sentFrom.details.userName).toBeTruthy();
    expect(
      detail.sentFrom.details.emailId || detail.sentFrom.details.phoneNumber,
    ).toBeTruthy();
    expect(detail.sentFrom.details).toHaveProperty('transporterId');
    // Existing user: company, role, status, email/phone
    expect(detail.sentTo.companyName).toBeTruthy();
    expect(detail.sentTo.details.role).toBeTruthy();
    expect(detail.sentTo.details).toHaveProperty('userStatus');
    expect(
      detail.sentTo.details.emailId || detail.sentTo.details.phoneNumber,
    ).toBeTruthy();
  },
);

test(
  'TC_073: Verify that the status of a request is the same in the list and in its details',
  tags,
  async ({ request }) => {
    const sa = await loginAsSuperAdmin(request);
    const requests = await firstPage(request);

    // Not the tests' own requests: the action tests change them at the same time
    for (const r of requests.filter((x) => !isOwnRequest(x)).slice(0, 5)) {
      const response = await superAdminApi.get(request, sa, r._id);
      const one = (await bodyOf(response)).data;
      expect(one.conflict_status, 'request ' + r._id).toBe(r.conflict_status);
      expect(one.detail.conflictState, 'request ' + r._id).toBe(
        r.conflict_status,
      );
    }
  },
);

test(
  'TC_074: Verify that a normal admin (owner) cannot read the conflict requests',
  tags,
  async ({ request }) => {
    const owner = await login('A');

    const list = await superAdminApi.list(request, owner);
    await addToReport(list);
    const count = await superAdminApi.count(request, owner);
    await addToReport(count);

    expect([401, 403]).toContain(list.status());
    expect([401, 403]).toContain(count.status());
  },
);

test(
  'TC_127: Verify that no password is in the conflict request answers',
  tags,
  async ({ request }) => {
    const sa = await loginAsSuperAdmin(request);
    const requests = await firstPage(request);
    const one = await superAdminApi.get(request, sa, requests[0]._id);

    expect(JSON.stringify(requests)).not.toMatch(/password/i);
    expect(await one.text()).not.toMatch(/password/i);
  },
);
