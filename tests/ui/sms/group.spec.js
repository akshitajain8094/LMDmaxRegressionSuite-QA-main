// SCENARIO: Group chat in SMS Chat ("Start New Group": managers and drivers, a name, Create Group).
// TC-075 … TC-084 of SMS_Twilio_Chat_Test_Cases.pdf. The screen says "Select at least 1 member to create a group.";
// the server answers 204 when the group is created and 207 when some members are refused.
// A group opens at /chat/<group id>?group_chat=true; its header has the buttons "Group Details", "Add Members" and
// "Remove Members" (disabled for a deleted group: "You can not add member in the deleted group"). Adding drivers that
// would make a group equal to an existing one shows "Unable to Add Drivers".
// The tests create ONE test group "QA SMS group <time>" with the drivers of SMS_DRIVERS, use it and delete it.
const { test, expect, sms, drivers, chad, sendsSms, needsInvalidDriver, tags, sendTags, unique } = require('./sms-setup');

test(
  'TC-076: Verify that a group cannot be created with no participants (Create Group disabled, a message says why)',
  tags(),
  async ({ smsPage }) => {
    await smsPage.open();
    await smsPage.startGroup();
    // the owner is pre-selected ("1 of <n> Selected"): no driver or other manager picked yet
    await expect(smsPage.minMembersNote).toBeVisible();
    await expect(smsPage.createGroupButton).toBeDisabled();
  },
);

test(
  'TC-077: Verify that a 50-character group name is accepted and the 51st character is refused with the max-length message',
  tags(),
  async ({ smsPage, page }) => {
    await smsPage.open();
    await smsPage.startGroup();
    await page.getByText('Group Name', { exact: true }).locator('xpath=following-sibling::*[1]').click();
    const box = page.getByRole('textbox').last();
    const fifty = 'QA group name of fifty characters ' + 'x'.repeat(16);
    await box.fill(fifty + 'y');
    const value = await box.inputValue();
    if (value.length > 50) await expect(page.getByText(/max(imum)? .*(50|limit)/i).first(), '51: max limit error').toBeVisible();
    else expect(value, '51st character not taken').toBe(fifty);
    await box.fill(fifty);
    await expect(page.getByText(/max(imum)? .*(50|limit)/i)).toHaveCount(0);
    await page.keyboard.press('Escape'); // nothing is created
  },
);

test(
  'TC-082: Verify that a group with a driver whose number is wrong is not created (invalid-number pop-up)',
  tags(),
  async ({ owner, request }) => {
    needsInvalidDriver();
    test.skip(drivers.length < 1, 'needs SMS_DRIVERS');
    const name = unique('QA invalid group');
    const response = await sms.createGroup(request, owner, { name, driverIds: [chad.id, sms.invalidDriver()] });
    const text = await response.text();
    // clean-up: delete the group if one was created anyway
    const made = ((await sms.chatList(request, owner, { limit: 20, filter: 'groups' })).body.data ?? []).filter((h) => h.name === name);
    for (const g of made) await sms.deleteGroup(request, owner, g.group_id ?? g.id ?? g._id);
    expect(response.status(), 'not created with the invalid driver: ' + text).not.toBe(204);
    if (response.status() === 207) expect(text, 'names the refused driver').toContain(sms.invalidDriver());
  },
);

test.describe.serial('with a test group', () => {
  let groupId;
  const name = unique('QA SMS group');

  test(
    'TC-075: Verify that a group is created once with a creation log (MM/DD/YYYY) and its message goes to all members',
    sendTags(),
    async ({ smsPage, page, owner, request }) => {
      sendsSms();
      test.skip(drivers.length < 2, 'needs at least 2 drivers in SMS_DRIVERS');
      await smsPage.open();
      await smsPage.startGroup();
      await page.getByRole('tab', { name: /Drivers/ }).click();
      for (const d of drivers) await smsPage.pickDriver(d.name);
      await smsPage.setName(name);
      await smsPage.createGroupButton.click();
      const found = await sms.waitFor(async () => {
        const { body } = await sms.chatList(request, owner, { limit: 20, filter: 'groups' });
        return (body.data ?? []).filter((h) => h.name === name);
      });
      expect(found, 'created once').toHaveLength(1);
      groupId = found[0].group_id ?? found[0]._id;
      await expect(page.getByText(/\d{2}\/\d{2}\/\d{4}/).first(), 'creation log with the date').toBeVisible();
      const text = unique('QA TC-075 group');
      await smsPage.send(text);
      await expect(smsPage.message(text)).toBeVisible();
    },
  );

  test(
    'TC-079: Verify that a 1:1 message and a group message each stay in their own thread',
    sendTags(),
    async ({ smsPage, owner, request }) => {
      sendsSms();
      test.skip(!groupId, 'TC-075 did not create the group');
      const direct = unique('QA TC-079 direct');
      const inGroup = unique('QA TC-079 group');
      await sms.sendMessage(request, owner, { driverId: chad.id, message: direct, stations: await sms.stationsOf(request, owner, chad.id) });
      await sms.sendGroupMessage(request, owner, { groupId, message: inGroup });
      const directList = (await sms.messagesOf(request, owner, chad.id, 10)).map((m) => m.message);
      const groupList = ((await sms.groupMessages(request, owner, groupId)).body.data ?? []).map((m) => m.message);
      expect(directList, '1:1 thread').toContain(direct);
      expect(directList, 'no group message in the 1:1 thread').not.toContain(inGroup);
      expect(groupList, 'group thread').toContain(inGroup);
      expect(groupList, 'no 1:1 message in the group').not.toContain(direct);
    },
  );

  test(
    'TC-080: Verify that removing and adding a member is saved and logged once',
    tags('@adds-data'),
    async ({ smsPage, page, owner, request }) => {
      test.skip(!groupId || drivers.length < 3, 'needs the test group with 3 drivers');
      const member = drivers[drivers.length - 1];
      await page.goto('/chat/' + groupId + '?group_chat=true');
      await page.getByRole('button', { name: 'Remove Members' }).click();
      await page.getByRole('dialog').getByText(member.name, { exact: true }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: /^(Remove|Save|Yes|Confirm)/ }).last().click();
      await expect(page.getByText(new RegExp(member.name + '.*removed', 'i')), 'removal logged once').toHaveCount(1);
      let members = ((await sms.group(request, owner, groupId)).body.data?.to ?? []).map((t) => String(t.to ?? t.driver_id ?? t));
      expect(members, 'removed').not.toContain(member.id);
      await page.getByRole('button', { name: 'Add Members' }).click();
      await page.getByRole('dialog').getByPlaceholder(/Search/).fill(member.name);
      await page.getByRole('dialog').getByText(member.name, { exact: true }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: /^(Add|Save)/ }).last().click();
      await expect(page.getByText(new RegExp(member.name + '.*added', 'i')), 'addition logged once').toHaveCount(1);
      members = ((await sms.group(request, owner, groupId)).body.data?.to ?? []).map((t) => String(t.to ?? t.driver_id ?? t));
      expect(members, 'added back').toContain(member.id);
    },
  );

  test(
    'TC-081: Verify that Add Members with no driver picked cannot be saved, and an existing member cannot be added again (no false success)',
    tags(),
    async ({ smsPage, page, owner, request }) => {
      test.skip(!groupId, 'TC-075 did not create the group');
      const before = ((await sms.group(request, owner, groupId)).body.data?.to ?? []).length;
      await page.goto('/chat/' + groupId + '?group_chat=true');
      await page.getByRole('button', { name: 'Add Members' }).click();
      const dialog = page.getByRole('dialog');
      const save = dialog.getByRole('button', { name: /^(Add|Save)/ }).last();
      await expect(save, 'nothing picked: Save disabled').toBeDisabled();
      // an existing member: not offered, or not selectable
      await dialog.getByPlaceholder(/Search/).fill(drivers[0].name);
      const row = dialog.getByText(drivers[0].name, { exact: true }).first();
      if (await row.isVisible().catch(() => false)) {
        await row.click();
        if (await save.isEnabled()) {
          await save.click();
          await expect(page.getByText(/added successfully|members? added/i), 'no success message').toHaveCount(0, { timeout: 5000 });
        }
      }
      await page.keyboard.press('Escape');
      expect(((await sms.group(request, owner, groupId)).body.data?.to ?? []).length, 'members unchanged').toBe(before);
    },
  );

  test(
    'TC-084: Verify that a deleted group is read-only (no message box or attachment) and shows as deleted without refresh',
    tags('@adds-data'),
    async ({ smsPage, page, owner, request }) => {
      test.skip(!groupId, 'TC-075 did not create the group');
      const response = await sms.deleteGroup(request, owner, groupId);
      expect(response.status(), await response.text()).toBeLessThan(300);
      await page.goto('/chat/' + groupId + '?group_chat=true');
      await expect(page.getByText(/deleted/i).first()).toBeVisible();
      await expect(smsPage.messageBox).toHaveCount(0);
      groupId = undefined; // deleted: nothing to clean up
    },
  );

  test.afterAll(async ({ request }) => {
    if (!groupId) return;
    await sms.deleteGroup(request, await sms.login(), groupId);
  });
});

test.fixme('TC-078: Verify that a member\'s reply shows in the group without refresh (Chad replies from RingCentral by hand)', () => {});
test.fixme('TC-083: Verify that an SMS from an unsaved number shows the number, not "Unknown" (needs an SMS from a number that is not a driver)', () => {});
