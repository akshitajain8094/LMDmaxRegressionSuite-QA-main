// SCENARIO: the admin uploads the Netradyne "All Alerts" Excel report in Workflow → Daily → All Alert Report, and
// Reports → All Alert shows every alert of the file for that date. Test cases AA-01 … AA-11 of
// Report_Upload_Extraction_Test_Cases_v2.pdf.
//
// Station: AQWA (REPORT_* in .env, user arth). Main date: 2026-10-20 (the file's date). Before the first run AQWA had
// NO All Alert data for 2026-10-17 … 2026-10-22 (checked 2026-11-17, read only). The file is of fleet PAYA (DYY6):
// the web app only checks that the file name contains "alert" and the date. The Driver Id (Netradyne ID) column is
// empty for all 7 alerts of the real file. Uploading the same date again needs replace=true ("already Exist … update
// it?" → Yes). The web app cannot delete an upload: the tests end with the original file on 2026-10-20.
// AA-08 / AA-09 use their own small files on 2026-10-17 (they stay there).
//
// The tests run one after the other in this order: see playwright.config.js.

const path = require('path');
const { test, expect } = require('@playwright/test');
const { loginAs } = require('../../../api/auth');
const reports = require('../../../api/reports');
const { readXlsx, writeXlsx } = require('../../../api/xlsx');

const date = '2026-10-20';
const sideDate = '2026-10-17'; // AA-08 / AA-09 (own small files)
const report = 'all_alert_report';
const file = reports.files.allAlert20Oct;
const sheet = readXlsx(file);
const headerRow = sheet.findIndex((r) => r[0] === 'S.No');
const top = sheet.slice(0, headerRow + 1); // report lines + header
const headers = sheet[headerRow];
const alerts = sheet.slice(headerRow + 1).filter((r) => r.some((v) => String(v).trim() !== ''));
const keys = headers.map(reports.alertKey);
const col = (h) => headers.indexOf(h);

let user;
test.beforeAll(async () => {
  if (!process.env.REPORT_EMAIL) return;
  user = await reports.login();
});
test.beforeEach(() => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
});

const upload = (request, f, replace, on = date) => reports.uploadDaily(request, user, { file: f, date: on, report, replace });
async function saved(request, from = date, to = from) {
  const { status, body } = await reports.allAlerts(request, user, from, to);
  expect(status).toBe(200);
  return body.data ?? [];
}
// A copy of the report (same layout) with other alert rows / headers, named like the export of that date
function alertFile(testInfo, rows, { name = path.basename(file), head = headers } = {}) {
  const out = testInfo.outputPath(name);
  writeXlsx(out, [...top.slice(0, -1), head, ...rows]);
  return out;
}
// Only the small files of AA-08 / AA-09 (an earlier run) may be on 17/18 Oct: never overwrite other data
const sideTimestamps = ['2026-10-17 23:59:00', '2026-10-18 00:01:00', '2026-10-17 12:00:00', '2026-10-17 13:00:00'];
async function skipIfSideDateTaken(request) {
  const existing = await saved(request, sideDate, '2026-10-18');
  test.skip(
    existing.some((a) => !sideTimestamps.includes(a.metrics?.['timestamp(edt)'])),
    'AQWA already has other All Alert data on 17/18 Oct',
  );
}
const countBy =(items, keyOf) => items.reduce((m, x) => ((m[keyOf(x)] = (m[keyOf(x)] ?? 0) + 1), m), {});
async function expectUnchanged(request, before) {
  const after = await saved(request);
  expect(after, 'still the same alerts').toHaveLength(before.length);
  const ids = new Set(after.map((a) => a._id + a.updated_at));
  for (const a of before) expect(ids.has(a._id + a.updated_at), 'alert ' + a.metrics?.sno + ' not changed').toBe(true);
}

test(
  'AA-01: Verify that the All Alert Excel of 20 Oct uploads and its 7 alerts show in the report for that date',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    let response = await upload(request, file);
    if (response.status() === 409) response = await upload(request, file, true); // date already has data (earlier run)
    expect(response.status(), await response.text()).toBe(200);
    const rows = await saved(request);
    expect(rows, 'one row per alert of the file').toHaveLength(alerts.length);
  },
);

test(
  'AA-02: Verify that every alert and the per-driver count of each alert type match the file',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const rows = await saved(request);
    const bySno = Object.fromEntries(rows.map((r) => [String(r.metrics?.sno), r.metrics]));
    const wrong = [];
    for (const a of alerts) {
      const m = bySno[String(a[col('S.No')])];
      if (!m) {
        wrong.push('alert ' + a[0] + ': not saved');
        continue;
      }
      keys.forEach((k, i) => {
        if (k === 'sno') return;
        if (String(m[k] ?? '').trim() !== String(a[i] ?? '').trim()) wrong.push(`alert ${a[0]} ${k}: file "${a[i]}", saved "${m[k]}"`);
      });
    }
    expect(wrong, 'values that differ from the file').toEqual([]);
    const fileCounts = countBy(alerts, (a) => a[col('Driver Name')] + ' / ' + a[col('Alert Type')]);
    const savedCounts = countBy(rows, (r) => r.metrics?.name + ' / ' + r.metrics?.alert_type);
    expect(savedCounts, 'alerts per driver and type').toEqual(fileCounts);
  },
);

test(
  'AA-03: Verify that each alert driver is matched to a driver or listed in Netradyne curation',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    // The file has no Netradyne IDs: a driver is matched by name (resolution_status VERIFIED) or goes to curation
    const rows = await saved(request);
    const { status, body } = await reports.netradyneCuration(request, user);
    expect(status).toBe(200);
    const curated = new Set((body.data?.updatedCurations ?? []).map((c) => String(c.driver_name ?? c.name).trim().toLowerCase()));
    const lost = rows.filter((r) => r.resolution_status !== 'VERIFIED' && !curated.has(String(r.metrics?.name).trim().toLowerCase()));
    testInfo.annotations.push({
      type: 'alert drivers',
      description: rows.map((r) => `${r.metrics?.name}: ${r.resolution_status}${curated.has(String(r.metrics?.name).trim().toLowerCase()) ? ' (in curation)' : ''}`).join('; '),
    });
    expect(lost.map((r) => r.metrics?.name), 'alerts neither matched to a driver nor in curation').toEqual([]);
  },
);

test(
  'AA-04: Verify that a CSV and a PDF are refused in the All Alert slot and the alerts of 20 Oct do not change',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const before = await saved(request);
    for (const f of [reports.files.driverReport22Oct, reports.files.otherPdf]) {
      const response = await upload(request, f, true);
      expect.soft(response.status(), path.basename(f) + ' refused').toBeGreaterThanOrEqual(400);
    }
    await expectUnchanged(request, before);
  },
);

test(
  'AA-05: Verify that a file without the Driver Id or the Alert Type column is refused with a clear error',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    const before = await saved(request);
    for (const h of ['Driver Id', 'Alert Type']) {
      const i = col(h);
      const f = alertFile(testInfo, alerts.map((a) => a.filter((_, k) => k !== i)), { head: headers.filter((_, k) => k !== i) });
      const response = await upload(request, f, true);
      const text = await response.text();
      expect.soft(response.status(), 'without ' + h + ': refused').toBeGreaterThanOrEqual(400);
      expect.soft(text.toLowerCase(), 'the error names the column').toContain(h.toLowerCase());
    }
    await expectUnchanged(request, before);
  },
);

test(
  'AA-06: Verify that a file with headers only is refused and nothing is saved',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    const before = await saved(request);
    const response = await upload(request, alertFile(testInfo, []), true);
    expect(response.status(), await response.text()).toBeGreaterThanOrEqual(400);
    await expectUnchanged(request, before);
  },
);

test(
  'AA-07: Verify that alerts without a Netradyne ID upload again without a duplicate key error',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    // All 7 alerts of the file have an empty Driver Id, and Malik Asif has 2 alerts (PWA-5090: E11000 duplicate key)
    const response = await upload(request, file, true);
    const text = await response.text();
    expect(response.status(), text).toBe(200);
    expect(text).not.toMatch(/E11000|duplicate key/i);
    expect(await saved(request)).toHaveLength(alerts.length);
  },
);

test(
  'AA-08: Verify on which date alerts at 23:59 and 00:01 are counted (record for the developers)',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    const nextDay = '2026-10-18';
    await skipIfSideDateTaken(request);
    const row = (sno, time) => {
      const r = [...alerts[0]];
      r[col('S.No')] = String(sno);
      r[col('Timestamp(EDT)')] = time;
      return r;
    };
    const f = alertFile(testInfo, [row(1, '2026-10-17 23:59:00'), row(2, '2026-10-18 00:01:00')], { name: 'All Alerts Report( Oct 17 2026 ).xlsx' });
    const response = await upload(request, f, true, sideDate);
    expect(response.status(), await response.text()).toBe(200);
    const d17 = await saved(request, sideDate);
    const d18 = await saved(request, nextDay);
    const where = (t) => (d17.some((a) => a.metrics?.['timestamp(edt)'] === t) ? sideDate : d18.some((a) => a.metrics?.['timestamp(edt)'] === t) ? nextDay : 'not found');
    testInfo.annotations.push({ type: 'alert 23:59 counted on', description: where('2026-10-17 23:59:00') });
    testInfo.annotations.push({ type: 'alert 00:01 counted on', description: where('2026-10-18 00:01:00') });
    expect(where('2026-10-17 23:59:00'), 'both alerts are saved').not.toBe('not found');
    expect(where('2026-10-18 00:01:00'), 'both alerts are saved').not.toBe('not found');
  },
);

test(
  'AA-09: Verify that an alert with an unknown Netradyne ID is saved unmatched and the other alerts are saved',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    await skipIfSideDateTaken(request);
    const unknown = [...alerts[0]];
    unknown[col('S.No')] = '1';
    unknown[col('Driver Name')] = 'Qa Unknown Netradyne';
    unknown[col('Driver Id')] = 'QAUNKNOWNNETRADYNE0001';
    unknown[col('Timestamp(EDT)')] = '2026-10-17 12:00:00';
    const known = [...alerts[1]];
    known[col('S.No')] = '2';
    known[col('Timestamp(EDT)')] = '2026-10-17 13:00:00';
    const f = alertFile(testInfo, [unknown, known], { name: 'All Alerts Report( Oct 17 2026 ).xlsx' });
    const response = await upload(request, f, true, sideDate);
    expect(response.status(), await response.text()).toBe(200);
    const rows = await saved(request, sideDate);
    const u = rows.find((r) => r.metrics?.name === 'Qa Unknown Netradyne');
    expect(rows, 'both alerts saved').toHaveLength(2);
    expect(u, 'the unknown driver\'s alert is saved').toBeTruthy();
    expect(u.resolution_status, 'not matched to any driver').not.toBe('VERIFIED');
    testInfo.annotations.push({ type: 'unknown Netradyne ID saved as', description: JSON.stringify({ netradyne_id: u.netradyne_id, resolution_status: u.resolution_status }) });
  },
);

test(
  'AA-10: Verify that uploading the same date again asks to replace, and replacing overwrites without doubling',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    const without = await upload(request, file);
    expect(without.status(), 'the date already has data: "already Exist … update it?"').toBe(409);

    // Changed file: the last alert removed, the first alert's type changed
    const changed = alerts.slice(0, -1).map((a) => [...a]);
    changed[0][col('Alert Type')] = 'Hard Turn';
    const response = await upload(request, alertFile(testInfo, changed), true);
    expect(response.status(), await response.text()).toBe(200);
    let rows = await saved(request);
    expect(rows, 'the removed alert is gone, nothing doubled').toHaveLength(alerts.length - 1);
    expect(rows.find((r) => String(r.metrics?.sno) === '1')?.metrics?.alert_type).toBe('Hard Turn');

    // Clean-up: the original file again
    const back = await upload(request, file, true);
    expect(back.status(), await back.text()).toBe(200);
    rows = await saved(request);
    expect(rows).toHaveLength(alerts.length);
    expect(rows.find((r) => String(r.metrics?.sno) === '1')?.metrics?.alert_type).toBe(alerts[0][col('Alert Type')]);
  },
);

test(
  'AA-11: Verify that the alerts uploaded on AQWA do not show in another station of the same user (DYY6)',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    test.skip(!process.env.ANN_STATION_ID, 'needs a second station of the report user (ANN_STATION_ID)');
    const other = await loginAs('REPORT on DYY6', process.env.REPORT_EMAIL, process.env.REPORT_PASSWORD, process.env.ANN_STATION_ID);
    const ours = new Set((await saved(request)).map((a) => a._id));
    const { status, body } = await reports.allAlerts(request, other, date, date);
    expect(status).toBe(200);
    const leaked = (body.data ?? []).filter((a) => ours.has(a._id) || String(a.company_id) === String(process.env.REPORT_STATION_ID));
    expect(leaked, 'AQWA alerts shown on DYY6').toEqual([]);
  },
);
