// SCENARIO: the admin uploads Amazon's weekly "DSP Overview Dashboard" CSV in Workflow → Weekly → DA Weekly
// Overview, and Reports → DA Weekly Overview shows every driver's tiers and scores exactly as in the file.
// Test cases DA-01 … DA-13 of Report_Upload_Extraction_Test_Cases_v2.pdf.
//
// Station: AQWA (REPORT_* in .env, user arth), week 42 of 2026. Before the first run AQWA had NO DA Weekly data for
// week 42 (checked 2026-11-17, read only). The file is DYY6 / PAYA: the web app warns about the DSP short code and
// the station code ("Continue Anyway"); the server does not check. Uploading the same week again needs replace=true
// ("already Exist … update it?" → Yes). The web app cannot delete an upload: the last test puts the original file
// back, so week 42 always ends with the file's numbers.
//
// The tests run one after the other in this order (they upload into the same week): see playwright.config.js.

const path = require('path');
const { test, expect } = require('@playwright/test');
const reports = require('../../../api/reports');

const week = 202642;
const report = 'da_weekly_overview_report';
const file = reports.files.daWeek42;
const source = reports.readCsv(file); // 140 drivers, 54 columns
const keys = source.headers.map(reports.daKey);
const col = (header) => source.headers.findIndex((h) => h.trim() === header);
const tid = col('Transporter ID');

// Drivers checked one by one (first, middle and last rows of the file, and Chad Elnahal: see DA-04)
const drivers = ['A3MMICQQHRH134', 'A3D7TKWA5X4ZCT', 'A36HI1M57TVKN0', 'A1NN3JPPUIHEJG', 'A1UGL5COUMG1S0'];
const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze'];

let user;
test.beforeAll(async () => {
  if (!process.env.REPORT_EMAIL) return;
  user = await reports.login();
});
test.beforeEach(() => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
});

const upload = (request, f, replace) => reports.uploadWeekly(request, user, { file: f, week, report, replace });

// The saved rows of week 42, by transporter ID
async function savedRows(request) {
  const { status, body } = await reports.daWeekly(request, user, week);
  expect(status).toBe(200);
  return body.data ?? [];
}
const byTid = (rows) => Object.fromEntries(rows.map((r) => [r.transporter_id, r]));

// A copy of the file with the same name, changed by fn(headers, rows), in the test's output folder
function changedCopy(testInfo, fn) {
  const copy = { headers: [...source.headers], rows: source.rows.map((r) => [...r]) };
  fn(copy);
  const out = testInfo.outputPath(path.basename(file));
  reports.writeCsv(out, copy);
  return out;
}

// What a refused upload must leave: the same 140 rows, not touched (same updated_at)
async function expectUnchanged(request, before) {
  const after = await savedRows(request);
  expect(after, 'still 140 rows').toHaveLength(before.length);
  const a = byTid(after);
  for (const r of before) expect(a[r.transporter_id]?.updated_at, r.transporter_id + ' not changed').toBe(r.updated_at);
}

test(
  'DA-01: Verify that the week-42 DA Weekly Overview CSV uploads and every driver is saved with tiers and scores',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    let response = await upload(request, file);
    if (response.status() === 409) response = await upload(request, file, true); // week 42 already has data (earlier run)
    expect(response.status(), await response.text()).toBe(200);

    const rows = await savedRows(request);
    const ids = rows.map((r) => r.transporter_id);
    expect(rows, 'one row per driver of the file').toHaveLength(source.rows.length);
    expect(new Set(ids).size, 'no duplicate drivers').toBe(ids.length);
    for (const r of rows) {
      expect(r.week_number).toBe(week);
      expect(tiers, r.metrics.name + ' overall standing').toContain(r.metrics.overall_standing);
      expect(r.metrics.overall_score, r.metrics.name + ' overall score').not.toBe('');
    }
  },
);

test(
  'DA-03: Verify that every saved value matches the CSV, for all 140 drivers and all 54 columns',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const saved = byTid(await savedRows(request));
    const wrong = [];
    for (const row of source.rows) {
      const metrics = saved[row[tid]]?.metrics;
      if (!metrics) {
        wrong.push(row[tid] + ': not saved');
        continue;
      }
      keys.forEach((k, i) => {
        const expected = row[i].trim();
        if (String(metrics[k] ?? '').trim() !== expected) wrong.push(`${row[tid]} ${k}: file "${expected}", saved "${metrics[k]}"`);
      });
    }
    expect(wrong, 'values that differ from the file').toEqual([]);
  },
);

test(
  'DA-04: Verify that the driver view of DA Weekly Overview shows only that driver, with the Overall Standing of the file',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    // The driver page asks for one transporter ID. Known finding (2026-11-17): for Chad Elnahal the server also
    // returns alyssa caceres' row (same problem as Scorecard → driver compare).
    for (const id of drivers) {
      const row = source.rows.find((r) => r[tid] === id);
      const { status, body } = await reports.daWeekly(request, user, week, id);
      expect(status).toBe(200);
      const got = body.data ?? [];
      expect.soft(got.map((r) => r.transporter_id), id + ': only this driver').toEqual([id]);
      const own = got.find((r) => r.transporter_id === id)?.metrics;
      expect.soft(own?.overall_standing, id + ' standing').toBe(row[col('Overall Standing')]);
      expect.soft(own?.overall_score, id + ' score').toBe(row[col('Overall Score')]);
    }
  },
);

test(
  'DA-07: Verify that a PDF and the POD report are refused in the DA Weekly slot and nothing is saved',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const before = await savedRows(request);
    for (const f of [reports.files.otherPdf, reports.files.podWeek42]) {
      const response = await upload(request, f, true);
      expect(response.status(), path.basename(f) + ' refused').toBeGreaterThanOrEqual(400);
    }
    await expectUnchanged(request, before);
  },
);

test(
  'DA-08: Verify that a CSV without the Transporter ID or Overall Standing column is refused with a clear error',
  { tag: ['@regression', '@reports'] },
  async ({ request }, testInfo) => {
    const before = await savedRows(request);
    for (const header of ['Transporter ID', 'Overall Standing']) {
      const i = col(header);
      const f = changedCopy(testInfo, (c) => {
        c.headers.splice(i, 1);
        c.rows.forEach((r) => r.splice(i, 1));
      });
      const response = await upload(request, f, true);
      const text = await response.text();
      expect.soft(response.status(), 'without ' + header + ': refused').toBeGreaterThanOrEqual(400);
      expect.soft(text.toLowerCase(), 'the error names the column').toContain(header.toLowerCase());
    }
    await expectUnchanged(request, before);
  },
);

test(
  'DA-09: Verify that a blank tier and an unknown tier are saved as they are, without breaking the upload',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }, testInfo) => {
    // John Uruena Lopez: Overall Standing blank; Chad Elnahal: CED Tier "Diamond" (not an Amazon tier)
    const f = changedCopy(testInfo, (c) => {
      c.rows.find((r) => r[tid] === 'A3MMICQQHRH134')[col('Overall Standing')] = '';
      c.rows.find((r) => r[tid] === 'A3D7TKWA5X4ZCT')[col('CED Tier')] = 'Diamond';
    });
    const response = await upload(request, f, true);
    expect(response.status(), await response.text()).toBe(200);

    const saved = byTid(await savedRows(request));
    expect(Object.keys(saved), 'all rows still saved').toHaveLength(source.rows.length);
    expect(saved.A3MMICQQHRH134.metrics.overall_standing, 'blank tier stays blank').toBe('');
    testInfo.annotations.push({ type: 'unknown tier saved as', description: String(saved.A3D7TKWA5X4ZCT.metrics.ced_tier) });
  },
);

test(
  'DA-12: Verify that uploading the same week again asks to replace, and replacing overwrites without duplicates',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    // Also the clean-up: week 42 ends with the original file
    const without = await upload(request, file);
    expect(without.status(), 'week 42 already has data: "already Exist … update it?"').toBe(409);

    const replaced = await upload(request, file, true);
    expect(replaced.status(), await replaced.text()).toBe(200);
    const rows = await savedRows(request);
    const ids = rows.map((r) => r.transporter_id);
    expect(rows).toHaveLength(source.rows.length);
    expect(new Set(ids).size, 'no duplicate drivers').toBe(ids.length);
    const john = byTid(rows).A3MMICQQHRH134.metrics;
    expect(john.overall_standing, 'the new upload replaced the DA-09 values').toBe('Platinum');
  },
);

// Not automated yet: each needs something we do not have or an action that needs QA's OK
test.fixme('DA-02: Verify that an old-format file is shown in the old format (no old-format sample file yet)', () => {});
test.fixme('DA-05: Verify that the CSV download matches the uploaded format (download endpoint and old-format file not known yet)', () => {});
test.fixme('DA-06: Verify that a new-format file for a previous week is refused (if the server accepts it, it writes into an old AQWA week: needs QA OK)', () => {});
test.fixme('DA-10: Verify the defaults of a new company (needs a new company to be registered)', () => {});
test.fixme('DA-11: Verify the info message when the scorecard image is sent without DA Weekly (sends the image to drivers)', () => {});
test.fixme('DA-13: Verify that an existing company keeps Overall Standing off (changes AQWA settings: needs QA OK)', () => {});
