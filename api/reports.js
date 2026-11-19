// Report upload (Workflow in the web app) and the reports that show the uploaded data, on the performance server.
// The report tests have their own login and station (REPORT_* in .env): uploads change a station's scorecard,
// dashboard and curation, so they must not run on the station of the other tests (DYY1). On staging: arth on AQWA.
//
// Workflow → Scorecard Report → Select a Week → Choose File → Upload File sends ONE request that uploads the file
// and reads it: POST /extract/v3/weekly (multipart) with file, report_name, week_number (YYYYWW) and, after
// "Data of this week already Exist. Do you want to update it?" → Yes, replace=true. The server answers 409 when the
// week already has data and replace is missing.
// The web app cannot delete an uploaded scorecard or a curation entry: the tests put week 42 back at the end.
const fs = require('fs');
const path = require('path');
const { loginAs } = require('./auth');
const addToReport = require('./report');

const base = '/lmd/prfsrv';
const reportFiles = path.join(__dirname, '..', 'test-files', 'reports');
const scorecardFiles = path.join(reportFiles, 'scorecard');

// The sample files (Amazon DSP scorecards of DYY6, PAYA). Their numbers are written in the tests.
const files = {
  week42: path.join(scorecardFiles, 'US_PAYA_DYY6_Week42_2026_en_DSPScorecard.pdf'), // 140 drivers
  week32: path.join(scorecardFiles, 'US_PAYA_DYY6_Week32_2026_en_DSPScorecard.pdf'), // 118 drivers
  // not a scorecard / broken / wrong type (shared with the announcement tests)
  otherPdf: path.join(__dirname, '..', 'test-files', 'announcements', 'qa-sample.pdf'),
  corruptPdf: path.join(__dirname, '..', 'test-files', 'announcements', 'qa-corrupt.pdf'),
  xlsx: path.join(__dirname, '..', 'test-files', 'announcements', 'qa-sample.xlsx'),
  png: path.join(__dirname, '..', 'test-files', 'announcements', 'qa-sample.png'),
  // DA Weekly Overview of DYY6 week 42 (Amazon "DSP Overview Dashboard" CSV, 140 drivers, 54 columns)
  daWeek42: path.join(reportFiles, 'da-weekly-overview', 'DSP_Overview_Dashboard_PAYA_DYY6_2026-W42.csv'),
  // POD details of week 42 (another report: must be refused in the DA Weekly slot)
  podWeek42: path.join(reportFiles, 'pod', 'US-PAYA-DYY6-Week42-2026NA-DA-POD-Details.pdf'),
  // Netradyne All Alert report of 20 Oct 2026 (Excel, 7 alerts, the Driver Id column is empty for all)
  allAlert20Oct: path.join(reportFiles, 'all-alert', 'All Alerts Report( Oct 20 2026 ).xlsx'),
  // Netradyne Driver Report generated 22 Oct 2026 for 21 Oct (CSV, 230 drivers; all but "Unknown Driver" have a Netradyne ID)
  driverReport22Oct: path.join(reportFiles, 'driver-report', 'Drivers-Report(Oct-22-2026).csv'),
};

const station = () => process.env.REPORT_STATION_ID;

// Logs in as the report user on the report station (once per worker)
let reportUser;
async function login() {
  reportUser ??= await loginAs(
    'REPORT',
    process.env.REPORT_EMAIL,
    process.env.REPORT_PASSWORD,
    station(),
  );
  return reportUser;
}

const headersOf = (user) => ({
  'x-access-token': user.token,
  'x-access-user': user.account_id,
});

// Uploads a weekly report file, like Workflow → <report> → Upload File. replace: the "update it?" → Yes.
async function uploadWeekly(request, user, { file, week, report = 'scorecard_report', replace }) {
  const multipart = {
    file: {
      name: path.basename(file),
      mimeType: mimeOf(file),
      buffer: fs.readFileSync(file),
    },
    week_number: String(week),
    report_name: report,
  };
  if (replace !== undefined) multipart.replace = String(replace);
  const response = await request.post(base + '/extract/v3/weekly', {
    headers: headersOf(user),
    multipart,
    timeout: 120 * 1000, // the server reads the whole PDF inside this request
  });
  await addToReport(response);
  return response;
}

// Uploads a daily report file, like Workflow → Daily → <report> → date → Upload File. date: 'yyyy-MM-dd'.
async function uploadDaily(request, user, { file, date, report, replace }) {
  const multipart = {
    file: {
      name: path.basename(file),
      mimeType: mimeOf(file),
      buffer: fs.readFileSync(file),
    },
    date,
    report_name: report,
  };
  if (replace !== undefined) multipart.replace = String(replace);
  const response = await request.post(base + '/extract/v3/daily', {
    headers: headersOf(user),
    multipart,
    timeout: 120 * 1000,
  });
  await addToReport(response);
  return response;
}

function mimeOf(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.csv': 'text/csv',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }[ext] || 'application/octet-stream'
  );
}

async function getJson(request, user, url) {
  const response = await request.get(base + url, { headers: headersOf(user) });
  await addToReport(response);
  return { status: response.status(), body: await response.json() };
}

// Reports → Weekly → Scorecard: the DSP part of a week (overall standing, categories)
const dspScorecard = (request, user, week) =>
  getJson(request, user, '/scorecard/v2/dsp?week_number=' + week);
// ... and the drivers' rows of that week ("DA Current Week Performance")
const driverRows = (request, user, week) =>
  getJson(request, user, '/scorecard/v2/current?week_number=' + week);
// Driver page → Weekly: the scorecard of one driver (by transporter ID)
const driverScorecard = (request, user, transporterId, week) =>
  getJson(
    request,
    user,
    '/scorecard/v2/compare?transporter_id=' + transporterId + '&week_number=' + week,
  );
const latestWeek = (request, user) =>
  getJson(request, user, '/scorecard/v2/get_latest_week');
// Curation (drivers of a report whose transporter ID is not in the app)
const curation = (request, user) =>
  getJson(request, user, '/curation/v3/get_curation');
const curationCount = (request, user) =>
  getJson(request, user, '/curation/v3/get-curation-count');
// Workflow → Missing Reports (weeks as YYYYWW)
const weeklyMissing = (request, user, start, end) =>
  getJson(
    request,
    user,
    '/upload_summary/v2/weekly_missing_reports?start=' + start + '&end=' + end,
  );

// Reports → Weekly → DA Weekly Overview: the rows of a week (all drivers, or one driver by transporter ID)
const daWeekly = (request, user, week, transporterId) =>
  getJson(
    request,
    user,
    '/da_weekly_overview/v2/da_weekly_overview_report?week_number=' +
      week +
      (transporterId ? '&transporter_id=' + transporterId : ''),
  );

// Reports → Daily → All Alert Report (Netradyne alerts) between two dates ('yyyy-MM-dd'), optionally of one Netradyne ID
const allAlerts = (request, user, start, end, netradyneId) =>
  getJson(
    request,
    user,
    `/all_alert/v2/all_alert_report?start=${start}&end=${end}` + (netradyneId ? '&netradyne_id=' + netradyneId : ''),
  );
// Reports → Daily → Driver Report (Netradyne) between two dates, optionally of one Netradyne ID
const driverReport = (request, user, start, end, netradyneId) =>
  getJson(
    request,
    user,
    `/netradyne_driver/v2/driver_report?start=${start}&end=${end}` + (netradyneId ? '&netradyne_id=' + netradyneId : ''),
  );
// Data management → Curation → Netradyne: drivers of the Netradyne reports that are not matched to a driver.
// The web app calls the same request when the Netradyne curation page opens (it also re-checks the matches).
const netradyneCuration = (request, user) => getJson(request, user, '/curation/v3/get-netradyne-curation');

// The key the server stores a column of the All Alert report under: "S.No" → "sno", "Driver Id" → "netradyne_id"
function alertKey(header) {
  const h = header.trim();
  if (h === 'Driver Name') return 'name';
  if (h === 'Driver Id') return 'netradyne_id';
  return h.toLowerCase().replace(/\./g, '').replace(/\s+/g, '_');
}
// ... and of the Driver Report: "High - G" → "high___g", "Green Minutes%" → "green_minutes", "Driver ID" → "netradyne_id"
function driverReportKey(header) {
  const h = header.trim();
  if (h === 'Driver Name') return 'name';
  if (h === 'Driver ID') return 'netradyne_id';
  return h.toLowerCase().replace(/%/g, '').replace(/[ -]/g, '_');
}

// The Netradyne Driver Report CSV: some report lines, then the table. { top: lines before the header, headers, rows }
function readDriverReport(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith('Driver Name,'));
  return {
    top: lines.slice(0, at),
    headers: lines[at].split(','),
    rows: lines.slice(at + 1).filter(Boolean).map((l) => l.split(',')),
  };
}
function writeDriverReport(file, { top, headers, rows }) {
  fs.writeFileSync(file, [...top, headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n') + '\r\n');
}

// Reads a simple CSV export (no quoted fields; Amazon's DA Weekly file has none) into { headers, rows }
function readCsv(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map((line) => line.split(','));
  return { headers, rows };
}
// Writes a CSV in the same form (used for the "changed file" tests)
function writeCsv(file, { headers, rows }) {
  fs.writeFileSync(file, '﻿' + [headers, ...rows].map((r) => r.join(',')).join('\r\n') + '\r\n');
}
// The key the server stores a DA Weekly column under: "Sign/ Signal Violations Rate Tier" →
// "sign_signal_violations_rate_tier", "Delivery Associate" → "name"
function daKey(header) {
  const key = header.trim().toLowerCase().replace(/[\s/-]+/g, '_');
  return key === 'delivery_associate' ? 'name' : key;
}

module.exports = {
  files,
  uploadDaily,
  allAlerts,
  driverReport,
  netradyneCuration,
  alertKey,
  driverReportKey,
  readDriverReport,
  writeDriverReport,
  daWeekly,
  readCsv,
  writeCsv,
  daKey,
  login,
  headersOf,
  uploadWeekly,
  dspScorecard,
  driverRows,
  driverScorecard,
  latestWeek,
  curation,
  curationCount,
  weeklyMissing,
};
