// SCENARIO: the manager sends a write-up, the driver signs it on a phone, the manager sees it as signed.
// Tested on the real screens (UI). Only step 2 uses the API.
//
// 1. Manager, in the web app:
//    - logs in and opens Add Report for Jordan Whitaker (driver profile -> E-Signature -> Add Report)
//    - "Add Details": a title with today's date and time, the type "Seatbelt" and the notes -> Next
//    - keeps the default message -> Next, then on the preview -> Send
//    - (Send sends at once by SMS Chat, the default channel; there is no "Send E-Signature" window any more)
//    CHECK: the web app's Send request answers 200
// 2. API: the driver gets the link by SMS, which a test cannot read, so the test takes the link from
//    Jordan's list of write-ups (it finds its write-up by the title)
//    CHECK: the write-up is in the list with status "sent"
// 3. Driver, on the link page (a second window, phone size, no login):
//    CHECK: the page shows the title and "Pending Signature"
//    - "Click to sign", draws a signature -> Submit, then Submit the write-up
//    CHECK: the page shows "Your Response Has Been Submitted"
// 4. Manager, in the web app: opens the write-up's View window
//    CHECK: it shows the title, "Signed" and "Driver Signature"
//
// Driver: Jordan Whitaker (id 38267), a test driver whose phone and email reach no real person.
// Adds one signed write-up every run, which the web app cannot delete (daily regression only: @adds-data).

const { test, expect } = require('@playwright/test');
const LoginPage = require('../../pages/LoginPage');
const ESignaturePage = require('../../pages/ESignaturePage');
const SignWriteUpPage = require('../../pages/SignWriteUpPage');
const endpoints = require('../../api/endpoints');
const loginAsTestUser = require('../../api/auth');

test(
  'TC-01: Verify that a write-up sent by the manager and signed by the driver shows as signed',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, browser, request }) => {
    // A title with the date and time, so the test finds its own write-up
    const title =
      'Seatbelt violation on ' +
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Calcutta' });

    // 1. Manager: logs in and sends a write-up to Jordan Whitaker (E-Signature -> Add Report)
    const loginPage = new LoginPage(page);
    await loginPage.open();
    await loginPage.login(process.env.LOGIN_EMAIL, process.env.LOGIN_PASSWORD);
    await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

    const eSignaturePage = new ESignaturePage(page);
    await eSignaturePage.openNewReport('38267');
    const sendAnswer = await eSignaturePage.sendWriteUp(
      title,
      'Seatbelt',
      'Netradyne recorded the driver without a seatbelt for 12 minutes on route DYY1-14.',
    );
    expect(sendAnswer.status()).toBe(200);

    // 2. The link the driver gets by SMS (the manager's list of the driver's write-ups has it)
    const user = await loginAsTestUser();
    const listResponse = await request.get(
      process.env.API_BASE_URL + endpoints.eSignatureReport,
      {
        headers: {
          'app-type': '2',
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
        params: { driver_id: '38267' },
      },
    );
    const list = await listResponse.json();
    const writeUp = list.data.find((item) => item.title === title);
    expect(writeUp.status).toBe('sent');

    // 3. Driver: opens the link on a phone (a new window, no login) and signs
    const driverPage = await browser.newPage({
      viewport: { width: 430, height: 932 },
    });
    const signPage = new SignWriteUpPage(driverPage);
    await signPage.open(writeUp.link);
    await expect(driverPage.getByText(title)).toBeVisible();
    await expect(driverPage.getByText('Pending Signature')).toBeVisible();
    await signPage.sign();
    await expect(signPage.doneMessage).toBeVisible();
    await driverPage.close();

    // 4. Manager: the write-up shows as signed, with the driver's signature
    await eSignaturePage.openWriteUp('38267', writeUp._id);
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText('Signed', { exact: true })).toBeVisible();
    await expect(page.getByText('Driver Signature')).toBeVisible();
  },
);
