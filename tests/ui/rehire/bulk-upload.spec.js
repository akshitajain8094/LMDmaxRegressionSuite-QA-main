const path = require('path');
const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const BulkUploadPage = require('../../../pages/BulkUploadPage');
const rehire = require('../../../api/rehire');

// Other Actions → Bulk Upload → Drivers, on the screen (sheet REQ-05): wrong file type, the preview, the
// conflict step, and a lost connection during the upload. Company A = Brothers (ABC). Every driver a test may
// have created is made inactive at the end.

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

test.skip(!process.env.REHIRE_A_EMAIL, 'REHIRE_A_* is not set in .env');

// Drivers the screen may have added: made inactive after the test
const uploaded = [];
test.afterEach(async ({ api }) => {
  for (const d of uploaded.splice(0)) {
    for (const x of await rehire.driversWithEmail(api, 'A', d.email)) {
      if (x.status === 'active') await rehire.deactivate(api, 'A', x);
    }
  }
  await rehire.cleanUp(api);
});

const fresh = (n) =>
  Array.from({ length: n }, () => {
    // Letters only: the preview marks a name with digits or other signs as wrong
    const d = rehire.newDriverDetails('A');
    return { ...d, name: d.name.replace(/[^A-Za-z ]/g, '') };
  });

test(
  'TC_055: Verify that a file that is not an xlsx is refused with a clear message',
  tags,
  async ({ page }) => {
    const screen = new BulkUploadPage(page);
    await screen.open('A');

    await screen.chooseFile(
      path.join(__dirname, '../../../test-files/announcements/qa-sample.pdf'),
    );

    await expect(page.getByText('Only XLSX file is allowed.')).toBeVisible();
    await expect(screen.submit).toHaveCount(0);
  },
);

test(
  'TC_044: Verify that a file of new drivers shows them in the preview and adds them all',
  tags,
  async ({ page, api }) => {
    const rows = fresh(2);
    uploaded.push(...rows);
    const screen = new BulkUploadPage(page);
    await screen.open('A');

    await screen.chooseDrivers(rows);
    for (const d of rows) await expect(screen.row(d.email)).toBeVisible();
    const answer = page.waitForResponse((r) =>
      r.url().includes('/driver/upload'),
    );
    await screen.submit.click();

    expect(
      rehire.bulkCounts((await answer.then((r) => r.json())).message).created,
    ).toBe(2);
    await expect(
      page.getByText('All Drivers Added Successfully'),
    ).toBeVisible();
    for (const d of rows) {
      expect(
        await rehire.driversWithEmail(api, 'A', d.email),
        d.email,
      ).toHaveLength(1);
    }
  },
);

test(
  'TC_045, TC_050: Verify that a row matching an existing driver goes to the conflict step and the other rows are added',
  tags,
  async ({ page, api }) => {
    const existing = await rehire.addDriver(api, 'A', {
      name: fresh(1)[0].name,
    });
    const [unique] = fresh(1);
    const exact = {
      ...rehire.newDriverDetails('A'),
      name: existing.name,
      email: existing.email,
      phone: existing.phone,
      transporter_id: existing.transporter_id,
    };
    uploaded.push(unique);
    const screen = new BulkUploadPage(page);
    await screen.open('A');

    await screen.chooseDrivers([unique, exact]);
    await screen.submit.click();

    await expect(page.getByText("1 driver couldn't be added")).toBeVisible();
    await expect(page.getByText('Email conflict').first()).toBeVisible();
    await expect(screen.markAsResolve).toBeVisible();
    expect(await rehire.driversWithEmail(api, 'A', unique.email)).toHaveLength(
      1,
    );
    expect(
      await rehire.driversWithEmail(api, 'A', existing.email),
    ).toHaveLength(1);
    await screen.cancelBulkAdd.click();
  },
);

test(
  'TC_053: Verify that a row with a wrong email is marked in the preview and Submit says which rows to fix',
  tags,
  async ({ page, api }) => {
    const [valid, wrong] = fresh(2);
    wrong.email = 'abc@';
    uploaded.push(valid);
    const screen = new BulkUploadPage(page);
    await screen.open('A');

    await screen.chooseDrivers([valid, wrong]);
    await screen.submit.click();

    await expect(
      page.getByText(
        'The highlighted rows have issues to insert in the system. Please click on the edit button to resolve the issues.',
      ),
    ).toBeVisible();
    expect(await rehire.driversWithEmail(api, 'A', valid.email)).toHaveLength(
      0,
    );
  },
);

test(
  'TC_056: Verify that a lost connection during the upload shows an error and adds no driver',
  tags,
  async ({ page, api }) => {
    const rows = fresh(2);
    uploaded.push(...rows);
    const screen = new BulkUploadPage(page);
    await screen.open('A');
    await screen.chooseDrivers(rows);

    // The upload never reaches the server
    await page.route('**/driver/upload', (route) =>
      route.abort('internetdisconnected'),
    );
    await screen.submit.click();

    await expect(screen.alert.first()).toBeVisible();
    for (const d of rows) {
      expect(await rehire.driversWithEmail(api, 'A', d.email)).toHaveLength(0);
    }
    // Uploading again works
    await page.unroute('**/driver/upload');
    await screen.submit.click();
    await expect(
      page.getByText('All Drivers Added Successfully'),
    ).toBeVisible();
  },
);
