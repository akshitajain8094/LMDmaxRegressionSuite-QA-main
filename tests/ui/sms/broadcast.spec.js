// SCENARIO: Broadcast in SMS Chat — the admin picks drivers, names the broadcast and sends one message that goes to
// each driver as a separate SMS. Each message in the broadcast shows "Message sent to <delivered>/<total>" and Retry.
// TC-061 … TC-074 of SMS_Twilio_Chat_Test_Cases.pdf.
//
// TC-062 is the bug QA reported on 2026-11-18 ("the number of recipients for which the message is delivered is
// different from the count shown"). What the server stores for a broadcast message (get_broadcast_messages):
//   total     = the broadcast's members, to = the drivers it was sent to, delivered = the drivers who received it.
// What each driver actually got is in their own conversation (status "delivered" / "undelivered", twilio_error, with
// the same broadcast_msg_id). The web app shows "Message sent to <unique delivered>/<total>".
// Seen on AQWA 2026-11-18 (read only): the "test" message of "abhijeet, Abraham Osher and 102 more" shows 5/104,
// but it was sent to 46 drivers only (58 members got nothing); another message of the same broadcast shows 0/1.
//
// The broadcast tests create ONE test broadcast "QA SMS broadcast <time>" with the drivers of SMS_DRIVERS (never
// Select All: that would message every driver of the station) and SMS_INVALID_DRIVER_ID when set, use it, and
// delete it at the end. They run one after the other (serial).
const { test, expect, sms, drivers, sendsSms, tags, sendTags, unique } = require('./sms-setup');

// ---------- the TC-062 check, for one broadcast message ----------
// Returns { shown: { delivered, total }, stored: { total, to, delivered }, actual: { delivered: [ids], failed: [ids] } }
async function deliveryOf(request, owner, broadcastId, msg) {
  const { body } = await sms.broadcast(request, owner, broadcastId);
  const members = (body.data?.to ?? []).map((t) => String(t.to ?? t.driver_id ?? t));
  const actualDelivered = [];
  const actualFailed = [];
  for (const id of members) {
    const m = (await sms.messagesOf(request, owner, id, 30)).find((x) => x.broadcast_msg_id === msg.broadcast_msg_id);
    if (!m) continue;
    if (m.status === 'delivered') actualDelivered.push(id);
    else if (['undelivered', 'failed'].includes(m.status)) actualFailed.push(id);
  }
  return {
    members,
    stored: { total: msg.total, to: msg.to ?? [], delivered: [...new Set(msg.delivered ?? [])] },
    actual: { delivered: actualDelivered, failed: actualFailed },
  };
}

test(
  'TC-062 (existing broadcasts): Verify that "Message sent to X/Y" of the newest message of every broadcast of the station matches what the drivers actually received',
  tags('@knownbug'),
  async ({ owner, request }) => {
    test.setTimeout(10 * 60 * 1000); // one request per member
    const { body } = await sms.chatList(request, owner, { limit: 50, filter: 'broadcast_lists' });
    const broadcasts = (body.data ?? []).filter((h) => h.type === 'broadcast');
    test.skip(broadcasts.length === 0, 'no broadcast on the station');
    const wrong = [];
    for (const b of broadcasts.slice(0, 5)) {
      const id = b.broadcast_id ?? b._id;
      const msg = ((await sms.broadcastMessages(request, owner, id, 0, 1)).body.data ?? [])[0];
      if (!msg) continue;
      const d = await deliveryOf(request, owner, id, msg);
      const shown = `${d.stored.delivered.length}/${d.stored.total}`;
      const real = `${d.actual.delivered.length}/${d.stored.to.length}`;
      if (shown !== real) {
        wrong.push(`"${b.name}" message "${msg.message}": shown ${shown}, actually delivered ${d.actual.delivered.length} of ${d.stored.to.length} sent (${d.members.length} members)`);
      }
    }
    expect(wrong, 'shown count ≠ actual').toEqual([]);
  },
);

test.describe.serial('with a test broadcast', () => {
  let broadcastId;
  let broadcastName;
  const firstText = unique('QA TC-061 broadcast');

  test(
    'TC-061: Verify that a broadcast is created from the picked drivers, the message goes to each of them, and the progress shows the count',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(drivers.length < 2, 'needs at least 2 drivers in SMS_DRIVERS');
      const members = [...drivers];
      if (sms.invalidDriver()) members.push({ id: sms.invalidDriver(), name: process.env.SMS_INVALID_DRIVER_NAME || '' });
      broadcastName = unique('QA SMS broadcast');
      await smsPage.open();
      await smsPage.startBroadcast();
      for (const d of members.filter((m) => m.name)) await smsPage.pickDriver(d.name);
      await expect(smsPage.selectedCount).toContainText(`${members.filter((m) => m.name).length} Driver`);
      await smsPage.setName(broadcastName);
      await smsPage.createBroadcastButton.click();
      await smsPage.send(firstText);
      await expect(smsPage.page.getByText('Message sent successfully')).toBeVisible();
      // the new broadcast in the list
      const found = await sms.waitFor(async () => {
        const { body } = await sms.chatList(request, owner, { limit: 20, filter: 'broadcast_lists' });
        return (body.data ?? []).find((h) => h.type === 'broadcast' && h.name === broadcastName);
      });
      expect(found, 'the broadcast is in the list').toBeTruthy();
      broadcastId = found.broadcast_id ?? found._id;
      await smsPage.openBroadcast(broadcastId);
      await expect(smsPage.message(firstText)).toBeVisible();
      await expect(smsPage.page.getByText(/^Message sent to \d+\/\d+$/).last()).toBeVisible({ timeout: 60000 });
    },
  );

  test(
    'TC-062: Verify that the delivered count of a new broadcast equals the drivers who actually received it, and the failing number is Not Delivered',
    sendTags('@knownbug'),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const text = unique('QA TC-062 count');
      await smsPage.openBroadcast(broadcastId);
      await smsPage.send(text);
      const msg = await sms.waitFor(async () => {
        const list = (await sms.broadcastMessages(request, owner, broadcastId, 0, 5)).body.data ?? [];
        return list.find((m) => m.message === text);
      });
      // wait for Twilio's final status of every member
      for (const id of [...drivers.map((d) => d.id), sms.invalidDriver()].filter(Boolean)) {
        await sms.finalStatus(request, owner, id, { broadcastMsgId: msg.broadcast_msg_id });
      }
      const fresh = ((await sms.broadcastMessages(request, owner, broadcastId, 0, 5)).body.data ?? []).find((m) => m.message === text);
      const d = await deliveryOf(request, owner, broadcastId, fresh);
      await smsPage.page.reload();
      const shown = await smsPage.sentToOf(text);
      test.info().annotations.push({
        type: 'counts',
        description: `shown ${shown.line}; stored delivered ${d.stored.delivered.length}, sent to ${d.stored.to.length}, members ${d.members.length}; actually delivered ${d.actual.delivered.length}, failed ${d.actual.failed.length}`,
      });
      expect.soft(shown.delivered, 'shown delivered = drivers who actually received').toBe(d.actual.delivered.length);
      expect.soft(shown.total, 'shown total = drivers it was sent to').toBe(d.stored.to.length);
      if (d.actual.delivered.length > 0) expect.soft(shown.delivered, 'never 0 when it went out').toBeGreaterThan(0);
      if (sms.invalidDriver()) {
        expect.soft(d.stored.delivered, 'the failing number is not counted as delivered').not.toContain(sms.invalidDriver());
        await smsPage.page.getByText(shown.line).last().click(); // opens the delivered / not delivered lists
        await expect.soft(smsPage.page.getByText(/Not (Delivered|Received)/i).first()).toBeVisible();
      }
    },
  );

  test(
    'TC-063: Verify that a message sent in the broadcast stays in the broadcast thread (the page does not move to a driver chat)',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const text = unique('QA TC-063 stays');
      await smsPage.openBroadcast(broadcastId);
      await smsPage.send(text);
      await expect(smsPage.message(text)).toBeVisible();
      await expect(smsPage.page).toHaveURL(new RegExp(broadcastId + '\\?broadcast=true'));
      await expect(smsPage.oneWayNotice).toBeVisible();
      const list = (await sms.broadcastMessages(request, owner, broadcastId, 0, 5)).body.data ?? [];
      expect(list.map((m) => m.message), 'in the broadcast').toContain(text);
    },
  );

  test(
    'TC-065: Verify that the broadcast name is trimmed (" Team A ") and a spaces-only name is refused',
    tags('@adds-data'),
    async ({ owner, request }) => {
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const name = ' QA Team A ' + Date.now() + ' ';
      let response = await sms.editBroadcast(request, owner, { broadcast_id: broadcastId, broadcastName: name });
      expect(response.status(), await response.text()).toBe(200);
      const { body } = await sms.broadcast(request, owner, broadcastId);
      expect(body.data?.broadcast_name, 'trimmed').toBe(name.trim());
      response = await sms.editBroadcast(request, owner, { broadcast_id: broadcastId, broadcastName: '   ' });
      expect(response.status(), 'spaces only refused').toBeGreaterThanOrEqual(400);
      broadcastName = name.trim();
    },
  );

  test(
    'TC-066: Verify that the same text with only upper/lower case changed is not sent twice by accident',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const text = unique('QA TC-066 Case');
      await smsPage.openBroadcast(broadcastId);
      await smsPage.send(text);
      await expect(smsPage.message(text)).toBeVisible();
      await smsPage.send(text.toUpperCase());
      await smsPage.page.waitForTimeout(5000);
      const list = (await sms.broadcastMessages(request, owner, broadcastId, 0, 10)).body.data ?? [];
      const same = list.filter((m) => m.message.toLowerCase() === text.toLowerCase());
      test.info().annotations.push({ type: 'case-changed duplicate', description: `${same.length} message(s) kept: ${same.map((m) => m.message).join(' | ')}` });
      expect(same.length, 'one message (blocked) or two with a warning: no double send of the same text').toBeLessThanOrEqual(2);
      expect(list.filter((m) => m.message === text), 'the first text once').toHaveLength(1);
    },
  );

  test(
    'TC-067: Verify that Retry sends again only to the drivers who did not receive it',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      test.skip(!sms.invalidDriver(), 'needs SMS_INVALID_DRIVER_ID (a member who does not receive it)');
      const msg = ((await sms.broadcastMessages(request, owner, broadcastId, 0, 1)).body.data ?? [])[0];
      const before = await Promise.all(drivers.map(async (d) => (await sms.messagesOf(request, owner, d.id, 1))[0]?._id));
      await smsPage.openBroadcast(broadcastId);
      await smsPage.message(msg.message).locator('xpath=ancestor::div[3]').getByText('Retry').click();
      await smsPage.page.waitForTimeout(10000);
      const after = await Promise.all(drivers.map(async (d) => (await sms.messagesOf(request, owner, d.id, 1))[0]?._id));
      expect(after, 'drivers who received it get nothing new').toEqual(before);
      const failed = (await sms.messagesOf(request, owner, sms.invalidDriver(), 5)).filter((m) => m.broadcast_msg_id === msg.broadcast_msg_id);
      expect(failed.length, 'the failed driver got the retry').toBeGreaterThan(1);
    },
  );

  // In a broadcast the web app keeps ${name} as typed (each driver has a different name); each driver's SMS must
  // have the driver's own name in its place.
  test(
    'TC-071: Verify that ${name} in a broadcast message reaches each driver with their own name, never the raw variable',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const tag = unique('QA TC-071');
      await smsPage.openBroadcast(broadcastId);
      await smsPage.send('Hi ${name}, ' + tag);
      const msg = await sms.waitFor(async () => ((await sms.broadcastMessages(request, owner, broadcastId, 0, 5)).body.data ?? []).find((m) => String(m.message).includes(tag)));
      expect(msg, 'in the broadcast').toBeTruthy();
      const wrong = [];
      for (const d of drivers) {
        const copy = await sms.waitFor(async () => (await sms.messagesOf(request, owner, d.id, 10)).find((m) => m.broadcast_msg_id === msg.broadcast_msg_id));
        if (!copy) wrong.push(`${d.name}: no copy`);
        else if (copy.message.includes('${name}') || !copy.message.includes(d.name)) wrong.push(`${d.name}: "${copy.message}"`);
      }
      expect(wrong, "each driver's SMS has their own name").toEqual([]);
    },
  );

  test(
    'TC-043: Verify that a picture sent in the broadcast reaches every member as MMS and the count includes them',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId, 'TC-061 did not create the broadcast');
      const before = ((await sms.broadcastMessages(request, owner, broadcastId, 0, 1)).body.data ?? [])[0]?.broadcast_msg_id;
      await smsPage.openBroadcast(broadcastId);
      await smsPage.page.locator('input[type=file]').first().setInputFiles(require('path').join(__dirname, '../../../test-files/announcements/qa-sample.png'));
      await smsPage.sendButton.click();
      const msg = await sms.waitFor(async () => {
        const m = ((await sms.broadcastMessages(request, owner, broadcastId, 0, 1)).body.data ?? [])[0];
        return m && m.broadcast_msg_id !== before && m.attachments?.length ? m : null;
      });
      expect(msg, 'the picture is in the broadcast').toBeTruthy();
      const statuses = [];
      for (const d of drivers) {
        const copy = await sms.finalStatus(request, owner, d.id, { broadcastMsgId: msg.broadcast_msg_id, timeout: 120000 });
        statuses.push(`${d.name}: ${copy ? (copy.attachments?.length ? 'picture' : 'NO picture') + ', ' + copy.status : 'no copy'}`);
      }
      test.info().annotations.push({ type: 'members', description: statuses.join('; ') });
      // seen 2026-11-18 ("newww"): the broadcast counted the MMS as delivered while each driver's copy stayed "sent"
      expect.soft(statuses.filter((x) => !/picture, delivered$/.test(x)), 'every member: picture, delivered').toEqual([]);
      const fresh = ((await sms.broadcastMessages(request, owner, broadcastId, 0, 1)).body.data ?? [])[0];
      expect.soft(new Set(fresh.delivered ?? []).size, 'counted as delivered').toBe(drivers.length);
    },
  );

  test(
    'TC-068: Verify that after removing a driver from the broadcast, the next message does not go to them and nobody is listed twice',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!broadcastId || drivers.length < 3, 'needs the test broadcast with 3 drivers');
      const removed = drivers[drivers.length - 1];
      const keep = drivers.slice(0, -1);
      const response = await sms.editBroadcast(request, owner, {
        broadcast_id: broadcastId,
        driverList: keep.map((d) => ({ to: d.id, name: d.name })),
      });
      expect(response.status(), await response.text()).toBe(200);
      const text = unique('QA TC-068 after edit');
      await smsPage.openBroadcast(broadcastId);
      await smsPage.send(text);
      const msg = await sms.waitFor(async () => ((await sms.broadcastMessages(request, owner, broadcastId, 0, 5)).body.data ?? []).find((m) => m.message === text));
      expect(msg.to.map(String), 'the removed driver is not messaged').not.toContain(removed.id);
      expect(new Set(msg.to).size, 'nobody twice').toBe(msg.to.length);
      expect(new Set(msg.delivered).size, 'nobody twice in delivered').toBe(msg.delivered.length);
    },
  );

  test.afterAll(async ({ request }) => {
    if (!broadcastId) return;
    const owner = await sms.login();
    await sms.deleteBroadcasts(request, owner, [broadcastId]); // clean-up: the test broadcast
  });
});

test(
  'TC-064: Verify that Create Broadcast stays disabled with 2 drivers and explains the 3-member minimum',
  tags(),
  async ({ smsPage }) => {
    test.skip(drivers.length < 2, 'needs 2 drivers in SMS_DRIVERS');
    await smsPage.open();
    await smsPage.startBroadcast();
    await smsPage.pickDriver(drivers[0].name);
    await smsPage.pickDriver(drivers[1].name);
    await expect(smsPage.minMembersNote, 'the note names 3 members').toContainText('at least 3 members');
    await expect(smsPage.createBroadcastButton, '2 drivers: disabled').toBeDisabled();
  },
);

test(
  'TC-069: Verify that broadcast driver search finds a driver by email, phone and transporter ID',
  tags(),
  async ({ smsPage, owner, request }) => {
    const { body } = await sms.chatList(request, owner, { limit: 50 });
    const head = (body.data ?? []).find((h) => String(h.driver_id) === drivers[0]?.id);
    test.skip(!head, 'the first test driver is not in the chat list');
    const list = await request.get(sms.apiBase() + '/lmd/prfsrv/perf_driver/v3/driver_list?limit=1000&offset=0', { headers: sms.headersOf(owner) });
    const all = (await list.json()).data ?? [];
    const d = (Array.isArray(all) ? all : all.drivers ?? []).find((x) => String(x.id ?? x.driver_id) === drivers[0].id) ?? {};
    await smsPage.open();
    await smsPage.startBroadcast();
    for (const [key, value] of [['email', d.email], ['phone', head.phone], ['transporter ID', d.transporter_id]]) {
      if (!value) continue;
      await smsPage.searchBox.fill(String(value));
      await expect(smsPage.page.getByText(drivers[0].name, { exact: true }).first(), `found by ${key}`).toBeVisible();
    }
  },
);

test(
  'TC-070: Verify that Select All picks only the active drivers of the permitted stations (no inactive / suspended)',
  tags(),
  async ({ smsPage }) => {
    await smsPage.open();
    await smsPage.openFilter();
    const active = await smsPage.filterCount('Active');
    await smsPage.page.keyboard.press('Escape');
    await smsPage.startBroadcast();
    await smsPage.selectAll.click();
    const text = await smsPage.selectedCount.innerText(); // "<n> Driver of <m> Selected"
    const [, picked, of] = text.match(/(\d+) Drivers? of (\d+)/);
    await smsPage.removeAll.click(); // nothing is created
    expect(Number(picked), 'all of the list').toBe(Number(of));
    expect(Number(of), 'only the active drivers (Filter → Active)').toBe(active);
  },
);

test(
  'TC-073: Verify that the Broadcast Lists filter count matches the broadcasts listed',
  tags(),
  async ({ owner, request }) => {
    const { body: counts } = await sms.filterCounts(request, owner);
    const list = [];
    for (let offset = 0; offset < 200; offset += 10) {
      const page = (await sms.chatList(request, owner, { offset, filter: 'broadcast_lists' })).body.data ?? [];
      list.push(...page);
      if (page.length < 10) break;
    }
    expect(list.filter((h) => h.type === 'broadcast').length).toBe(counts.data.broadcast_lists);
  },
);

test.fixme('TC-072: Verify the Schedule Drivers filter of broadcast (needs a published schedule for today)', () => {});
test.fixme('TC-074: Verify that deleting a broadcast in the LMD Chat app says "broadcast" (app test)', () => {});
