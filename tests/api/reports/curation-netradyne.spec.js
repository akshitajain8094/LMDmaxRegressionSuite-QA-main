// SCENARIO: the All Alert report has drivers' names but no Netradyne ID; the Driver Report of the same date has names
// and Netradyne IDs. Netradyne curation must merge the same driver of both reports into ONE record that carries the
// Netradyne ID, and never merge different names. Test cases CU-01 … CU-08 of Report_Upload_Extraction_Test_Cases_v2.pdf
// (PWA-3976).
//
// Station: AQWA (REPORT_* in .env, user arth). Small made-up files (drivers "Qa Curation …", not on AQWA), in the
// layout of the real Netradyne exports:
//   2026-10-19: All Alert first, then Driver Report (CU-01 … CU-05)
//   2026-10-21: Driver Report first, then All Alert (CU-07)
// Before the first run AQWA had no All Alert / Driver Report data on these dates (checked 2026-11-17, read only); the
// tests skip if other data is there. The web app cannot delete uploads or curation entries: the "Qa Curation" entries
// stay in AQWA's Netradyne curation.
//
// The tests run one after the other in this order: see playwright.config.js.

const { test, expect } = require('@playwright/test');
const reports = require('../../../api/reports');
const { readXlsx, writeXlsx } = require('../../../api/xlsx');

const date = '2026-10-19';
const reverseDate = '2026-10-21';

// All Alert layout (report lines + header) and one real alert row as a template
const alertSheet = readXlsx(reports.files.allAlert20Oct);
const alertHeaderRow = alertSheet.findIndex((r) => r[0] === 'S.No');
const alertHeaders = alertSheet[alertHeaderRow];
const alertTemplate = alertSheet[alertHeaderRow + 1];
const ac = (h) => alertHeaders.indexOf(h);
// Driver Report layout and one real row as a template
const driverSource = reports.readDriverReport(reports.files.driverReport22Oct);
const dc = (h) => driverSource.headers.indexOf(h);
// The server saves only drivers with events (Total Events > 0): the template is jake ingenito (2 events)
const driverTemplate = driverSource.rows.find((r) => r[dc('Driver Name')] === 'jake ingenito');

// The made-up drivers: name in the All Alert report, name + Netradyne ID in the Driver Report
const drivers = {
  exact: { alert: 'Qa Curation Alpha', driver: 'Qa Curation Alpha', id: 'QACURATIONALPHA0001' }, // CU-01
  caseOnly: { alert: 'qa curation bravo', driver: 'Qa Curation Bravo', id: 'QACURATIONBRAVO0001' }, // CU-02
  spaces: { alert: 'Qa  Curation Charlie ', driver: 'Qa Curation Charlie', id: 'QACURATIONCHARLIE0001' }, // CU-03
  different: { alert: 'Qa Curation Delt', driver: 'Qa Curation Delta', id: 'QACURATIONDELTA0001' }, // CU-04
};
const reverse = { alert: 'Qa Curation Echo', driver: 'Qa Curation Echo', id: 'QACURATIONECHO0001' }; // CU-07

let user;
test.beforeAll(async () => {
  if (!process.env.REPORT_EMAIL) return;
  user = await reports.login();
});
test.beforeEach(() => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
});

const label = (d) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' }); // "Oct 19, 2026"
function alertFile(testInfo, on, list) {
  const [m, d, y] = label(on).replace(',', '').split(' ');
  const out = testInfo.outputPath(`All Alerts Report( ${m} ${d} ${y} ).xlsx`);
  const rows = list.map((x, i) => {
    const r = [...alertTemplate];
    r[ac('S.No')] = String(i + 1);
    r[ac('Driver Name')] = x.alert;
    r[ac('Driver Id')] = '';
    r[ac('Timestamp(EDT)')] = `${on} 1${i}:00:00`;
    return r;
  });
  writeXlsx(out, [...alertSheet.slice(0, alertHeaderRow), alertHeaders, ...rows]);
  return out;
}
function driverFile(testInfo, on, list) {
  const [m, d, y] = label(on).replace(',', '').split(' ');
  const out = testInfo.outputPath(`Drivers-Report(${m}-${d}-${y}).csv`);
  const rows = list.map((x) => {
    const r = [...driverTemplate];
    r[dc('Driver Name')] = x.driver;
    r[dc('Driver ID')] = x.id;
    return r;
  });
  reports.writeDriverReport(out, { top: driverSource.top, headers: driverSource.headers, rows });
  return out;
}
const isOurs = (name) => /^qa\s+curation/i.test(String(name ?? '').trim());
// Never overwrite data that is not ours on the test dates
async function skipIfTaken(request, on) {
  const { body: a } = await reports.allAlerts(request, user, on, on);
  const { body: d } = await reports.driverReport(request, user, on, on);
  const others = [...(a.data ?? []), ...(d.data ?? [])].filter((r) => !isOurs(r.metrics?.name));
  test.skip(others.length > 0, `AQWA already has other All Alert / Driver Report data on ${on}`);
}
async function upload(request, f, on, report) {
  let response = await reports.uploadDaily(request, user, { file: f, date: on, report });
  if (response.status() === 409) response = await reports.uploadDaily(request, user, { file: f, date: on, report, replace: true });
  expect(response.status(), await response.text()).toBe(200);
}
// The "Qa Curation" records of Netradyne curation, as { name, netradyne_id }
async function ourCurations(request) {
  const { status, body } = await reports.netradyneCuration(request, user);
  expect(status).toBe(200);
  return (body.data?.updatedCurations ?? [])
    .map((c) => ({ name: c.driver_name ?? c.name, netradyne_id: c.netradyne_id ?? '' }))
    .filter((c) => isOurs(c.name));
}
const norm = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
const recordsOf = (list, name) => list.filter((c) => norm(c.name) === norm(name));

test(
  'CU setup: Verify that the All Alert and then the Driver Report of 19 Oct (made-up "Qa Curation" drivers) upload',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    await skipIfTaken(request, date);
    const list = Object.values(drivers);
    await upload(request, alertFile(testInfo, date, list), date, 'all_alert_report');
    await upload(request, driverFile(testInfo, date, list), date, 'netradyne_driver_report');
    testInfo.annotations.push({ type: 'curation records', description: JSON.stringify(await ourCurations(request)) });
  },
);

test(
  'CU-01: Verify that the same name in both reports gives ONE curation record with the Driver Report\'s Netradyne ID',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const records = recordsOf(await ourCurations(request), drivers.exact.driver);
    expect(records, 'one record').toHaveLength(1);
    expect(records[0].netradyne_id).toBe(drivers.exact.id);
  },
);

test(
  'CU-02: Verify that names that differ only in upper/lower case are merged into one record',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const records = recordsOf(await ourCurations(request), drivers.caseOnly.driver);
    expect(records, 'one record for "qa curation bravo" and "Qa Curation Bravo"').toHaveLength(1);
    expect(records[0].netradyne_id).toBe(drivers.caseOnly.id);
  },
);

test(
  'CU-03: Verify that a name with double and trailing spaces is merged with the same name without them',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const records = recordsOf(await ourCurations(request), drivers.spaces.driver);
    expect(records, 'one record for "Qa  Curation Charlie " and "Qa Curation Charlie"').toHaveLength(1);
    expect(records[0].netradyne_id).toBe(drivers.spaces.id);
  },
);

test(
  'CU-04: Verify that different names ("Qa Curation Delt" / "Qa Curation Delta") are never merged',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const list = await ourCurations(request);
    const delta = recordsOf(list, drivers.different.driver);
    const delt = recordsOf(list, drivers.different.alert);
    expect(delta, 'Driver Report driver: own record with the ID').toHaveLength(1);
    expect(delta[0].netradyne_id).toBe(drivers.different.id);
    expect(delt, 'All Alert driver: own record, no ID taken from "Delta"').toHaveLength(1);
    expect(delt[0].netradyne_id).not.toBe(drivers.different.id);
  },
);

test(
  'CU-05: Verify that curation has one record per unique driver of both reports after merging (5)',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const ofDate = (await ourCurations(request)).filter((c) => !/echo/i.test(c.name));
    // Alpha, Bravo, Charlie (merged), Delta and Delt (not merged)
    const unique = new Set(ofDate.map((c) => norm(c.name)));
    expect(unique.size, 'unique drivers').toBe(5);
    expect(ofDate, 'no duplicate records').toHaveLength(5);
  },
);

test(
  'CU-07: Verify that uploading the Driver Report first and the All Alert second gives the same merged record',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    await skipIfTaken(request, reverseDate);
    await upload(request, driverFile(testInfo, reverseDate, [reverse]), reverseDate, 'netradyne_driver_report');
    await upload(request, alertFile(testInfo, reverseDate, [reverse]), reverseDate, 'all_alert_report');
    const records = recordsOf(await ourCurations(request), reverse.driver);
    expect(records, 'one record').toHaveLength(1);
    expect(records[0].netradyne_id).toBe(reverse.id);
  },
);

// Not automated yet
test.fixme('CU-06: Verify that the merged driver shows once in Settings → Email Reporting → Netradyne (email reporting setup needed)', () => {});
test.fixme('CU-08: Verify that two real drivers with the same name are not merged (needs two AQWA drivers with one name: adds drivers)', () => {});
