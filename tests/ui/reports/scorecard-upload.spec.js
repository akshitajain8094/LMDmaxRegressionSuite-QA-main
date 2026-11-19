// SCENARIO: the admin uploads the weekly DSP Scorecard on the real Workflow screen (UI). Test cases SC-01, SC-04,
// SC-06, SC-13 and SC-15 of Report_Upload_Extraction_Test_Cases_v2.pdf; the numbers are checked in the API file.
//
// User arth on station AQWA (REPORT_* in .env), week 42. The DYY6 / PAYA files make the screen warn that the DSP
// short code and the station code do not match: the tests click "Continue Anyway" (decided with QA). Week 42
// already has data, so a real upload ends with "already Exist … update it?" → Yes. Every upload puts the same
// week-42 file back, so week 42 keeps its numbers.

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../../pages/LoginPage');
const WorkflowPage = require('../../../pages/WorkflowPage');
const InAppChatPage = require('../../../pages/InAppChatPage');
const reports = require('../../../api/reports');

const week = 42;
const uploadUrl = /\/extract\/v3\/weekly/;

test.beforeEach(async ({ page }) => {
  test.skip(!process.env.REPORT_EMAIL, 'REPORT_* is not set in .env');
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(process.env.REPORT_EMAIL, process.env.REPORT_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });
  // the station picker at the top right (the same button as in the chat tests)
  const code = process.env.REPORT_STATION_CODE;
  const stationButton = new InAppChatPage(page).stationButton;
  await stationButton.waitFor();
  if ((await stationButton.innerText()).trim() !== code) {
    await stationButton.click();
    await page.getByRole('menu').getByRole('button', { name: new RegExp(code + '$') }).click();
  }
  await expect(page.getByRole('button', { name: code, exact: true })).toBeVisible();
});

// Counts the upload requests the screen sends
function countUploads(page) {
  const sent = [];
  page.on('request', (r) => {
    if (uploadUrl.test(r.url())) sent.push(r);
  });
  return sent;
}

test(
  'SC-01, SC-13: Verify that the week-42 scorecard uploads from Workflow with a success message and no wrong-week or SSL error',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ page }) => {
    const workflow = new WorkflowPage(page);
    await workflow.open();
    await workflow.openReport('Scorecard Report');
    await workflow.selectWeek(week);
    await workflow.chooseFile(reports.files.week42);
    await workflow.uploadButton.click();

    const warnings = await workflow.continueAnyway();
    // only the two expected warnings: the file is of DYY6 / PAYA, not of AQWA
    expect(warnings.join(' | ')).toContain('DSP Short Code does not match');
    expect(warnings.join(' | ')).toContain('Station code does not match');
    expect(warnings.join(' | ')).not.toContain('Selected Week does not Match');

    // week 42 already has data
    await expect(workflow.dialog).toContainText('already Exist');
    const answer = page.waitForResponse(
      (r) => uploadUrl.test(r.url()) && r.request().postData()?.includes('replace'),
      { timeout: 120000 },
    );
    await workflow.dialog.getByRole('button', { name: 'Yes', exact: true }).click();
    expect((await answer).status()).toBe(200);
    await expect(workflow.successMessage).toBeVisible();
    await expect(page.getByText(/certificate|SSL/i)).toHaveCount(0);
  },
);

test(
  'SC-06: Verify that a scorecard of another week (32) chosen for week 42 is stopped with a week warning',
  { tag: ['@regression', '@reports'] },
  async ({ page }) => {
    const sent = countUploads(page);
    const workflow = new WorkflowPage(page);
    await workflow.open();
    await workflow.openReport('Scorecard Report');
    await workflow.selectWeek(week);
    await workflow.chooseFile(reports.files.week32);
    await workflow.uploadButton.click();

    await expect(workflow.dialog).toContainText(
      'Selected Week does not Match With US_PAYA_DYY6_Week32_2026_en_DSPScorecard.pdf',
    );
    await workflow.dialog.getByRole('button', { name: 'Choose Different File' }).click();
    await page.waitForTimeout(2000);
    expect(sent, 'nothing is sent to the server').toHaveLength(0);
  },
);

test(
  'SC-04: Verify that an image chosen in the Scorecard slot is stopped before upload',
  { tag: ['@regression', '@reports'] },
  async ({ page }) => {
    const sent = countUploads(page);
    const workflow = new WorkflowPage(page);
    await workflow.open();
    await workflow.openReport('Scorecard Report');
    await expect(workflow.fileInput).toHaveAttribute('accept', '.pdf'); // the file window offers only PDFs
    await workflow.selectWeek(week);
    // dragged in (or picked with "All files"): the screen must stop it
    await workflow.chooseFile(reports.files.png);
    await workflow.uploadButton.click();

    await expect(
      page.getByText(/not weekly Scorecard report|only pdf|invalid file|file type/i).first(),
    ).toBeVisible();
    const choose = workflow.dialog.getByRole('button', { name: 'Choose Different File' });
    if (await choose.count()) await choose.click();
    await page.waitForTimeout(2000);
    expect(sent, 'nothing is sent to the server').toHaveLength(0);
  },
);

test(
  'SC-15: Verify that a failed upload (network lost) shows an error, and the next try works',
  { tag: ['@regression', '@adds-data', '@reports'] },
  async ({ page }) => {
    const workflow = new WorkflowPage(page);
    await workflow.open();
    await workflow.openReport('Scorecard Report');
    await workflow.selectWeek(week);
    await workflow.chooseFile(reports.files.week42);

    // 1. the network fails while the file is uploaded (the request never reaches the server)
    await page.route(uploadUrl, (route) => route.abort('internetdisconnected'));
    await workflow.uploadButton.click();
    await workflow.continueAnyway();
    await expect(
      page.getByText(/something went wrong|network|failed|error/i).first(),
      'the screen tells the user that the upload failed',
    ).toBeVisible({ timeout: 15000 });
    await expect(workflow.successMessage).toHaveCount(0);

    // 2. the network is back: Upload File again works
    await page.unroute(uploadUrl);
    await workflow.uploadButton.click();
    await workflow.continueAnyway();
    await expect(workflow.dialog).toContainText('already Exist');
    await workflow.dialog.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(workflow.successMessage).toBeVisible({ timeout: 120000 });
  },
);
