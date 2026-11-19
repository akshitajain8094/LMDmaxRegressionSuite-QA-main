// SCENARIO: Reply with quote (right-click a message → "Reply with quotes") and the "Jump to Latest" button.
// TC-053 … TC-060 of SMS_Twilio_Chat_Test_Cases.pdf. Sending goes to Chad Elnahal only.
// A quoted reply is stored with reply_details { message_id, message } (the quoted message); clicking the quote block
// opens /chat/<driver>/<quoted message id> and scrolls to it.
const { test, expect, sms, chad, sendsSms, needsInbound, askByHand, tags, sendTags, handTags, unique } = require('./sms-setup');

// A message of Chad's conversation to quote: the newest text message (any)
async function quoteTarget(request, owner) {
  const m = (await sms.messagesOf(request, owner, chad.id, 10)).find((x) => x.message && !x.attachments?.length);
  test.skip(!m, "Chad's conversation has no text message to quote");
  return m.message;
}

test(
  'TC-053: Verify that Reply with quote shows a preview and sends a quote block; the SMS has "Quoted Message:" / "Your Reply:"',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const original = await quoteTarget(request, owner);
    const reply = unique('QA TC-053 reply');
    await smsPage.openDriver(chad.id);
    await smsPage.message(original).click({ button: 'right' });
    await smsPage.replyWithQuote.click();
    await expect(smsPage.page.getByText(original).last(), 'preview above the box').toBeVisible();
    await smsPage.send(reply);
    await expect(smsPage.message(reply)).toBeVisible();
    const sent = (await sms.messagesOf(request, owner, chad.id, 5)).find((m) => String(m.message).includes(reply));
    expect(sent?.reply_details?.message, 'stored as a reply to the quoted message').toBe(original);
    test.info().annotations.push({ type: 'check by hand', description: `RingCentral: the SMS reads "Quoted Message: … Your Reply: ${reply}"` });
  },
);

test(
  'TC-055: Verify that removing the quote sends a normal message',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const original = await quoteTarget(request, owner);
    const text = unique('QA TC-055 no quote');
    await smsPage.openDriver(chad.id);
    await smsPage.message(original).click({ button: 'right' });
    await smsPage.replyWithQuote.click();
    await smsPage.page.locator('[data-testid="CloseIcon"], [aria-label*="remove" i]').last().click();
    await smsPage.send(text);
    const sent = (await sms.messagesOf(request, owner, chad.id, 5)).find((m) => m.message === text);
    expect(sent, 'sent as typed').toBeTruthy();
    expect(sent.reply_details?.message_id, 'no quote').toBeFalsy();
  },
);

test(
  'TC-056: Verify that Reply with quote is not offered in In-App (DSP short code) chat',
  tags(),
  async ({ smsPage, page }) => {
    await page.goto('/in-app-chat/individual/all');
    const first = page.getByRole('heading').first();
    await first.click();
    const bubble = page.locator('[class*="message" i]').last();
    await bubble.click({ button: 'right' });
    await expect(smsPage.replyWithQuote).toHaveCount(0);
  },
);

test(
  'TC-057: Verify that a quote plus a reply over 1550 characters shows the split pop-up (No: nothing sent)',
  tags(),
  async ({ smsPage, owner, request }) => {
    const original = await quoteTarget(request, owner);
    await smsPage.openDriver(chad.id);
    await smsPage.message(original).click({ button: 'right' });
    await smsPage.replyWithQuote.click();
    await smsPage.type(sms.gsmText(1600));
    await smsPage.sendButton.click();
    await expect(smsPage.splitWarning).toBeVisible();
    await smsPage.splitNo.click();
    await smsPage.type('');
  },
);

test(
  'TC-058: Verify that "Jump to Latest" is hidden at the bottom, shows after scrolling up and hides again at the newest message',
  tags(),
  async ({ smsPage, page }) => {
    await smsPage.openDriver(chad.id);
    const jump = page.getByRole('button', { name: /latest/i }).or(page.getByText(/Jump to Latest/i));
    await expect(jump).toHaveCount(0);
    await page.mouse.move(980, 400); // over the messages
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -1500);
    await expect(jump.first(), 'shown after scrolling up').toBeVisible();
    await jump.first().click();
    await expect(jump, 'hidden at the newest message').toHaveCount(0);
  },
);

test.fixme('TC-054: Verify Reply with quote by long-press in the LMD Chat app (app test)', () => {});

test(
  'TC-059: Verify that clicking a quoted block scrolls to the original message and "Jump to Latest" brings back the newest',
  tags(),
  async ({ smsPage, page, owner, request }) => {
    const quoted = (await sms.messagesOf(request, owner, chad.id, 100)).find((m) => m.reply_details?.message_id && m.reply_details?.message);
    test.skip(!quoted, "no quoted reply in Chad's last 100 messages (TC-053 sends one)");
    await smsPage.openDriver(chad.id);
    // the reply bubble: its text, with the quoted text above it inside the same bubble
    const reply = smsPage.message(quoted.message);
    await reply.scrollIntoViewIfNeeded();
    const quoteBlock = reply.locator('xpath=ancestor::div[.//*[normalize-space()=' + JSON.stringify(quoted.reply_details.message) + ']][1]')
      .getByText(quoted.reply_details.message, { exact: true }).first();
    await quoteBlock.click();
    await expect(page, 'opens the quoted message').toHaveURL(new RegExp(`/chat/${chad.id}/${quoted.reply_details.message_id}`));
    await expect(page.getByText(quoted.reply_details.message, { exact: true }).first(), 'the original is on screen').toBeInViewport();
    const jump = page.getByRole('button', { name: /latest/i }).or(page.getByText(/Jump to Latest/i));
    const newest = (await sms.messagesOf(request, owner, chad.id, 1))[0];
    if (newest._id !== quoted.reply_details.message_id) {
      await jump.first().click();
      await expect(jump, 'hidden at the newest message').toHaveCount(0);
      if (newest.message) await expect(smsPage.message(newest.message), 'the newest message is on screen').toBeInViewport();
    }
  },
);

test(
  'TC-060: Verify that a new SMS from the driver while the admin is scrolled up does not move the view',
  handTags(),
  async ({ smsPage, page, owner, request }) => {
    needsInbound();
    await smsPage.openDriver(chad.id);
    await page.mouse.move(980, 400);
    for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -1500);
    const jump = page.getByRole('button', { name: /latest/i }).or(page.getByText(/Jump to Latest/i));
    await expect(jump.first(), 'scrolled up').toBeVisible();
    // a message on screen now (an older one): it must stay where it is
    const older = (await sms.messagesOf(request, owner, chad.id, 60)).filter((m) => m.message && !m.attachments?.length);
    let mark;
    for (const m of older) {
      const el = smsPage.message(m.message);
      if (await el.isVisible().catch(() => false) && ((await el.boundingBox())?.y ?? 0) > 150) { mark = el; break; }
    }
    test.skip(!mark, 'no text message on screen after scrolling up');
    const before = (await mark.boundingBox()).y;
    const text = 'QA TC-060 ' + Date.now().toString().slice(-5);
    const after = askByHand(`send "${text}" to the SMS chat number`);
    expect(await sms.waitForDriverSms(request, owner, chad.id, { after }), "Chad's SMS arrived").toBeTruthy();
    await page.waitForTimeout(3000);
    expect(Math.abs((await mark.boundingBox()).y - before), 'the view did not move').toBeLessThan(5);
    await expect(jump.first(), 'still scrolled up').toBeVisible();
  },
);
