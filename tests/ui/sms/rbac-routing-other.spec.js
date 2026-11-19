// SCENARIO: who may use SMS chat (RBAC, stations), which channel reports and automated messages go through
// (Twilio SMS or In-App), and the remaining modules: automated messages, task tagging, payroll chat and the LMD Chat
// app notifications. TC-095 … TC-121 of SMS_Twilio_Chat_Test_Cases.pdf.
// Changing permissions or the company's routing affects every user of the station: those cases stay fixme until
// QA says which user / setting may be changed. App cases are not web tests.
const { test, expect, sms, tags } = require('./sms-setup');

test(
  'TC-113: Verify that a write-up reminder in SMS chat is sent as "Auto Message"',
  tags(),
  async ({ owner, request }) => {
    const heads = (await sms.chatList(request, owner, { limit: 50 })).body.data ?? [];
    let reminder;
    for (const h of heads.filter((x) => x.type === 'drivers').slice(0, 30)) {
      reminder = (await sms.messagesOf(request, owner, h.driver_id, 30)).find((m) => /write.?up/i.test(m.message) && /remind/i.test(m.message));
      if (reminder) break;
    }
    test.skip(!reminder, 'no write-up reminder in the SMS chats of the station');
    expect(reminder.sender_name ?? reminder.from_name ?? reminder.from).toMatch(/Auto Message/);
  },
);

test(
  'TC-115: Verify that Payroll chat shows its own number in the header, different from the SMS chat number',
  tags(),
  async ({ smsPage, page }) => {
    const smsNumber = (await smsPage.welcomeChatNumber.locator('xpath=..').innerText()).match(/\d{3}-\d{3}-\d{4}/)?.[0];
    await page.mouse.click(27, 180);
    await page.getByText('Payroll', { exact: true }).first().click();
    await expect(page).toHaveURL(/payroll/);
    const header = (await page.locator('body').innerText()).match(/LMDmax Chat #:?\s*(\d{3}-\d{3}-\d{4})/)?.[1];
    test.info().annotations.push({ type: 'numbers', description: `SMS ${smsNumber}, Payroll ${header}` });
    expect(header, 'Payroll number shown').toBeTruthy();
    expect(header, 'not the SMS chat number').not.toBe(smsNumber);
  },
);

// The company's routing comes with the login (company.message_routing: "twilio" or in-app). Changing it is done in
// Super Admin (TC-104, TC-105: not used).
test(
  "TC-103: Verify that the company's message routing is Twilio (SMS) by default",
  tags(),
  async ({ request }) => {
    // its own login (the station answer has the company settings), so the owner's token used by the other tests stays as it is
    const endpoints = require('../../../api/endpoints');
    const login = (await (await request.post(sms.apiBase() + endpoints.login, { headers: { 'app-type': '2', Origin: process.env.UI_BASE_URL }, data: { email: process.env.CHAT_OWNER_EMAIL, password: process.env.CHAT_OWNER_PASSWORD } })).json()).data;
    const station = await request.get(sms.apiBase() + endpoints.selectStation + process.env.CHAT_STATION_ID, { headers: sms.headersOf(login) });
    const company = (await station.json()).data?.company ?? {};
    test.info().annotations.push({ type: 'company', description: `message_routing ${company.message_routing}, inapp_chat_enabled ${company.inapp_chat_enabled}, inapp_individual_chat_enabled ${company.inapp_individual_chat_enabled}` });
    expect(company.message_routing, 'Twilio by default').toBe('twilio');
  },
);

// RBAC / multi-station
test.fixme('TC-095: Verify that the secondary chat is OFF by default for Admins in RBAC (RBAC screen to be checked first, read only)', () => {});
test.fixme('TC-096: Verify that an Admin without Send Message cannot send (screen and API) (changes ADMIN_B\'s permissions: ask first)', () => {});
test.fixme('TC-097: Verify that Create Broadcast OFF hides broadcast on web and app (changes ADMIN_B\'s permissions: ask first)', () => {});
test.fixme('TC-098: Verify station-specific RBAC for Twilio chat (needs an Admin with chat ON on one station and OFF on another)', () => {});
test.fixme('TC-100: Verify that drivers of an inactive station cannot be messaged (needs an inactive station)', () => {});
test.fixme('TC-101: Verify that a group with drivers of 2 stations shows the station on messages (sends to a DYY6 driver: ask first)', () => {});
test.fixme('TC-102: Verify that drivers of a station with RBAC disabled for the Admin are hidden in broadcast (changes ADMIN_B\'s RBAC: ask first)', () => {});
// Channel routing
test.fixme('TC-104: Verify switching Twilio → In-App with Cancel / Yes Proceed (changes the company\'s routing: ask first)', () => {});
test.fixme('TC-105: Verify that automated messages follow the In-App channel (changes the company\'s routing: ask first)', () => {});
test.fixme('TC-106: Verify that a write-up created from SMS chat stays in SMS chat (creates a write-up for Chad: ask first)', () => {});
test.fixme('TC-107: Verify that the scorecard link sent by SMS Chat only is delivered and opens (sends the scorecard to Chad: ask first)', () => {});
test.fixme('TC-108: Verify that an E-sign request by SMS shows in the driver\'s SMS chat and its link opens (creates an E-sign: ask first)', () => {});
test.fixme('TC-109: Verify sending to both SMS and DSP short code warns about drivers without app access (ask first)', () => {});
test.fixme('TC-110: Verify that Send Report preselects SMS when it is the default channel (needs default channel = SMS)', () => {});
test.fixme('TC-111: Verify that bulk reports by SMS reach every selected driver (sends reports: ask first)', () => {});
// Automated messages, task tagging, payroll
test.fixme('TC-112: Verify the birthday/anniversary auto message is sent once in the time zone (needs a driver with a birthday today)', () => {});
test.fixme('TC-114: Verify tagging yourself in a task from Twilio chat (creates a task: ask first)', () => {});
test.fixme('TC-116: Verify chatting with an unregistered phone in Payroll chat (sends an SMS to a number that is not a test driver: ask first)', () => {});
test.fixme('TC-117: Verify Payroll chat without a payroll number gives a clear message (needs a company without a payroll number)', () => {});
// LMD Chat app notifications
test.fixme('TC-118: Verify that a Twilio push opens the Twilio chat in the LMD Chat app (app test)', () => {});
test.fixme('TC-119: Verify that an admin not in a group gets no group notification (app test)', () => {});
test.fixme('TC-120: Verify no notifications after logout / role swap (app test)', () => {});
test.fixme('TC-121: Verify that a group message push is received (app test)', () => {});
