// SCENARIO: the admin messages one driver in SMS Chat (/chat/<driver id>/). TC-025 … TC-035 of
// SMS_Twilio_Chat_Test_Cases.pdf. Sending goes to Chad Elnahal (QA RingCentral phone) only; the "fails" case to
// SMS_INVALID_DRIVER_ID.
const { test, expect, sms, drivers, chad, sendsSms, needsInbound, askByHand, needsInvalidDriver, tags, sendTags, handTags, unique } = require('./sms-setup');

test(
  'TC-025: Verify that a text to an active driver shows at once with the sender name and time, and ends as Delivered',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const text = unique('QA TC-025');
    await smsPage.openDriver(chad.id);
    await smsPage.send(text);
    const bubble = smsPage.message(text);
    await expect(bubble, 'shown at once').toBeVisible({ timeout: 5000 });
    const card = bubble.locator('xpath=ancestor::div[2]');
    await expect(card, 'sender name').toContainText(/Arth|Performance App/);
    await expect(card, 'time').toContainText(/\d{1,2}:\d{2} ?(AM|PM)/);
    const m = await sms.finalStatus(request, owner, chad.id, { text });
    expect(m?.status, 'Twilio status').toBe('delivered');
  },
);

test(
  'TC-027: Verify that an empty or spaces-only message cannot be sent (no blank SMS is created)',
  tags(),
  async ({ smsPage, owner, request }) => {
    const before = (await sms.messagesOf(request, owner, chad.id, 1))[0]?._id;
    await smsPage.openDriver(chad.id);
    await smsPage.type('');
    await expect(smsPage.sendButton, 'empty: Send disabled').toBeDisabled();
    await smsPage.type('     ');
    if (await smsPage.sendButton.isEnabled()) await smsPage.sendButton.click();
    await smsPage.page.waitForTimeout(3000);
    const after = (await sms.messagesOf(request, owner, chad.id, 1))[0]?._id;
    expect(after, 'no new message').toBe(before);
  },
);

test(
  'TC-028: Verify that a message to a driver whose number fails ends as Failed/Undelivered with a reason, never Delivered',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    needsInvalidDriver();
    const id = sms.invalidDriver();
    const text = unique('QA TC-028');
    await smsPage.openDriver(id);
    await smsPage.send(text);
    const m = await sms.finalStatus(request, owner, id, { text });
    expect(m?.status, 'not delivered').toMatch(/failed|undelivered/);
    expect(m?.twilio_error ?? m?.error_message, 'a reason').toBeTruthy();
    await expect(smsPage.message(text).locator('xpath=ancestor::div[3]').locator('svg[data-testid*="Error"], [color="error"]').first(), 'failed mark').toBeVisible();
  },
);

test(
  'TC-030: Verify that an emoji-only message is sent and delivered',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const text = '👍🙂 ' + Date.now();
    await smsPage.openDriver(chad.id);
    await smsPage.send(text);
    await expect(smsPage.message(text)).toBeVisible();
    expect((await sms.finalStatus(request, owner, chad.id, { text }))?.status).toBe('delivered');
  },
);

test(
  'TC-032: Verify that text typed in one driver\'s chat is not carried into another driver\'s chat',
  tags(),
  async ({ smsPage }) => {
    test.skip(drivers.length < 2, 'needs two drivers in SMS_DRIVERS');
    const other = drivers.find((d) => d.id !== chad.id);
    await smsPage.openConversation(chad.name);
    await smsPage.type('QA draft not to be sent');
    await smsPage.openConversation(other.name);
    await expect(smsPage.messageBox).toHaveValue('');
    await smsPage.openConversation(chad.name);
    await smsPage.type(''); // never sent
  },
);

test(
  'TC-033: Verify that an inactive driver can be found and opened for a 1:1 chat (history shown, message box enabled)',
  tags(),
  async ({ smsPage, owner, request }) => {
    const { body } = await sms.chatList(request, owner, { limit: 50, filter: 'inactive' });
    const inactive = (body.data ?? []).find((h) => h.type === 'drivers' && h.status === 'inactive');
    test.skip(!inactive, 'no inactive driver in the SMS chat list');
    await smsPage.openDriver(inactive.driver_id);
    await expect(smsPage.messageBox).toBeEnabled();
    await expect(smsPage.page.getByText(inactive.name).first()).toBeVisible();
  },
);

test(
  'TC-034: Verify that Export Chat is enabled and downloads the whole conversation',
  tags(),
  async ({ smsPage, owner, request }) => {
    await smsPage.openDriver(chad.id);
    await expect(smsPage.exportChat).toBeEnabled();
    const [download] = await Promise.all([smsPage.page.waitForEvent('download', { timeout: 60000 }), smsPage.exportChat.click()]);
    const file = await download.path();
    const size = require('fs').statSync(file).size;
    expect(size, 'the export is not empty').toBeGreaterThan(0);
    test.info().annotations.push({ type: 'export', description: `${download.suggestedFilename()} (${size} bytes)` });
  },
);

test.fixme('TC-029: Verify that the status moves from Queued to Delivered in the LMD Chat app (app test)', () => {});
test.fixme('TC-031: Verify that chat and Timeline show the same time zone (changes a driver\'s status: ask first)', () => {});
test.fixme('TC-035: Verify that the driver name and avatar stay when an auto-coaching message arrives (needs auto coaching)', () => {});

test(
  "TC-026: Verify that a driver reply shows in the open chat without refresh, as the driver's message",
  handTags(),
  async ({ smsPage, page, owner, request }) => {
    needsInbound();
    await smsPage.openDriver(chad.id);
    const text = 'QA TC-026 ' + Date.now().toString().slice(-5);
    const after = askByHand(`send "${text}" to the SMS chat number`);
    const got = await sms.waitForDriverSms(request, owner, chad.id, { after });
    expect(got, "Chad's SMS reached the server").toBeTruthy();
    // no reload: the open chat shows it by itself
    await expect(smsPage.message(got.message), 'shown without refresh').toBeVisible({ timeout: 30000 });
    expect(got.status).toBe('received');
  },
);

// The template picker (the icon "Select Template" next to the message box) lists the templates, each with "Select".
// For a 1:1 chat the web app puts the driver's name in place of ${name}; it keeps ${name} only for broadcast and group.
test(
  "TC-030 (template): Verify that a template with ${name} picked in a 1:1 chat shows the driver's name, not the variable (nothing sent)",
  tags(),
  async ({ smsPage, page }) => {
    await smsPage.openDriver(chad.id);
    await page.getByRole('button', { name: 'Select Template' }).click();
    const dialog = page.getByRole('dialog');
    const withName = dialog.getByText(/\$\{name\}/).first();
    await expect(withName, 'a template with ${name}').toBeVisible();
    await withName.locator('xpath=following::*[normalize-space()="Select"][1]').click();
    const typed = await smsPage.messageBox.inputValue();
    await smsPage.messageBox.fill(''); // nothing is sent
    expect(typed, 'no raw variable').not.toContain('${name}');
    expect(typed, "the driver's name").toContain(chad.name.split(' ')[0]);
  },
);
