// SCENARIO: the character counter and the "too long" pop-up of SMS Chat. TC-044 … TC-052 of
// SMS_Twilio_Chat_Test_Cases.pdf.
//
// NOTE (2026-11-18, to confirm with the BA): the sheet says the limit is 1,550 characters. The web app's code uses
// 1,530 for GSM-7 text and 570 for text with emoji / curly quotes, and the counter shows "<n>/1530". The tests check
// the sheet's numbers (LIMIT below); if the BA confirms 1,530, change LIMIT.
// The pop-up: "Warning — The message exceeds the <limit>-character limit [(due to use of non-GSM characters)] and may
// not be delivered as a single message. To ensure successful delivery, we will split it into two separate messages /
// multiple parts for delivery. Do you wish to proceed?" — buttons "No" and "Yes, send as 2 messages / multiple parts".
// The tests that only look click No, so nothing is sent. Sending goes to Chad Elnahal only.
const { test, expect, sms, chad, sendsSms, tags, sendTags } = require('./sms-setup');

const LIMIT = 1550; // the sheet; the web app uses 1530
const NON_GSM_LIMIT = 570; // the web app

// The parts of a split message in Chad's conversation, newest last
async function partsOf(request, owner, tag, expected) {
  return sms.waitFor(async () => {
    const list = (await sms.messagesOf(request, owner, chad.id, 20)).filter((m) => String(m.message).includes(tag));
    return list.length >= expected ? list.reverse() : null;
  }, { timeout: 60000 });
}

test(
  'TC-044: Verify that the counter shows 100/1550, and 1560/1550 in red over the limit without blocking typing',
  tags(),
  async ({ smsPage }) => {
    await smsPage.openDriver(chad.id);
    await smsPage.type(sms.gsmText(100));
    await expect(smsPage.counter).toHaveText(`100/${LIMIT}`);
    await smsPage.type(sms.gsmText(LIMIT + 10));
    await expect(smsPage.messageBox, 'typing not blocked').toHaveValue(sms.gsmText(LIMIT + 10));
    await expect(smsPage.counter).toHaveText(`${LIMIT + 10}/${LIMIT}`);
    const color = await smsPage.counter.locator('span').first().evaluate((e) => getComputedStyle(e).color);
    expect(color, 'the count is red').toMatch(/rgb\((1\d\d|2\d\d), \d{1,2}, \d{1,2}\)/);
    await smsPage.type('');
  },
);

test(
  'TC-047: Verify that No on the split pop-up sends nothing and keeps the text',
  tags(),
  async ({ smsPage, owner, request }) => {
    const before = (await sms.messagesOf(request, owner, chad.id, 1))[0]?._id;
    const text = sms.gsmText(2000);
    await smsPage.openDriver(chad.id);
    await smsPage.type(text);
    await smsPage.sendButton.click();
    await expect(smsPage.splitWarning).toBeVisible();
    await smsPage.splitNo.click();
    await expect(smsPage.messageBox, 'text kept').toHaveValue(text);
    expect((await sms.messagesOf(request, owner, chad.id, 1))[0]?._id, 'nothing sent').toBe(before);
    await smsPage.type('');
  },
);

test(
  'TC-050: Verify that text with emoji or curly quotes uses the non-GSM limit and says so',
  tags(),
  async ({ smsPage }) => {
    await smsPage.openDriver(chad.id);
    await smsPage.type('Driver’s “update” 🙂 ' + 'x'.repeat(100));
    await expect(smsPage.page.getByText(new RegExp(`^\\d+/${NON_GSM_LIMIT}$`))).toBeVisible();
    await smsPage.page.getByText(new RegExp(`^\\d+/${NON_GSM_LIMIT}$`)).hover();
    await expect(smsPage.page.getByText(`Limit is ${NON_GSM_LIMIT} due to use of Unicode (non-GSM) characters`)).toBeVisible();
    await smsPage.type('');
  },
);

test(
  'TC-045: Verify that exactly 1550 characters are sent as ONE message without the split pop-up',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const tag = 'QA045-' + Date.now();
    await smsPage.openDriver(chad.id);
    await smsPage.send(sms.gsmText(LIMIT, tag));
    const popup = await smsPage.splitWarning.isVisible({ timeout: 3000 }).catch(() => false);
    if (popup) await smsPage.splitNo.click(); // do not send: the test fails below
    expect(popup, `no split pop-up at ${LIMIT} characters`).toBe(false);
    const parts = await partsOf(request, owner, tag, 1);
    expect(parts, 'one message').toHaveLength(1);
  },
);

test(
  'TC-046: Verify that 1551 characters show the pop-up and Yes sends exactly 2 parts "(1/2)", "(2/2)" in order',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    const tag = 'QA046-' + Date.now();
    await smsPage.openDriver(chad.id);
    await smsPage.send(sms.gsmText(LIMIT + 1, tag));
    await expect(smsPage.splitWarning).toContainText(`${LIMIT}-character limit`);
    await smsPage.splitYes.click();
    const parts = await partsOf(request, owner, '(2/2)', 2);
    expect(parts.map((m) => m.message.match(/^\((\d)\/(\d)\)/)?.[0])).toEqual(['(1/2)', '(2/2)']);
  },
);

for (const [n, expected, id] of [
  [3100, 2, 'TC-048 (3100)'],
  [3101, 3, 'TC-048 (3101)'],
  [3060, 2, 'TC-049'],
]) {
  test(
    `${id}: Verify that ${n} characters are sent as exactly ${expected} parts, each at most 1550, in order`,
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      const tag = `QA${n}-` + Date.now();
      await smsPage.openDriver(chad.id);
      await smsPage.send(sms.gsmText(n, tag));
      await expect(smsPage.splitWarning).toBeVisible();
      await expect(smsPage.splitYes).toHaveText(expected === 2 ? /2 messages/ : /multiple parts/);
      await smsPage.splitYes.click();
      const parts = await partsOf(request, owner, `(${expected}/${expected})`, expected);
      const last = parts.slice(-expected);
      expect(last.map((m) => m.message.match(/^\((\d+)\/(\d+)\)/)?.[0])).toEqual(
        Array.from({ length: expected }, (_, i) => `(${i + 1}/${expected})`),
      );
      for (const m of last) expect(m.message.length, 'each part ≤ limit').toBeLessThanOrEqual(LIMIT + 6);
    },
  );
}

test.fixme('TC-051: Verify that with a Messaging Service ID (Smart Encoder) only the GSM-7 limit is used (Super Admin setup)', () => {});

// About 10 SMS to Chad in one go: runs only with SMS_SEND=1 and SMS_LONG=1
test(
  'TC-052: Verify that a 15,000+ character paste is sent as parts (1/N) … (N/N) in order, none over the limit, nothing lost',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    test.skip(process.env.SMS_LONG !== '1', 'sends about 10 SMS to Chad: run with SMS_LONG=1');
    const text = sms.gsmText(15200, 'QA TC-052 ' + Date.now());
    const start = new Date(Date.now() - 5000);
    await smsPage.openDriver(chad.id);
    await smsPage.messageBox.evaluate((box, value) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', value);
      box.focus();
      box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, text);
    if ((await smsPage.messageBox.inputValue()).length < text.length) await smsPage.type(text); // the box did not take the paste event
    await smsPage.sendButton.click();
    await expect(smsPage.splitWarning).toBeVisible();
    await smsPage.splitYes.click();
    const parts = await sms.waitFor(async () => {
      const list = (await sms.messagesOf(request, owner, chad.id, 30)).filter((m) => !m.is_driver && new Date(m.created_at) > start && /^\(\d+\/\d+\)/.test(m.message));
      const n = Number(list[0]?.message.match(/^\(\d+\/(\d+)\)/)?.[1] ?? 0);
      return n && list.length >= n ? list.reverse() : null;
    }, { timeout: 3 * 60 * 1000 });
    expect(parts, 'all parts sent').toBeTruthy();
    const n = parts.length;
    expect(n, 'about 15,200 / 1,530 parts').toBeGreaterThanOrEqual(10);
    expect(parts.map((m) => m.message.match(/^\((\d+)\/(\d+)\)/).slice(1).join('/')), 'in order').toEqual(Array.from({ length: n }, (_, i) => `${i + 1}/${n}`));
    for (const m of parts) expect(m.message.length, 'each part ≤ limit').toBeLessThanOrEqual(LIMIT + 8);
    const joined = parts.map((m) => m.message.replace(/^\(\d+\/\d+\)\s?/, '')).join('');
    expect(joined.replace(/\s/g, ''), 'nothing lost').toBe(text.replace(/\s/g, ''));
  },
);
