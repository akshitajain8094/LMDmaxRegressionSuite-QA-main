const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const SuperAdminConflictsPage = require('../../../pages/SuperAdminConflictsPage');
const rehire = require('../../../api/rehire');

// Super Admin site → a conflict request → Quick-Accept, Update & Resolve, Cancel Request (sheet REQ-09,
// REQ-10). ONLY on the test's own request (raised through the API: a QA driver of Brothers added again in
// earthhh → Send Request). The page object lets actions through for that one request only and blocks every
// other change; each test ends by checking nothing was blocked. Allowed by the user on 2026-11-05.

const test = base.extend({
  api: async ({}, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: { 'app-type': '2', Origin: process.env.UI_BASE_URL },
    });
    await use(context);
    await context.dispose();
  },
});

const tags = { tag: ['@rehire', '@adds-data'] };

test.skip(
  !process.env.SUPER_ADMIN_EMAIL || !process.env.REHIRE_B_EMAIL,
  'SUPER_ADMIN_* and REHIRE_* are not set in .env',
);

let superAdmin;
test.beforeEach(async ({ page }) => {
  superAdmin = new SuperAdminConflictsPage(page);
});

test.afterEach(async ({ api }) => {
  expect(superAdmin.blocked, 'no other request was changed').toEqual([]);
  await rehire.cleanUpRequests(api);
  await rehire.cleanUp(api);
});

// Raises our own request and opens it as the Super Admin, with actions allowed for it only
async function openOwnRequest(api) {
  const req = await rehire.raiseRequest(api);
  superAdmin.allowActionsFor(req.id);
  await superAdmin.open();
  await superAdmin.openRequest(req.id);
  return req;
}

const statusOf = async (api, req) =>
  (await rehire.requestOf(api, req.id)).conflict_status;

test(
  'TC_099: Verify that a cross-company driver request offers Quick-Accept, Update & Resolve and Cancel Request',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);

    await expect(
      superAdmin.page.getByText('Driver Allow Sign-in'),
    ).toBeVisible();
    await expect(superAdmin.page.getByRole('main')).toContainText(
      req.newDriver.name,
    );
    await expect(superAdmin.quickAccept).toBeVisible();
    await expect(superAdmin.updateAndResolve).toBeVisible();
    await expect(superAdmin.cancelRequest).toBeVisible();
  },
);

test(
  'TC_077, TC_082, TC_101: Verify the Quick-Accept confirmation, and that its Cancel changes nothing',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);

    await superAdmin.quickAccept.click();

    await expect(
      superAdmin.dialog
        .getByRole('heading', {
          name: 'Grant Driver Sign-in & Deactivate Existing Driver',
        })
        .first(),
    ).toBeVisible();
    await expect(superAdmin.dialog).toContainText(
      'This driver exists in another company with active status. Do you want to grant Driver sign-in access to the driver and deactivate the existing driver?',
    );
    await expect(superAdmin.dialog).toContainText(
      'Driver sign-in access will be granted',
    );
    await expect(superAdmin.dialog).toContainText(
      'Existing driver will be marked as inactive',
    );
    await superAdmin.dialogCancel.click();

    expect(await statusOf(api, req)).toBe('PENDING');
    const [inA] = await rehire.driversWithEmail(
      api,
      'A',
      req.existingDriver.email,
    );
    expect(inA.status).toBe('active');
  },
);

test(
  'TC_081, TC_084, TC_100: Verify that Quick-Accept → Confirm resolves the request and makes the driver in A inactive',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);

    await superAdmin.quickAccept.click();
    await superAdmin.confirm.click();

    await expect(superAdmin.toast.first()).toContainText(
      'Conflict resolved and LMD sign-in granted successfully',
    );
    expect(await statusOf(api, req)).toBe('RESOLVED');
    // TC_097: no actions any more
    await superAdmin.openRequest(req.id);
    await expect(superAdmin.quickAccept).toHaveCount(0);
    await expect(superAdmin.cancelRequest).toHaveCount(0);
    const [inA] = await rehire.driversWithEmail(
      api,
      'A',
      req.existingDriver.email,
    );
    expect(inA?.status ?? 'inactive').toBe('inactive');
  },
);

test(
  'TC_090, TC_091: Verify that Update & Resolve with a new phone and email resolves the request',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);
    const fresh = rehire.newDriverDetails('A');

    await superAdmin.updateAndResolve.click();
    await expect(superAdmin.dialog).toContainText('Update Driver Details');
    await expect(superAdmin.dialog).toContainText(
      'Update account details for Brothers',
    );
    await superAdmin.newPhone.fill(fresh.phone);
    await superAdmin.newEmail.fill(fresh.email);
    await superAdmin.dialogUpdateAndResolve.click();

    await expect(superAdmin.toast.first()).toContainText(
      'Conflict resolved successfully',
    );
    expect(await statusOf(api, req)).toBe('RESOLVED');
    const [inA] = await rehire.driversWithEmail(api, 'A', fresh.email);
    expect(inA.phone).toBe(fresh.phone);
  },
);

test(
  'TC_115: Verify that Update & Resolve that still conflicts (only the phone changed) does not resolve the request',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);

    await superAdmin.updateAndResolve.click();
    await superAdmin.newPhone.fill(rehire.newDriverDetails('A').phone);
    await superAdmin.dialogUpdateAndResolve.click();

    // Seen 2026-11-05: nothing is sent and no message tells why (the email still conflicts)
    await expect(superAdmin.dialog).toBeVisible();
    expect(await statusOf(api, req)).toBe('PENDING');
  },
);

test(
  'TC_095: Verify that Cancel Request declines the request and changes no driver',
  tags,
  async ({ api }) => {
    const req = await openOwnRequest(api);

    // Seen 2026-11-05: no "are you sure?" step, the request is declined at once
    await superAdmin.cancelRequest.click();

    await expect(superAdmin.toast.first()).toContainText(
      'Conflict request declined successfully',
    );
    await expect(superAdmin.page.getByText('REQUEST CANCELLED')).toBeVisible();
    expect(await statusOf(api, req)).toBe('DECLINED');
    const [inA] = await rehire.driversWithEmail(
      api,
      'A',
      req.existingDriver.email,
    );
    expect(inA.status).toBe('active');
  },
);
