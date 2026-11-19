// SCENARIO: the secondary Twilio chat of the company (Chat → <secondary name>, /chat-v2; "Secondaryyy" on AQWA).
// TC-012 … TC-024 of SMS_Twilio_Chat_Test_Cases.pdf. Adding, deleting and swapping numbers is done in Super Admin
// (not used): fixme. A driver replying from a phone needs the QA RingCentral phone (Chad): fixme with the steps.
const { test, expect, sms, chad, sendsSms, needsInbound, askByHand, tags, sendTags, handTags, unique } = require('./sms-setup');

const secondaryName = () => process.env.SMS_SECONDARY_NAME || 'Secondaryyy';
const menuItem = (page, name) => page.getByText(name, { exact: true }).first();
async function openChatMenu(page) {
  await page.getByRole('link', { name: /Dashboard/ }).first().hover().catch(() => {});
  await page.mouse.click(27, 180); // the chat icon of the left bar (it opens SMS Chat, Payroll, In-App Chat, <secondary>)
}

test(
  'TC-021: Verify that the secondary chat lists drivers, and search finds a driver by name and by phone',
  tags(),
  async ({ smsPage, page, owner, request }) => {
    await smsPage.openSecondary();
    await expect(page.getByText('Select Chat to Start Conversation')).toBeVisible({ timeout: 30000 });
    const { body } = await sms.chatList(request, owner, { limit: 50 });
    const phone = (body.data ?? []).find((h) => String(h.driver_id) === chad.id)?.phone;
    await smsPage.search(chad.name);
    await expect(page.getByText(chad.name, { exact: true }).first(), 'found by name').toBeVisible();
    if (phone) {
      await smsPage.search(phone);
      await expect(page.getByText(chad.name, { exact: true }).first(), 'found by phone').toBeVisible();
    }
  },
);

test(
  'TC-019, TC-020: Verify that the owner can rename the secondary chat with 50 characters, and 51 are refused (name put back)',
  tags('@changes-settings'),
  async ({ smsPage, page }) => {
    const original = secondaryName();
    const fifty = 'QA secondary chat name 50 chars ' + 'x'.repeat(18);
    expect(fifty).toHaveLength(50);
    await openChatMenu(page);
    const pencil = menuItem(page, original).locator('xpath=following-sibling::*[1] | ../following-sibling::*[1]').first();
    try {
      await pencil.click();
      const box = page.getByRole('textbox').last();
      await box.fill(fifty + 'y');
      await expect(box, '51st character not taken').toHaveValue(fifty);
      await box.fill(fifty);
      await page.getByRole('button', { name: /Save|Update/ }).click();
      await openChatMenu(page);
      await expect(page.getByText(fifty).first(), 'the new name in the menu').toBeVisible();
    } finally {
      // put the original name back
      await openChatMenu(page);
      const now = page.getByText(fifty).first();
      if (await now.isVisible().catch(() => false)) {
        await now.locator('xpath=following-sibling::*[1] | ../following-sibling::*[1]').first().click();
        await page.getByRole('textbox').last().fill(original);
        await page.getByRole('button', { name: /Save|Update/ }).click();
      }
    }
  },
);

test(
  'TC-017: Verify that a message sent from the secondary chat stays in the secondary chat, not in the primary (check the phone: secondary number)',
  sendTags(),
  async ({ smsPage, page, owner, request }) => {
    sendsSms();
    const text = unique('QA TC-017 from secondary');
    await smsPage.openSecondary();
    await smsPage.openConversation(chad.name);
    await smsPage.send(text);
    await expect(smsPage.message(text)).toBeVisible();
    const { body } = await sms.conversation(request, owner, chad.id, 0, 20);
    expect((body.data ?? []).map((m) => m.message), 'not in the primary SMS chat').not.toContain(text);
    test.info().annotations.push({ type: 'check by hand', description: `Chad's RingCentral phone: "${text}" comes from the SECONDARY number` });
  },
);

test(
  'TC-023: Verify that a PNG sent from the secondary chat is not Failed / "invalid content type"',
  sendTags(),
  async ({ smsPage, page }) => {
    sendsSms();
    await smsPage.openSecondary();
    await smsPage.openConversation(chad.name);
    await page.locator('input[type=file]').first().setInputFiles(require('path').join(__dirname, '../../../test-files/announcements/qa-sample.png'));
    await smsPage.sendButton.click();
    await expect(page.getByText(/invalid content type|failed/i)).toHaveCount(0, { timeout: 30000 });
  },
);

test.fixme('TC-012: Verify that a secondary number in E.164 format adds a "Performance - <number>" chat (Super Admin)', () => {});
test.fixme('TC-013: Verify that an invalid E.164 secondary number is refused (Super Admin)', () => {});
test.fixme('TC-014: Verify that Cancel on Add Twilio Number changes nothing (Super Admin)', () => {});
test.fixme('TC-015: Verify that deleting the secondary number removes its chat and history (Super Admin, deletes data)', () => {});
test.fixme('TC-016: Verify that a long secondary number stays inside the page (Super Admin)', () => {});
test.fixme('TC-018: Verify that swapping primary and secondary numbers sends from the right number (Super Admin)', () => {});

// The unread badge next to the secondary chat in the chat menu (0 when there is none)
async function secondaryBadge(page) {
  await openChatMenu(page);
  const row = menuItem(page, secondaryName()).locator('xpath=ancestor::*[self::li or self::a or self::div][1]');
  const n = Number((await row.innerText()).match(/(\d+)/)?.[1] ?? 0);
  await page.keyboard.press('Escape');
  return n;
}

test(
  'TC-022: Verify that an SMS from a driver to the secondary number shows in the secondary chat without a station label',
  handTags(),
  async ({ smsPage, page, owner, request }) => {
    needsInbound();
    await smsPage.openSecondary();
    await smsPage.openConversation(chad.name);
    const text = 'QA TC-022 ' + Date.now().toString().slice(-5);
    askByHand(`send "${text}" to the SECONDARY number (${secondaryName()})`);
    const bubble = page.getByText(text, { exact: true }).last();
    await expect(bubble, 'shown in the secondary chat').toBeVisible({ timeout: 3 * 60 * 1000 });
    const around = await bubble.locator('xpath=ancestor::div[2]').innerText();
    expect(around, 'no station label on the message').not.toMatch(new RegExp('\\b' + process.env.CHAT_STATION_CODE + '\\b'));
    const primary = (await sms.messagesOf(request, owner, chad.id, 10)).map((m) => m.message);
    expect(primary, 'not in the primary SMS chat').not.toContain(text);
  },
);

test(
  'TC-024: Verify that 2 SMS from a driver to the secondary number raise its unread badge by 2',
  handTags(),
  async ({ smsPage, page }) => {
    needsInbound();
    await smsPage.open(); // not in the secondary chat, so the messages stay unread
    const before = await secondaryBadge(page);
    const tag = Date.now().toString().slice(-5);
    askByHand(`send 2 SMS, "QA TC-024 one ${tag}" and "QA TC-024 two ${tag}", to the SECONDARY number (${secondaryName()})`);
    await expect.poll(() => secondaryBadge(page), { timeout: 3 * 60 * 1000, intervals: [10000] }).toBe(before + 2);
  },
);
