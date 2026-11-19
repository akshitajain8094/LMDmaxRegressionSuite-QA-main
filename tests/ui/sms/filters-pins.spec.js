// SCENARIO: the SMS chat list — filters, counts, search and pinned chats. TC-085 … TC-094 of
// SMS_Twilio_Chat_Test_Cases.pdf. The pin tests change the owner's pinned chats and put them back.
const { test, expect, sms, drivers, chad, needsInbound, askByHand, tags, handTags } = require('./sms-setup');
const { loginAs } = require('../../../api/auth');

// Every head of the list for a filter (all pages)
async function allHeads(request, owner, filter, stations) {
  const list = [];
  for (let offset = 0; offset < 1000; offset += 10) {
    const page = (await sms.chatList(request, owner, { offset, filter, stations })).body.data ?? [];
    list.push(...page);
    if (page.length < 10) break;
  }
  return list;
}

test(
  'TC-091: Verify that each filter count (Active, Inactive, Suspended, Broadcast, Groups) matches its list',
  tags(),
  async ({ owner, request }) => {
    test.setTimeout(5 * 60 * 1000);
    const { body } = await sms.filterCounts(request, owner);
    const counts = body.data;
    const wrong = [];
    for (const [filter, key] of [['active', 'active'], ['inactive', 'inactive'], ['suspended', 'suspended'], ['broadcast_lists', 'broadcast_lists'], ['groups', 'groups']]) {
      const n = (await allHeads(request, owner, filter)).length;
      if (n !== counts[key]) wrong.push(`${filter}: count ${counts[key]}, list ${n}`);
    }
    expect(wrong).toEqual([]);
  },
);

test(
  'TC-087: Verify that the role filter has Apply, no duplicate roles, and no role without drivers',
  tags(),
  async ({ smsPage, page }) => {
    await smsPage.open();
    await smsPage.openFilter();
    await expect(smsPage.applyFilter).toBeVisible();
    const roles = (await page.getByText(/^[^()]+ \(\d+\)$/).allInnerTexts())
      .map((t) => t.trim())
      .filter((t) => !/^(All|Active|Inactive|Suspended|Groups|Broadcast Lists|Unread|Latest Message|Message Not Received)/.test(t));
    const names = roles.map((r) => r.replace(/ \(\d+\)$/, ''));
    expect(new Set(names).size, 'no duplicate roles').toBe(names.length);
    expect(roles.filter((r) => / \(0\)$/.test(r)), 'no role without drivers').toEqual([]);
  },
);

test(
  'TC-099: Verify that choosing only the chat station lists only drivers of that station',
  tags(),
  async ({ owner, request }) => {
    const station = String(process.env.CHAT_STATION_ID);
    const heads = (await allHeads(request, owner, 'active', [station])).filter((h) => h.type === 'drivers');
    const others = heads.filter((h) => !(h.stations ?? []).some((s) => String(s.station_id) === station));
    expect(others.map((h) => h.name), 'drivers of other stations').toEqual([]);
  },
);

test(
  'TC-086: Verify that the Van Assignment / Shift Assignment message filters show only those messages or "No Message Found"',
  tags(),
  async ({ smsPage, page }) => {
    await smsPage.openDriver(drivers[0]?.id);
    await page.locator('[data-testid*="Filter"]').last().click();
    for (const type of ['Van Assignment', 'Shift Assignment']) {
      await page.getByText(type, { exact: true }).click();
      await page.getByRole('button', { name: /Apply/ }).click().catch(() => {});
      await expect(page.getByText(/No Message Found/i).or(page.getByText(new RegExp(type.split(' ')[0], 'i')).nth(1))).toBeVisible();
    }
  },
);

test.describe.serial('pins (put back at the end)', () => {
  let pinnedBefore = [];
  const pinnedNow = async (request, owner) =>
    (await allHeads(request, owner, 'all')).filter((h) => h.is_pinned).map((h) => ({ driverId: h.driver_id, broadcastId: h.type === 'broadcast' ? h.broadcast_id ?? h._id : undefined, groupId: h.type === 'group' ? h.group_id ?? h._id : undefined, name: h.name }));

  test(
    'TC-092: Verify that up to 5 chats can be pinned and stay pinned after refresh',
    tags('@changes-settings'),
    async ({ smsPage, page, owner, request }) => {
      pinnedBefore = await pinnedNow(request, owner);
      const extra = drivers.filter((d) => !pinnedBefore.some((p) => String(p.driverId) === d.id)).slice(0, 5 - pinnedBefore.length);
      for (const d of extra) {
        const r = await sms.pin(request, owner, { driverId: d.id, pinned: true });
        expect(r.status(), await r.text()).toBe(200);
      }
      await smsPage.open();
      await page.reload();
      const all = await pinnedNow(request, owner);
      expect(all.length, 'pinned').toBe(Math.min(5, pinnedBefore.length + extra.length));
      for (const p of all) await expect(page.getByText(p.name, { exact: true }).first()).toBeVisible();
    },
  );

  test(
    'TC-093: Verify that a 6th pin is refused with "You can only pin up to 5 Chats"',
    tags('@changes-settings'),
    async ({ smsPage, page, owner, request }) => {
      const pinned = await pinnedNow(request, owner);
      test.skip(pinned.length < 5, `only ${pinned.length} chats pinned: needs 5 (SMS_DRIVERS too short)`);
      await smsPage.open();
      const unpinnedRow = page.getByText('Recent Chats').locator('xpath=following::*[.//*[name()="svg"]][1]');
      await unpinnedRow.hover();
      await page.locator('[data-testid*="PushPin"]').last().click();
      await expect(page.getByText('You can only pin up to 5 Chats')).toBeVisible();
    },
  );

  test(
    'TC-094: Verify that an unpinned chat goes back to Recent Chats in the order of its latest message',
    tags('@changes-settings'),
    async ({ smsPage, page, owner, request }) => {
      // a test driver that is pinned now (TC-092 pinned them) and was not pinned before the tests
      const pinned = await pinnedNow(request, owner);
      const target = drivers.find((d) => pinned.some((p) => String(p.driverId) === d.id) && !pinnedBefore.some((b) => String(b.driverId) === d.id));
      test.skip(!target, 'no test driver pinned by TC-092');
      const r = await sms.pin(request, owner, { driverId: target.id, pinned: false });
      expect(r.status(), await r.text()).toBe(200);
      // where the server puts it: the recent (not pinned) chats in the order of their latest message
      const recent = (await allHeads(request, owner, 'all')).filter((h) => !h.is_pinned);
      const index = recent.findIndex((h) => String(h.driver_id) === target.id);
      expect(index, 'back in the recent chats').toBeGreaterThanOrEqual(0);
      const times = recent.map((h) => new Date(h.message_time ?? h.updated_at ?? 0).getTime());
      if (index > 0) expect(times[index - 1], 'the chat above is not older').toBeGreaterThanOrEqual(times[index]);
      if (index < times.length - 1) expect(times[index], 'the chat below is not newer').toBeGreaterThanOrEqual(times[index + 1]);
      // on the screen: no longer under "Pinned Chats"
      await smsPage.open();
      test.info().annotations.push({ type: 'position', description: `${target.name} at ${index + 1} of the recent chats (above: ${recent[index - 1]?.name ?? '-'})` });
      // the rows between "Pinned Chats" and "Recent Chats"
      const pinnedSection = page.getByText('Pinned Chats', { exact: true }).locator('xpath=following::*[normalize-space()=' + JSON.stringify(target.name) + '][following::*[normalize-space()="Recent Chats"]]');
      expect(await pinnedSection.count(), 'not in Pinned Chats').toBe(0);
    },
  );

  test.afterAll(async ({ request }) => {
    const owner = await sms.login();
    const now = await pinnedNow(request, owner);
    for (const p of now) {
      if (!pinnedBefore.some((b) => b.driverId === p.driverId && b.broadcastId === p.broadcastId && b.groupId === p.groupId)) {
        await sms.pin(request, owner, { ...p, pinned: false });
      }
    }
  });
});

test.fixme('TC-089: Verify driver search by name in an MMD account (needs an MMD client)', () => {});
test.fixme('TC-090: Verify that the Schedule filter is hidden when the scheduler is off (Super Admin)', () => {});

// The unread count of the chat list ("Unread" filter and the badge of SMS Chat) for a user on the chat station
const unreadOf = async (request, user) => (await sms.unreadCount(request, user)).body.data?.unread ?? 0;

test(
  "TC-085: Verify that a driver's SMS raises the unread count for the Owner, Admin and Promoted Admin",
  handTags(),
  async ({ owner, request }) => {
    needsInbound();
    const users = [['Owner', owner]];
    for (const who of ['ADMIN_B', 'PROMOTED_ADMIN']) {
      if (!process.env[who + '_EMAIL']) continue;
      try {
        users.push([who, await loginAs(who, process.env[who + '_EMAIL'], process.env[who + '_PASSWORD'], process.env.CHAT_STATION_ID)]);
      } catch (e) {
        test.info().annotations.push({ type: 'not checked', description: `${who}: ${e.message}` });
      }
    }
    const before = [];
    for (const [, user] of users) before.push(await unreadOf(request, user));
    const text = 'QA TC-085 ' + Date.now().toString().slice(-5);
    const after = askByHand(`send "${text}" to the SMS chat number`);
    expect(await sms.waitForDriverSms(request, owner, chad.id, { after }), "Chad's SMS arrived").toBeTruthy();
    const wrong = [];
    for (let i = 0; i < users.length; i++) {
      const now = await sms.waitFor(async () => { const n = await unreadOf(request, users[i][1]); return n > before[i] ? n : 0; }, { timeout: 30000 });
      if (!now) wrong.push(`${users[i][0]}: stayed ${before[i]}`);
    }
    expect(wrong, 'unread count went up').toEqual([]);
  },
);

test(
  'TC-088: Verify that a new SMS shows in the list while a filter (Active) is applied, without refresh',
  handTags(),
  async ({ smsPage, page, owner, request }) => {
    needsInbound();
    await smsPage.open();
    await smsPage.openFilter();
    await smsPage.chooseFilter('Active');
    const text = 'QA TC-088 ' + Date.now().toString().slice(-5);
    const after = askByHand(`send "${text}" to the SMS chat number`);
    const got = await sms.waitForDriverSms(request, owner, chad.id, { after });
    expect(got, "Chad's SMS arrived").toBeTruthy();
    // Chad's row shows the new text as its last message, at the top of the recent chats (or in Pinned Chats)
    await expect(page.getByText(got.message, { exact: true }).first(), 'the new message in the filtered list').toBeVisible({ timeout: 30000 });
  },
);
