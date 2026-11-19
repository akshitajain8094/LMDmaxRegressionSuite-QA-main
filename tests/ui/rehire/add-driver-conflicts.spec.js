const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const AddDriverPage = require('../../../pages/AddDriverPage');
const rehire = require('../../../api/rehire');

// Leaderboard → Add Driver: the conflict popups (sheet "Rehire & Super Admin Conflict Handling", REQ-01 to
// REQ-04). Company A = Brothers (ABC), company B = earthhh (TTT). Each test prepares its own QA drivers through
// the API and makes every driver it added inactive at the end; a request it sent to the Super Admin is
// cancelled (only the tests' own requests, allowed on 2026-11-05).

const test = base.extend({
  // A request context on the API server, for the set-up and the checks
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
  !process.env.REHIRE_A_EMAIL || !process.env.REHIRE_B_EMAIL,
  'REHIRE_* is not set in .env',
);

// Drivers added through the screen (not known to the API helper): made inactive after the test
const addedOnScreen = [];

test.afterEach(async ({ api }) => {
  for (const { company, email } of addedOnScreen.splice(0)) {
    for (const d of await rehire.driversWithEmail(api, company, email)) {
      if (d.status === 'active') await rehire.deactivate(api, company, d);
    }
  }
  await rehire.cleanUpRequests(api);
  await rehire.cleanUp(api);
});

// The Super Admin's requests for a driver email (newest first page)
async function requestsFor(api, email) {
  const sa = await rehire.loginAsSuperAdmin(api);
  const list = await rehire.bodyOf(await rehire.superAdminApi.list(api, sa));
  return (list.data ?? []).filter(
    (r) => r.detail?.sentFrom?.details?.requestedEmail === email,
  );
}

test(
  'TC_009: Verify that adding an active driver again shows "This driver already exists" with Close only',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    const screen = new AddDriverPage(page);
    await screen.open('A');

    const answer = await screen.addDriver(ravi);

    expect(answer.status()).toBe(409);
    await expect(screen.alreadyExists).toBeVisible();
    await expect(
      page.getByText('No changes needed – this driver is already active'),
    ).toBeVisible();
    await expect(page.getByText('Email conflict')).toBeVisible();
    await expect(page.getByText('Phone number conflict')).toBeVisible();
    await expect(page.getByText('Transporter ID conflict')).toBeVisible();
    await expect(screen.reactivate).toHaveCount(0);
    await screen.close.click();
    expect(await rehire.driversWithEmail(api, 'A', ravi.email)).toHaveLength(1);
  },
);

test(
  'TC_001, TC_005: Verify that adding an inactive driver again offers Reactivate & Resolve, and Cancel changes nothing',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    await rehire.deactivate(api, 'A', ravi);
    const screen = new AddDriverPage(page);
    await screen.open('A');

    await screen.addDriver(ravi);

    await expect(screen.alreadyExists).toBeVisible();
    await expect(
      page.getByText(/linked to an existing inactive driver account/),
    ).toBeVisible();
    await expect(page.getByText('INACTIVE', { exact: true })).toBeVisible();
    await expect(screen.reactivate).toBeVisible();
    await screen.cancel.click();

    // TC_005: no new driver, the old one is still inactive
    const withEmail = await rehire.driversWithEmail(api, 'A', ravi.email);
    expect(withEmail.filter((d) => d.status === 'active')).toHaveLength(0);
  },
);

test(
  'TC_002: Verify that Reactivate & Resolve activates the existing driver (one record)',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    await rehire.deactivate(api, 'A', ravi);
    const screen = new AddDriverPage(page);
    await screen.open('A');
    await screen.addDriver(ravi);

    const update = page.waitForResponse(
      (res) =>
        res.url().includes('/drivers/v1/driver/' + ravi.id) &&
        res.request().method() === 'PATCH',
    );
    await screen.reactivate.click();
    expect((await update).status()).toBe(201);

    const withEmail = await rehire.driversWithEmail(api, 'A', ravi.email);
    expect(withEmail).toHaveLength(1);
    expect(String(withEmail[0].id)).toBe(String(ravi.id));
    expect(withEmail[0].status).toBe('active');
  },
);

test(
  'TC_011, TC_013: Verify that a similar name lists the similar driver, and Skip & Add Driver As New adds the new one',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    const typed = rehire.newDriverDetails('A', { name: ravi.name + 'n' });
    const screen = new AddDriverPage(page);
    await screen.open('A');

    await screen.addDriver(typed);

    await expect(screen.similarNames).toBeVisible();
    await expect(screen.similarDriver(ravi.name)).toBeVisible();
    await expect(screen.updateAndResolve).toBeDisabled();
    addedOnScreen.push({ company: 'A', email: typed.email });
    await screen.skipAndAdd.click();

    await expect
      .poll(
        async () =>
          (await rehire.driversWithEmail(api, 'A', typed.email)).length,
      )
      .toBe(1);
    const [still] = await rehire.driversWithEmail(api, 'A', ravi.email);
    expect(still.name).toBe(ravi.name);
  },
);

test(
  'TC_012: Verify that picking the similar driver and Update & Resolve updates that driver',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    const typed = rehire.newDriverDetails('A', { name: ravi.name + 'n' });
    const screen = new AddDriverPage(page);
    await screen.open('A');
    await screen.addDriver(typed);

    await screen.similarDriver(ravi.name).click();
    await expect(screen.updateAndResolve).toBeEnabled();
    await screen.updateAndResolve.click();

    await expect
      .poll(
        async () =>
          (await rehire.driversWithEmail(api, 'A', typed.email)).length,
      )
      .toBe(1);
    const [now] = await rehire.driversWithEmail(api, 'A', typed.email);
    expect(String(now.id)).toBe(String(ravi.id));
  },
);

test(
  'TC_015: Verify that a new driver without any conflict is added without a popup',
  tags,
  async ({ page }) => {
    const fresh = rehire.newDriverDetails('A');
    const screen = new AddDriverPage(page);
    await screen.open('A');
    addedOnScreen.push({ company: 'A', email: fresh.email });

    const answer = await screen.addDriver(fresh);

    expect(answer.status()).toBe(200);
    await expect(screen.alreadyExists).toHaveCount(0);
    await expect(screen.similarNames).toHaveCount(0);
    await expect(screen.accessIssue).toHaveCount(0);
  },
);

test(
  'TC_035, TC_037: Verify that a driver of another company is "added with access issue", and Cancel sends no request',
  tags,
  async ({ page, api }) => {
    const ravi = await rehire.addDriver(api, 'A');
    const typed = rehire.newDriverDetails('B', {
      email: ravi.email,
      phone: ravi.phone,
    });
    const screen = new AddDriverPage(page);
    await screen.open('B');
    addedOnScreen.push({ company: 'B', email: typed.email });

    await screen.addDriver(typed);

    await expect(
      page.getByText(typed.name + ' added with access issue.'),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Do you want to send a request to Super Admin to resolve this issue?',
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Conflicted driver will not get app access until resolved by Super Admin',
      ),
    ).toBeVisible();
    // TC_042 on the screen: the popup names no other company or driver
    await expect(page.getByText('Brothers')).toHaveCount(0);
    await screen.cancel.click();

    expect(await requestsFor(api, typed.email)).toEqual([]);
    const [inB] = await rehire.driversWithEmail(api, 'B', typed.email);
    expect(inB?.allow_signin ?? false).toBe(false);
  },
);

test(
  'TC_036: Verify that Send Request To Super Admin creates a pending request',
  tags,
  async ({ page, api }) => {
    rehire.requireSuperAdminRequests();
    const ravi = await rehire.addDriver(api, 'A');
    const typed = rehire.newDriverDetails('B', {
      email: ravi.email,
      phone: ravi.phone,
    });
    const screen = new AddDriverPage(page);
    await screen.open('B');
    addedOnScreen.push({ company: 'B', email: typed.email });
    await screen.addDriver(typed);

    const sent = page.waitForResponse(
      (res) =>
        res.url().endsWith('/users/v1/conflicted-requests') &&
        res.request().method() === 'POST',
    );
    await screen.sendRequest.click();
    const body = await (await sent).json();

    expect(body.message).toBe('Conflict request created successfully');
    const [req] = await requestsFor(api, typed.email);
    expect(req.conflict_status).toBe('PENDING');
    // Our own request: cancelled after the test
    await rehire.superAdminApi.cancel(
      api,
      await rehire.loginAsSuperAdmin(api),
      { id: req._id },
    );
  },
);

test(
  'TC_143: Verify that a lost connection on Send Request shows an error, creates no request, and a retry works (BUG-UI-014)',
  { tag: ['@rehire', '@adds-data', '@knownbug'] },
  async ({ page, api }) => {
    rehire.requireSuperAdminRequests();
    const ravi = await rehire.addDriver(api, 'A');
    const typed = rehire.newDriverDetails('B', {
      email: ravi.email,
      phone: ravi.phone,
    });
    const screen = new AddDriverPage(page);
    await screen.open('B');
    addedOnScreen.push({ company: 'B', email: typed.email });
    await screen.addDriver(typed);

    await page.route('**/users/v1/conflicted-requests', (route) =>
      route.request().method() === 'POST'
        ? route.abort('internetdisconnected')
        : route.continue(),
    );
    await screen.sendRequest.click();

    // 2026-11-05: no message at all, the popup stays as it was (BUG-UI-014)
    await expect.soft(page.getByRole('alert').first()).toBeVisible();
    expect(await requestsFor(api, typed.email)).toEqual([]);

    // Retry with the connection back: one request
    await page.unroute('**/users/v1/conflicted-requests');
    if (await screen.sendRequest.isVisible()) {
      const sent = page.waitForResponse(
        (res) =>
          res.url().endsWith('/users/v1/conflicted-requests') &&
          res.request().method() === 'POST',
      );
      await screen.sendRequest.click();
      expect((await sent).status()).toBe(200);
      const created = await requestsFor(api, typed.email);
      expect(created).toHaveLength(1);
      await rehire.superAdminApi.cancel(
        api,
        await rehire.loginAsSuperAdmin(api),
        { id: created[0]._id },
      );
    }
  },
);
