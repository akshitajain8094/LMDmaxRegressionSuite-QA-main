// Shared by the SMS / Twilio chat tests (tests/ui/sms). Test cases: SMS_Twilio_Chat_Test_Cases.pdf (TC-001 … TC-121).
//
// Station: the chat station (CHAT_* in .env: AQWA, arth on staging). The tests that SEND an SMS reach real phones:
// - they only message the drivers in SMS_DRIVERS ("id:name,…": Chad Elnahal, janeil, jjiaa on staging; Chad's number
//   is the QA RingCentral phone), plus SMS_INVALID_DRIVER_ID where a case needs a number that fails;
// - they are tagged @sends-sms and skipped unless SMS_SEND=1 is set for the run.
// The other tests only look (they may type in the message box, but click No / never click Send).
// Cases where the driver replies from a phone are tagged @by-hand and skipped unless SMS_INBOUND=1: the test asks QA
// to send an SMS from Chad's RingCentral phone and waits for it.
// Cases for Super Admin (not used by these tests) or the LMD Chat app are test.fixme with the reason.
const { test: base, expect } = require('@playwright/test');
const sms = require('../../../api/sms');
const SmsChatPage = require('../../../pages/SmsChatPage');

const drivers = sms.testDrivers();
const chad = drivers.find((d) => /chad/i.test(d.name)) ?? drivers[0];

const test = base.extend({
  // the API user (chat owner on the chat station)
  owner: async ({}, use) => {
    await use(await sms.login());
  },
  // the SMS chat screen, logged in as the chat owner
  smsPage: async ({ page }, use) => {
    const p = new SmsChatPage(page);
    await p.login();
    await use(p);
  },
});

test.beforeEach(() => {
  test.skip(!process.env.CHAT_OWNER_EMAIL || !process.env.CHAT_STATION_ID, 'CHAT_* is not set in .env');
});

// Call at the start of a test that sends a real SMS
function sendsSms() {
  test.skip(process.env.SMS_SEND !== '1', 'sends a real SMS: run with SMS_SEND=1');
  test.skip(drivers.length === 0, 'SMS_DRIVERS is not set in .env');
}
// Call at the start of a test where QA sends an SMS by hand from the driver's phone (Chad: the QA RingCentral phone).
// Skipped unless SMS_INBOUND=1. When the screen is ready, askByHand() says what to send (in the terminal and in the
// report); the test then waits up to 3 minutes for it.
function needsInbound() {
  test.skip(process.env.SMS_INBOUND !== '1', 'needs an SMS sent by hand from the driver phone: run with SMS_INBOUND=1');
  test.setTimeout(6 * 60 * 1000);
}
function askByHand(what) {
  const text = `NOW, from ${chad.name}'s phone (RingCentral): ${what}`;
  console.log(`\n>>> ${text}\n`);
  test.info().annotations.push({ type: 'by hand', description: text });
  return new Date(Date.now() - 5000); // messages newer than this count
}
function needsInvalidDriver() {
  test.skip(!sms.invalidDriver(), 'SMS_INVALID_DRIVER_ID is not set in .env (a driver whose SMS fails)');
}

const tags = (...extra) => ({ tag: ['@regression', '@sms', ...extra] });
const sendTags = (...extra) => tags('@sends-sms', '@adds-data', ...extra);
const handTags = (...extra) => tags('@by-hand', ...extra);
const unique = (text) => `${text} ${Date.now()}`;

module.exports = { test, expect, sms, drivers, chad, sendsSms, needsInbound, askByHand, needsInvalidDriver, tags, sendTags, handTags, unique };
