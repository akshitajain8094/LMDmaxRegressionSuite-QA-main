const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const SuperAdminConflictsPage = require('../../../pages/SuperAdminConflictsPage');
const rehire = require('../../../api/rehire');

// Super Admin site → Conflict Requests (sheet "Rehire & Super Admin Conflict Handling", REQ-08 to REQ-10).
// VIEW ONLY: the tests look at the list and at requests other people raised. They never click an action or
// Clear Data, and the page object blocks every non-GET request after the login; each test ends by checking
// nothing was blocked. The actions on the tests' own requests are in super-admin-actions.spec.js.

// A request context on the API server, to find a request of the right kind (newest 10 pages)
const test = base.extend({
  api: async ({}, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: process.env.API_BASE_URL,
    });
    await use(context);
    await context.dispose();
  },
});

const tags = { tag: ['@rehire'] };

test.skip(
  !process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_URL,
  'SUPER_ADMIN_* is not set in .env',
);

let superAdmin;

test.beforeEach(async ({ page }) => {
  superAdmin = new SuperAdminConflictsPage(page);
});

test.afterEach(async () => {
  expect(superAdmin.blocked, 'no request tried to change data').toEqual([]);
});

const existingRole = (r) => r.detail?.sentTo?.details?.role;
// Pending, and not one of the tests' own requests (the action tests change those at the same time)
const isPending = (r) =>
  r.conflict_status === 'PENDING' && !rehire.isOwnRequest(r);

test(
  'TC_069: Verify that the Super Admin sees the Conflict Requests section',
  tags,
  async () => {
    await superAdmin.open();
    await expect(superAdmin.menuLink).toBeVisible();
    await superAdmin.openList();

    await expect(superAdmin.heading).toBeVisible();
    const headers = await superAdmin.table
      .getByRole('columnheader')
      .allInnerTexts();
    expect(headers.map((h) => h.trim())).toEqual(
      expect.arrayContaining([
        'Requested by',
        'DSP Details',
        'New User',
        'Role',
        'Transporter ID',
        'Email ID & Phone Number',
        'Conflict Status',
        'Actions',
      ]),
    );
  },
);

test(
  'TC_070: Verify that each request row shows the requester, the user, the conflict status and See More',
  tags,
  async () => {
    await superAdmin.open();
    const requests = await superAdmin.openList();
    const first = requests[0];

    const row = superAdmin.row(first.affected_user, first.conflict_status);
    await expect(row.first()).toContainText(first.requested_by);
    await expect(row.first()).toContainText(first.company_name);
    await expect(
      row.first().getByRole('button', { name: 'See More' }),
    ).toBeVisible();
  },
);

test(
  'TC_071, TC_072: Verify that a request shows the new request and the existing user',
  tags,
  async ({ api }) => {
    await superAdmin.open();
    const pending = await rehire.findRequest(api, isPending);
    test.skip(!pending, 'No pending request in the newest 200');

    await superAdmin.openRequest(pending._id);

    await expect(superAdmin.sentFrom).toBeVisible();
    await expect(superAdmin.sentFor).toBeVisible();
    for (const label of [
      'User Name',
      'Requested Role',
      'Role',
      'Email ID',
      'Phone Number',
      'Transporter ID',
      'User Status',
      'Station Code',
    ]) {
      await expect(
        superAdmin.page.getByText(label, { exact: true }).first(),
        label,
      ).toBeVisible();
    }
    await expect(superAdmin.page.getByRole('main')).toContainText(
      pending.detail.sentFrom.details.userName,
    );
    await expect(superAdmin.page.getByRole('main')).toContainText(
      pending.detail.sentTo.companyName,
    );
  },
);

test(
  'TC_076: Verify that Quick-Accept is offered when a driver is requested as an admin (Driver → Admin) (BUG-UI-013)',
  { tag: ['@rehire', '@knownbug'] },
  async ({ api }) => {
    await superAdmin.open();
    const pending = await rehire.findRequest(
      api,
      (r) =>
        isPending(r) &&
        r.detail?.subjectType === 'admin' &&
        existingRole(r) === 'driver',
    );
    test.skip(!pending, 'No pending Driver → Admin request in the newest 200');

    await superAdmin.openRequest(pending._id);

    // Only looked at, never clicked
    await expect(superAdmin.quickAccept).toBeVisible();
    await expect(superAdmin.updateAndResolve).toBeVisible();
  },
);

test(
  'TC_080, TC_083, TC_089: Verify that Quick-Accept is not offered when the existing user is an admin or owner',
  tags,
  async ({ api }) => {
    await superAdmin.open();
    const pending = await rehire.findRequest(
      api,
      (r) => isPending(r) && ['admin', 'owner'].includes(existingRole(r)),
    );
    test.skip(
      !pending,
      'No pending request with an existing admin in the newest 200',
    );

    await superAdmin.openRequest(pending._id);

    await expect(superAdmin.quickAccept).toHaveCount(0);
    await expect(superAdmin.updateAndResolve).toBeVisible();
  },
);

test(
  'TC_095: Verify that a pending request offers Cancel Request',
  tags,
  async ({ api }) => {
    await superAdmin.open();
    const pending = await rehire.findRequest(api, isPending);
    test.skip(!pending, 'No pending request in the newest 200');

    await superAdmin.openRequest(pending._id);

    await expect(superAdmin.cancelRequest).toBeVisible();
  },
);

test(
  'TC_096: Verify that a pending request offers Send Back for Update (BUG-UI-012)',
  { tag: ['@rehire', '@knownbug'] },
  async ({ api }) => {
    await superAdmin.open();
    const pending = await rehire.findRequest(api, isPending);
    test.skip(!pending, 'No pending request in the newest 200');

    await superAdmin.openRequest(pending._id);

    // 2026-11-04/05: no "Send Back for Update" on any pending request (to confirm with the BA)
    await expect(superAdmin.sendBack).toBeVisible();
  },
);

test(
  'TC_097: Verify that a resolved request has no actions any more',
  tags,
  async ({ api }) => {
    await superAdmin.open();
    const resolved = await rehire.findRequest(
      api,
      (r) => r.conflict_status === 'RESOLVED',
    );
    test.skip(!resolved, 'No resolved request in the newest 200');

    await superAdmin.openRequest(resolved._id);

    await expect(superAdmin.page.getByRole('main')).toContainText('RESOLVED');
    await expect(superAdmin.quickAccept).toHaveCount(0);
    await expect(superAdmin.updateAndResolve).toHaveCount(0);
    await expect(superAdmin.cancelRequest).toHaveCount(0);
  },
);

test(
  'TC_074: Verify that a normal admin (owner) cannot open the Super Admin conflict requests',
  tags,
  async () => {
    const answer = await superAdmin.open(
      process.env.REHIRE_A_EMAIL,
      process.env.REHIRE_A_PASSWORD,
    );
    expect(answer.status(), 'the owner cannot sign in here').not.toBe(200);

    await superAdmin.page.goto(superAdmin.url + '/conflict_requests');
    await expect(superAdmin.table).toHaveCount(0);
  },
);
