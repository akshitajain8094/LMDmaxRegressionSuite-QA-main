// SCENARIO: pictures and files in SMS Chat (MMS). TC-036 … TC-043 of SMS_Twilio_Chat_Test_Cases.pdf.
// The web app refuses files over 5 MB ("File size should be less than 5MB") and compresses big pictures
// ("Compressed image size exceeds 5MB limit."). Sending goes to Chad Elnahal only.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { test, expect, sms, chad, sendsSms, tags, sendTags } = require('./sms-setup');

const files = path.join(__dirname, '../../../test-files/announcements');
const png = path.join(files, 'qa-sample.png');
const pdf = path.join(files, 'qa-sample.pdf');

// A PNG of about `mb` MB (random pixels, so it does not compress), written into the test's output folder
function bigPng(testInfo, mb) {
  const width = 1200;
  const height = Math.ceil((mb * 1024 * 1024) / (width * 3));
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    require('crypto').randomFillSync(raw, y * (width * 3 + 1) + 1, width * 3);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const out = testInfo.outputPath('qa-big-picture.png');
  fs.writeFileSync(out, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 0 })),
    chunk('IEND', Buffer.alloc(0)),
  ]));
  return out;
}
const attach = (smsPage, file) => smsPage.page.locator('input[type=file]').first().setInputFiles(file);
const lastMessage = async (request, owner) => (await sms.messagesOf(request, owner, chad.id, 1))[0];

test(
  'TC-036: Verify that a picture under 5 MB is sent as MMS and shows in the chat without refresh',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    await smsPage.openDriver(chad.id);
    await attach(smsPage, png);
    await smsPage.sendButton.click();
    await expect(smsPage.page.locator('img[src*="amazonaws"], img[src*="cloudfront"], img[src^="blob:"]').last()).toBeVisible({ timeout: 30000 });
    const m = await sms.waitFor(async () => {
      const x = await lastMessage(request, owner);
      return x?.attachments?.length && ['delivered', 'undelivered', 'failed'].includes(x.status) ? x : null;
    }, { timeout: 90000 });
    expect(m?.status, 'MMS delivered').toBe('delivered');
  },
);

test(
  'TC-037: Verify that a picture over the Twilio limit is compressed and delivered (no "Invalid Media URL")',
  sendTags(),
  async ({ smsPage, owner, request }, testInfo) => {
    sendsSms();
    await smsPage.openDriver(chad.id);
    await attach(smsPage, bigPng(testInfo, 6));
    await smsPage.sendButton.click();
    await expect(smsPage.page.getByText(/Invalid Media URL|less than 5MB|exceeds 5MB/i)).toHaveCount(0, { timeout: 30000 });
    const m = await sms.waitFor(async () => {
      const x = await lastMessage(request, owner);
      return x?.attachments?.length && ['delivered', 'undelivered', 'failed'].includes(x.status) ? x : null;
    }, { timeout: 120000 });
    expect(m?.status).toBe('delivered');
  },
);

test(
  'TC-038: Verify that a PDF is sent and can be opened',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    await smsPage.openDriver(chad.id);
    await attach(smsPage, pdf);
    await smsPage.sendButton.click();
    const m = await sms.waitFor(async () => {
      const x = await lastMessage(request, owner);
      return x?.attachments?.length && ['delivered', 'undelivered', 'failed'].includes(x.status) ? x : null;
    }, { timeout: 90000 });
    expect(m?.status).toBe('delivered');
    const link = String(m.attachments[0].url ?? m.attachments[0]);
    expect((await request.get(link)).status(), 'the PDF link opens').toBe(200);
  },
);

test(
  'TC-039: Verify that a video (MP4) cannot be attached and a clear message is shown',
  tags(),
  async ({ smsPage, owner, request }, testInfo) => {
    const mp4 = testInfo.outputPath('qa-video.mp4');
    fs.writeFileSync(mp4, Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(2048)]));
    const before = (await lastMessage(request, owner))?._id;
    await smsPage.openDriver(chad.id);
    await attach(smsPage, mp4).catch(() => {}); // the box may not even accept it
    await expect(smsPage.page.getByText(/not (allowed|supported)|invalid file|only .*(image|pdf)/i).first()).toBeVisible();
    if (await smsPage.sendButton.isEnabled()) await smsPage.sendButton.click(); // must not send the video
    await smsPage.page.waitForTimeout(3000);
    expect((await lastMessage(request, owner))?._id, 'nothing sent').toBe(before);
  },
);

test(
  'TC-041: Verify that a picture pasted into the message box is attached and delivered',
  sendTags(),
  async ({ smsPage, owner, request }) => {
    sendsSms();
    await smsPage.openDriver(chad.id);
    const bytes = [...fs.readFileSync(png)];
    await smsPage.messageBox.evaluate((box, data) => {
      const file = new File([new Uint8Array(data)], 'pasted.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    }, bytes);
    await smsPage.sendButton.click();
    const m = await sms.waitFor(async () => {
      const x = await lastMessage(request, owner);
      return x?.attachments?.length && ['delivered', 'undelivered', 'failed'].includes(x.status) ? x : null;
    }, { timeout: 90000 });
    expect(m?.status).toBe('delivered');
  },
);

test.fixme('TC-040: Verify that a WEBP picture from LMD Cloud is sent (needs a WEBP file in LMD Cloud)', () => {});
test.fixme('TC-042: Verify that a picture sent from RingCentral shows as a picture in the LMD Chat app (app test)', () => {});
// TC-043 (a picture sent in a broadcast) is in broadcast.spec.js: it needs the test broadcast.
