// SCENARIO: the admin uploads the weekly Amazon DSP Scorecard (PDF) in Workflow → Scorecard Report, and the app
// shows the numbers of the PDF: Reports → Weekly → Scorecard (DSP part and the drivers' rows) and the driver
// page → Weekly. Test cases SC-01 … SC-14 of Report_Upload_Extraction_Test_Cases_v2.pdf (SC-15 is in the UI file).
//
// Station: AQWA (REPORT_* in .env, user arth), week 42 of 2026. The files are DYY6 / PAYA scorecards: the web app
// warns that the DSP short code and the station code do not match ("Continue Anyway"); the server does not check.
// Week 42 already has a scorecard on AQWA, so every upload needs replace=true ("already Exist … update it?" → Yes).
// The web app cannot delete an uploaded scorecard or a curation entry: the last test uploads the week-42 file again,
// so week 42 always ends with the week-42 numbers. Drivers of the PDF that are not on AQWA go to curation and stay.
//
// The tests run one after the other in this order (they upload into the same week): see playwright.config.js.

const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const { loginAs } = require('../../../api/auth');
const reports = require('../../../api/reports');

const week = 202642;

// Week 42 PDF, page 3 (DSP Scorecard)
const dsp42 = {
  overall_standing: '72.9 | Great',
  safety_and_compliance: 'Fantastic',
  distractions_rate: '4.7 events per 100 trips | Great',
  customer_delivery_feedback_dpmo: '1183 | Great',
  delivery_completion_dpmo: '4196.8 | Great',
  photo_on_delivery_acceptance_rate: '99.78% | Fantastic',
  delivery_success_behaviors: '402 | Great',
};
// Week 42 PDF, pages 4-8 (DA Current Week Performance): first, middle and last rows
const rows42 = [
  { s_no: '1', name: 'Allister Allman', transporter_id: 'A3MJVDMXGYELOY', delivered: '344', seatbelt_off_rate: 'No Data', cdf_dpmo: '0', dc_dpmo: '2890.1', dsb: '0', pod: '99.6%', dsb_count: '0', pod_opps: '247' },
  { s_no: '16', name: 'Chad Elnahal', transporter_id: 'A3D7TKWA5X4ZCT', delivered: '853', seatbelt_off_rate: '0.0', cdf_dpmo: '0', dc_dpmo: '0', dsb: '0', pod: '99.8%', dsb_count: '0', pod_opps: '534' },
  { s_no: '64', name: 'Joshua Young', transporter_id: 'A1NN3JPPUIHEJG', delivered: '838', cdf_dpmo: '0', dc_dpmo: '1184.8', pod: '99.5%', psb: '0.00', pod_opps: '385' },
  { s_no: '68', name: 'Justin Ramirez Solis', transporter_id: 'A24CIT41XSN9TX', delivered: '872', cdf_dpmo: '6748', dc_dpmo: '20134.2', dsb: '1332', pod: '99.2%', dsb_count: '1', pod_opps: '594' },
  { s_no: '110', name: 'Robert Nation', transporter_id: 'A2SNI963XH21JD', delivered: '678', speeding_event_rate: '0.7', distractions_rate: '0.4', cdf_dpmo: '1541', dc_dpmo: '2911.2', pod: '99.8%', pod_opps: '426' },
  { s_no: '140', name: 'Yolanda Williams', transporter_id: 'AFGQ9UX8GO1F3', delivered: '690', speeding_event_rate: '0.4', cdf_dpmo: '2911', dc_dpmo: '44176.7', dsb: '1449', pod: '100.0%', dsb_count: '1', pod_opps: '439' },
];
// Drivers of the PDF whose transporter ID is on AQWA (Allister Allman, Chad Elnahal, Andre Cirino) and one that
// is not (Alseny Diallo, row 2: he goes to curation)
const unknownDriver = { name: 'Alseny Diallo', transporter_id: 'A1EAX5NQP70O7V', delivered: '591' };

let user;
let curationBefore;
test.beforeAll(async () => {
  if (!process.env.REPORT_EMAIL) return;
  user = await reports.login();
});
test.beforeEach(() => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
});

// The DSP record of week 42, to show that a rejected upload changed nothing
async function dspRecord(request) {
  const { body } = await reports.dspScorecard(request, user, week);
  return body.data?.[0];
}

function expectRow(row, expected) {
  for (const [field, value] of Object.entries(expected)) {
    expect.soft(row.metrics[field], expected.name + ': ' + field).toBe(value);
  }
}

// ---------- Upload and extraction ----------

test(
  'SC-01, SC-13: Verify that a valid week-42 scorecard PDF is accepted and the DSP scorecard of week 42 shows its numbers',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    const { body: count } = await reports.curationCount(request, user);
    curationBefore = count.data.total;

    // week 42 already has a scorecard on AQWA: "already Exist … update it?" → Yes
    const response = await reports.uploadWeekly(request, user, {
      file: reports.files.week42,
      week,
      replace: true,
    });
    expect(response.status()).toBe(200); // no "wrong week" error (SC-13)
    const body = await response.json();
    expect(body.success).toBe(true);

    const record = await dspRecord(request);
    expect(record.week_number).toBe(week);
    for (const [field, value] of Object.entries(dsp42)) {
      expect.soft(record.metrics[field], field).toBe(value);
    }
  },
);

test(
  'SC-11: Verify that every driver of the 8 PDF pages is extracted (140 rows, each transporter ID once)',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const { body } = await reports.driverRows(request, user, week);
    expect(body.data).toHaveLength(140);
    const ids = body.data.map((row) => row.transporter_id);
    expect(new Set(ids).size).toBe(140);
    const numbers = body.data.map((row) => Number(row.metrics.s_no)).sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers.at(-1)).toBe(140);
  },
);

test(
  'SC-02: Verify that the extracted rows match the PDF (first, middle and last page)',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const { body } = await reports.driverRows(request, user, week);
    for (const expected of rows42) {
      const row = body.data.find((r) => r.transporter_id === expected.transporter_id);
      expect.soft(row, expected.name + ' is in week 42').toBeTruthy();
      if (row) expectRow(row, expected);
    }
  },
);

test(
  'SC-10: Verify that "Coming Soon" and empty values of the PDF are not shown as 0',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const record = await dspRecord(request);
    expect.soft(record.metrics.safe_driving_metric).toBe('Coming Soon');
    expect.soft(record.metrics.working_device).toBe('Coming Soon');
    expect.soft(record.metrics.tenured_workforce).toBe('Coming Soon');

    // Row 9, Andy MatiasMatias: Delivered and POD Opps. are empty in the PDF, POD is "No Data"
    const { body } = await reports.driverRows(request, user, week);
    const andy = body.data.find((r) => r.transporter_id === 'A2IXMT67D5UBGN');
    expect(andy).toBeTruthy();
    expect.soft(andy.metrics.delivered, 'empty Delivered').not.toBe('0');
    expect.soft(andy.metrics.pod_opps, 'empty POD Opps.').not.toBe('0');
    expect.soft(andy.metrics.pod).toBe('No Data');
  },
);

test(
  'SC-03: Verify that the driver page (Weekly) shows the same week-42 scorecard as the report, one record per driver',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    for (const expected of rows42) {
      const { body } = await reports.driverScorecard(
        request,
        user,
        expected.transporter_id,
        week,
      );
      const current = body.data.current;
      const names = current.map((r) => r.metrics.name + ' (#' + r.metrics.s_no + ')');
      expect.soft(names, expected.name + ': only their own row').toEqual([
        expected.name + ' (#' + expected.s_no + ')',
      ]);
    }
    const { body: latest } = await reports.latestWeek(request, user);
    expect(latest.week_number).toBeGreaterThanOrEqual(week);
  },
);

test(
  'SC-08: Verify that a driver of the PDF who is not in the app is saved and sent to curation, and the others are saved',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const { body } = await reports.driverRows(request, user, week);
    const row = body.data.find((r) => r.transporter_id === unknownDriver.transporter_id);
    expect(row, 'the row of ' + unknownDriver.name).toBeTruthy();
    expect(row.metrics.delivered).toBe(unknownDriver.delivered);

    const { body: curation } = await reports.curation(request, user);
    const entry = curation.data.remainingCurations.find(
      (c) => c.transporter_id === unknownDriver.transporter_id,
    );
    expect(entry, unknownDriver.name + ' in curation').toBeTruthy();
    expect(entry.curation_from).toBe('scorecard_report');
    // the same driver is in curation only once
    expect(
      curation.data.remainingCurations.filter(
        (c) => c.transporter_id === unknownDriver.transporter_id,
      ),
    ).toHaveLength(1);
  },
);

test(
  'SC-14: Verify that the upload on AQWA does not show in another station of the same user (DYY6)',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    test.skip(!process.env.ANN_STATION_ID, 'needs a second station of the report user (ANN_STATION_ID)');
    // arth also manages DYY6 (ANN_STATION_ID), which has no week-42 scorecard
    const other = await loginAs(
      'REPORT on DYY6',
      process.env.REPORT_EMAIL,
      process.env.REPORT_PASSWORD,
      process.env.ANN_STATION_ID,
    );
    const { body: dsp } = await reports.dspScorecard(request, other, week);
    expect(dsp.data).toEqual([]);
    const { body: rows } = await reports.driverRows(request, other, week);
    expect(rows.data ?? []).toEqual([]);
  },
);

// ---------- Files that must be rejected (nothing changes in week 42) ----------

for (const [id, label, file] of [
  ['SC-04', 'an Excel file (.xlsx)', 'xlsx'],
  ['SC-04', 'an image (.png)', 'png'],
  ['SC-05', 'a corrupt PDF', 'corruptPdf'],
  ['SC-07', 'a PDF that is not a scorecard', 'otherPdf'],
]) {
  test(
    `${id}: Verify that ${label} in the Scorecard slot is rejected and week 42 does not change`,
    { tag: ['@regression', '@reports'] },
    async ({ request }) => {
      const before = await dspRecord(request);
      const response = await reports.uploadWeekly(request, user, {
        file: reports.files[file],
        week,
        replace: true,
      });
      expect.soft(response.status(), 'rejected').toBeGreaterThanOrEqual(400);
      const after = await dspRecord(request);
      expect(after?._id, 'the DSP scorecard of week 42 is still there').toBe(before._id);
      expect(after.updated_at, 'not changed').toBe(before.updated_at);
      const { body } = await reports.driverRows(request, user, week);
      expect(body.data, 'the 140 drivers of week 42 are still there').toHaveLength(140);
    },
  );
}

test(
  'SC-06: Verify that the week-32 scorecard uploaded as week 42 is rejected and week 42 does not change',
  { tag: ['@regression', '@reports'] },
  async ({ request }) => {
    const before = await dspRecord(request);
    const response = await reports.uploadWeekly(request, user, {
      file: reports.files.week32,
      week,
      replace: true,
    });
    expect.soft(response.status(), 'week-mismatch error').toBeGreaterThanOrEqual(400);
    const after = await dspRecord(request);
    expect.soft(after.metrics.overall_standing, 'week 42 keeps its numbers').toBe(
      dsp42.overall_standing,
    );
    expect.soft(after.updated_at, 'not changed').toBe(before.updated_at);
    const { body } = await reports.driverRows(request, user, week);
    expect(body.data, 'still the 140 drivers of week 42 (week 32 has 118)').toHaveLength(140);
  },
);

// ---------- Uploading the same week again ----------

test(
  'SC-12: Verify that uploading week 42 again asks before replacing, then replaces the data without duplicates',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    // without "update it?" → Yes the server refuses: the week already has data
    const ask = await reports.uploadWeekly(request, user, {
      file: reports.files.week42,
      week,
    });
    expect(ask.status()).toBe(409);

    // with Yes: the week is replaced (also undoes SC-06 if the week-32 numbers were saved)
    const response = await reports.uploadWeekly(request, user, {
      file: reports.files.week42,
      week,
      replace: true,
    });
    expect(response.status()).toBe(200);
    const record = await dspRecord(request);
    expect(record.metrics.overall_standing).toBe(dsp42.overall_standing);
    const { body: dspAll } = await reports.dspScorecard(request, user, week);
    expect(dspAll.data, 'one DSP scorecard for the week').toHaveLength(1);
    const { body } = await reports.driverRows(request, user, week);
    expect(body.data, 'not doubled').toHaveLength(140);
    expect(new Set(body.data.map((r) => r.transporter_id)).size).toBe(140);
  },
);

test(
  "SC-09: Verify that after a driver's transporter ID is changed, the new scorecard is matched to the driver",
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    // Driver "curation" (38656) of AQWA gets the transporter ID of Alseny Diallo (row 2 of the PDF), then gets
    // their own ID back
    const driverId = '38656';
    const headers = reports.headersOf(user);
    const profileResponse = await request.get(endpoints.driverProfile + driverId, { headers });
    await addToReport(profileResponse);
    const driver = (await profileResponse.json()).data[0];
    const ownId = driver.transporter_id;
    const stations = driver.station_code;

    const edit = await request.patch(endpoints.editDriver + driverId, {
      headers,
      data: { station_code: stations, transporter_id: unknownDriver.transporter_id },
    });
    await addToReport(edit);
    try {
      expect(edit.status(), 'the transporter ID is changed').toBe(201);

      const upload = await reports.uploadWeekly(request, user, {
        file: reports.files.week42,
        week,
        replace: true,
      });
      expect(upload.status()).toBe(200);

      const { body } = await reports.driverScorecard(
        request,
        user,
        unknownDriver.transporter_id,
        week,
      );
      expect(body.data.current).toHaveLength(1);
      expect(body.data.current[0].metrics.delivered).toBe(unknownDriver.delivered);
      // the driver list shows the driver with the new ID: the scorecard belongs to them now
      const list = await request.get(endpoints.driverList, {
        headers,
        params: { limit: '1000', offset: '0' },
      });
      const drivers = (await list.json()).data;
      const listed = (drivers.drivers || drivers.list || drivers).find(
        (d) => String(d.driver_id ?? d.id) === driverId,
      );
      expect(listed.transporter_id).toBe(unknownDriver.transporter_id);
    } finally {
      const back = await request.patch(endpoints.editDriver + driverId, {
        headers,
        data: { station_code: stations, transporter_id: ownId },
      });
      await addToReport(back);
      expect(back.status(), 'the driver gets their own transporter ID back').toBe(201);
    }
  },
);

// ---------- Put week 42 back ----------

test(
  'Clean-up: week 42 has the week-42 scorecard again (the app cannot delete an upload)',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ request }) => {
    const response = await reports.uploadWeekly(request, user, {
      file: reports.files.week42,
      week,
      replace: true,
    });
    expect(response.status()).toBe(200);
    const record = await dspRecord(request);
    expect(record.metrics.overall_standing).toBe(dsp42.overall_standing);
    const { body } = await reports.curationCount(request, user);
    test.info().annotations.push({
      type: 'curation',
      description: 'curation entries before the run: ' + curationBefore + ', after: ' + body.data.total,
    });
  },
);
