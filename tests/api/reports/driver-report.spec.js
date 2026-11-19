// SCENARIO: the admin uploads the Netradyne "Drivers-Report" CSV in Workflow → Daily → Driver Report, and Reports →
// Driver Report shows every driver's minutes and event counts of the file for that date. Test cases DR-01 … DR-09 of
// Report_Upload_Extraction_Test_Cases_v2.pdf.
//
// Station: AQWA (REPORT_* in .env, user arth). Date: 2026-10-22 (the date in the file name; the report itself covers
// 21 Oct). Before the first run AQWA had NO Driver Report data for 2026-10-17 … 2026-10-22 (checked 2026-11-17, read
// only). The file has 230 drivers with their Netradyne ID (one "Unknown Driver" without an ID). The web app only checks
// that the file name contains "driver" and the date. Uploading the same date again needs replace=true. The web app
// cannot delete an upload: the tests end with the original file on 2026-10-22.
//
// The tests run one after the other in this order: see playwright.config.js.

const path = require('path');
const { test, expect } = require('@playwright/test');
const reports = require('../../../api/reports');

const date = '2026-10-22';
const report = 'netradyne_driver_report';
const file = reports.files.driverReport22Oct;
const source = reports.readDriverReport(file);
const keys = source.headers.map(reports.driverReportKey);
const col = (h) => source.headers.indexOf(h);
const ID = col('Driver ID');
const withId = source.rows.filter((r) => r[ID].trim() !== '');
// A driver of the file used to change values (DR-08 / DR-09). The server saves only drivers with events
// (Total Events > 0), so it is jake ingenito (2 events).
const jake = source.rows.find((r) => r[col('Driver Name')] === 'jake ingenito');

let user;
test.beforeAll(async () => {
  if (!process.env.REPORT_EMAIL) return;
  user = await reports.login();
});
test.beforeEach(() => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
});

const upload = (request, f, replace) => reports.uploadDaily(request, user, { file: f, date, report, replace });
async function saved(request) {
  const { status, body } = await reports.driverReport(request, user, date, date);
  expect(status).toBe(200);
  return body.data ?? [];
}
// A copy of the report with the same report lines and file name, changed by fn({ headers, rows })
function changedCopy(testInfo, fn) {
  const copy = { top: source.top, headers: [...source.headers], rows: source.rows.map((r) => [...r]) };
  fn(copy);
  const out = testInfo.outputPath(path.basename(file));
  reports.writeDriverReport(out, copy);
  return out;
}
async function expectUnchanged(request, before) {
  const after = await saved(request);
  expect(after, 'still the same rows').toHaveLength(before.length);
  const ids = new Set(after.map((r) => r._id + r.updated_at));
  for (const r of before) expect(ids.has(r._id + r.updated_at), r.metrics?.name + ' not changed').toBe(true);
}

test(
  'DR-01: Verify that the Driver Report CSV of 22 Oct uploads and every driver with a Netradyne ID is in the report',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    let response = await upload(request, file);
    if (response.status() === 409) response = await upload(request, file, true); // date already has data (earlier run)
    expect(response.status(), await response.text()).toBe(200);
    const rows = await saved(request);
    const ids = new Set(rows.map((r) => r.netradyne_id));
    expect(withId.filter((r) => !ids.has(r[ID])).map((r) => r[0]), 'drivers of the file not saved').toEqual([]);
    expect(new Set(rows.map((r) => r.netradyne_id + '|' + r.metrics?.name)).size, 'no duplicate rows').toBe(rows.length);
    testInfo.annotations.push({ type: 'rows saved', description: `${rows.length} (file: ${source.rows.length}, of which ${source.rows.length - withId.length} without a Netradyne ID)` });
  },
);

test(
  'DR-02: Verify that every value of the report matches the CSV, including Camera Obstruction and U Turn',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const byId = Object.fromEntries((await saved(request)).map((r) => [r.netradyne_id, r.metrics]));
    const wrong = [];
    for (const row of withId) {
      const m = byId[row[ID]];
      if (!m) {
        wrong.push(row[0] + ': not saved');
        continue;
      }
      keys.forEach((k, i) => {
        if (!(k in m)) wrong.push(`${row[0]} ${k}: column not saved`);
        else if (String(m[k]).trim() !== row[i].trim()) wrong.push(`${row[0]} ${k}: file "${row[i]}", saved "${m[k]}"`);
      });
    }
    expect(wrong.slice(0, 50), `values that differ from the file (${wrong.length})`).toEqual([]);
  },
);

test(
  'DR-04: Verify that an Excel file is refused in the Driver Report slot and the report of 22 Oct does not change',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const before = await saved(request);
    for (const f of [reports.files.allAlert20Oct, reports.files.xlsx]) {
      const response = await upload(request, f, true);
      expect.soft(response.status(), path.basename(f) + ' refused').toBeGreaterThanOrEqual(400);
    }
    await expectUnchanged(request, before);
  },
);

test(
  'DR-05: Verify that a CSV without the Driver ID column, or with "Driver Name" renamed, is refused with a clear error',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    const before = await saved(request);
    const variants = [
      ['without "Driver ID"', 'driver id', (c) => {
        c.headers.splice(ID, 1);
        c.rows.forEach((r) => r.splice(ID, 1));
      }],
      ['"Driver Name" renamed to "Name"', 'driver name', (c) => {
        c.headers[col('Driver Name')] = 'Name';
      }],
    ];
    for (const [label, column, change] of variants) {
      const response = await upload(request, changedCopy(testInfo, change), true);
      const text = await response.text();
      expect.soft(response.status(), label + ': refused').toBeGreaterThanOrEqual(400);
      expect.soft(text.toLowerCase(), label + ': the error names the column').toContain(column);
    }
    await expectUnchanged(request, before);
  },
);

test(
  'DR-06: Verify that a CSV with headers only is refused and nothing is saved',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    const before = await saved(request);
    const response = await upload(request, changedCopy(testInfo, (c) => (c.rows = [])), true);
    expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
    await expectUnchanged(request, before);
  },
);

test(
  'DR-08: Verify that a CSV with the same driver twice uploads without a duplicate key error (record what is kept)',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    const twice = [...jake];
    twice[col('Minutes Analyzed')] = '999';
    const f = changedCopy(testInfo, (c) => c.rows.push(twice));
    const response = await upload(request, f, true);
    const text = await response.text();
    expect(response.status(), text).toBe(200);
    expect(text).not.toMatch(/findAndModify|E11000|duplicate key/i);
    const his = (await saved(request)).filter((r) => r.netradyne_id === jake[ID]);
    testInfo.annotations.push({
      type: 'same driver twice: saved as',
      description: `${his.length} row(s), minutes_analyzed = ${his.map((r) => r.metrics?.minutes_analyzed).join(', ')} (file: ${jake[col('Minutes Analyzed')]} then 999)`,
    });
    expect(his.length, 'the driver is saved').toBeGreaterThan(0);
  },
);

test(
  'DR-09: Verify that uploading the same date again asks to replace, and replacing overwrites without doubling',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    const without = await upload(request, file);
    expect(without.status(), 'the date already has data: "already Exist … update it?"').toBe(409);

    const f = changedCopy(testInfo, (c) => {
      c.rows.find((r) => r[ID] === jake[ID])[col('Minutes Analyzed')] = '777';
    });
    const response = await upload(request, f, true);
    expect(response.status(), await response.text()).toBe(200);
    let rows = await saved(request);
    let his = rows.filter((r) => r.netradyne_id === jake[ID]);
    expect(his, 'one row for the driver').toHaveLength(1);
    expect(his[0].metrics.minutes_analyzed, 'the changed value is shown').toBe('777');

    // Clean-up: the original file again
    const back = await upload(request, file, true);
    expect(back.status(), await back.text()).toBe(200);
    rows = await saved(request);
    his = rows.filter((r) => r.netradyne_id === jake[ID]);
    expect(his).toHaveLength(1);
    expect(his[0].metrics.minutes_analyzed).toBe(jake[col('Minutes Analyzed')]);
    expect(new Set(rows.map((r) => r.netradyne_id + '|' + r.metrics?.name)).size, 'no duplicate rows').toBe(rows.length);
  },
);

// Not automated yet
test.fixme('DR-03: Verify that the scorecard link shows the Driver Report violation counts (sends the scorecard link to drivers)', () => {});
test.fixme('DR-07: Verify that uploading with the web app in Spanish does not open an error page (screen test, to be added to the UI file)', () => {});
