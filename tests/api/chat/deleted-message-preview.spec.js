const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const chatApi = require('../../../api/chat');

// Deleted Message Preview (sheet "Deleted Message Preview – Test Cases", Chat TC_xx, see docs/chat-deleted-message-coverage.md)
// Chat → "Paya Chat" (the requirement's "DSP Shortcode Chat") and "Individual Chat", on the chat station
// (CHAT_STATION_ID, AQWA on staging) with its test driver (CHAT_DRIVER_NAME, Aksh on staging).
// The station's owner (CHAT_OWNER_EMAIL, Arth on staging) is "Admin A", the admin who deletes.
// The tests send messages to the test driver and delete them again: @adds-data. They share his two
// conversations (one per tab), so they run one after another.
test.describe.configure({ mode: 'default' });

const driverName = process.env.CHAT_DRIVER_NAME || 'Jordan Whitaker';
const youDeleted = 'You deleted this message'; // what the admin who deleted sees
const deletedForOthers = 'This message was deleted'; // what every other viewer sees
const image = {
  name: 'qa-image.jpeg',
  mimeType: 'image/jpeg',
  buffer: fs.readFileSync(
    path.join(__dirname, '../../../test-files/driver-signature.jpeg'),
  ),
};
const textFile = {
  name: 'qa-file.txt',
  mimeType: 'text/plain',
  buffer: Buffer.from('QA automation attachment'),
};

// Messages a test sent and did not delete: deleted after the test, so the conversation ends clean
let leftovers = [];

test.afterEach(async () => {
  for (const { chat, roomId, messageId } of leftovers) {
    await chatApi.deleteMessage(chat, roomId, messageId);
  }
  leftovers = [];
});

// Opens a tab as the chat owner (or the user given) and finds the test driver's conversation in it
async function openDriverChat(request, tab, user) {
  const chat = await chatApi.openChat(
    request,
    user || (await chatApi.loginAsChatOwner()),
    tab,
  );
  const roomId = await chatApi.findRoom(chat, driverName);
  return { chat, roomId };
}

// Sends a text and remembers it for the clean-up
async function send(chat, roomId, text) {
  const messageId = await chatApi.sendText(
    chat,
    roomId,
    text + ' ' + Date.now(),
  );
  leftovers.push({ chat, roomId, messageId });
  return messageId;
}

// Deletes a message, checks that the server accepted it, and forgets it for the clean-up
async function deleteAndCheck(chat, roomId, messageId) {
  const response = await chatApi.deleteMessage(chat, roomId, messageId);
  await addToReport(response);
  expect(response.status(), 'delete message ' + messageId).toBe(200);
  leftovers = leftovers.filter((item) => item.messageId !== messageId);
}

// ---------- The admin who deletes (REQ-01, REQ-04, REQ-05, REQ-06) ----------

test(
  'TC-01: Verify that deleting the latest text in Paya Chat shows "You deleted this message" as the preview (Chat TC_01, TC_17)',
  { tag: ['@smoke', '@regression', '@pr', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'paya');
    await send(chat, roomId, 'Hello');
    const latest = await send(chat, roomId, 'Are you available?');

    await deleteAndCheck(chat, roomId, latest);

    const preview = await chatApi.getPreview(chat, roomId);
    expect(String(preview.id)).toBe(String(latest)); // the deleted message stays the last one
    expect(preview.content).toBe(youDeleted); // not "Hello", the second-last message
    expect(preview.is_deleted).toBe(true);
  },
);

test(
  'TC-02: Verify that deleting the latest text in Individual Chat shows "You deleted this message" as the preview (Chat TC_02)',
  { tag: ['@smoke', '@regression', '@pr', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');
    await send(chat, roomId, 'Hello');
    const latest = await send(chat, roomId, 'Are you available?');

    await deleteAndCheck(chat, roomId, latest);

    const preview = await chatApi.getPreview(chat, roomId);
    expect(String(preview.id)).toBe(String(latest));
    expect(preview.content).toBe(youDeleted);
    expect(preview.is_deleted).toBe(true);
  },
);

test(
  'TC-03: Verify that the conversation shows the same text as the preview, and not the deleted text (Chat TC_07, TC_08, TC_16)',
  { tag: ['@regression', '@pr', '@adds-data'] },
  async ({ request }) => {
    for (const tab of ['paya', 'individual']) {
      const { chat, roomId } = await openDriverChat(request, tab);
      const latest = await send(chat, roomId, 'Secret text QA-7788');

      await deleteAndCheck(chat, roomId, latest);

      const message = await chatApi.getMessage(chat, roomId, latest);
      const preview = await chatApi.getPreview(chat, roomId);
      expect(message.content, tab + ' conversation').toBe(youDeleted);
      expect(preview.content, tab + ' preview').toBe(message.content);
      expect(JSON.stringify(message), tab).not.toContain('QA-7788');
    }
  },
);

test(
  'TC-04: Verify that deleting the latest image in Paya Chat shows "You deleted this message", without the image (Chat TC_09)',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'paya');
    await send(chat, roomId, 'Text before the image');
    const sent = await chatApi.sendFile(chat, roomId, image);

    await deleteAndCheck(chat, roomId, sent.id);

    const preview = await chatApi.getPreview(chat, roomId);
    expect(String(preview.id)).toBe(String(sent.id));
    expect(preview.content).toBe(youDeleted);
    expect(preview.attachments).toBeFalsy(); // the web app would show "image" for an attachment
  },
);

test(
  'TC-05: Verify that deleting the latest file after a text in Individual Chat shows "You deleted this message" (Chat TC_10, TC_20)',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');
    await send(chat, roomId, 'Older text message');
    const sent = await chatApi.sendFile(chat, roomId, textFile);

    await deleteAndCheck(chat, roomId, sent.id);

    const preview = await chatApi.getPreview(chat, roomId);
    expect(preview.content).toBe(youDeleted); // neither the older text nor the file name
    expect(preview.attachments).toBeFalsy();
  },
);

test(
  'TC-06: Verify that a new text after a delete becomes the preview (Chat TC_11)',
  { tag: ['@regression', '@pr', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'paya');
    const latest = await send(chat, roomId, 'To be deleted');
    await deleteAndCheck(chat, roomId, latest);
    expect((await chatApi.getPreview(chat, roomId)).content).toBe(youDeleted);

    const newMessage = await send(chat, roomId, 'New message after the delete');

    const preview = await chatApi.getPreview(chat, roomId);
    expect(String(preview.id)).toBe(String(newMessage));
    expect(preview.content).toContain('New message after the delete');
    expect(preview.is_deleted).toBe(false);
  },
);

test(
  'TC-07: Verify that deleting a message other than the last does not change the preview (Chat TC_13)',
  { tag: ['@regression', '@pr', '@adds-data'] },
  async ({ request }) => {
    for (const tab of ['paya', 'individual']) {
      const { chat, roomId } = await openDriverChat(request, tab);
      await send(chat, roomId, 'First');
      const secondLast = await send(chat, roomId, 'Second-last');
      const last = await send(chat, roomId, 'Last message');

      await deleteAndCheck(chat, roomId, secondLast);

      const preview = await chatApi.getPreview(chat, roomId);
      expect(String(preview.id), tab).toBe(String(last));
      expect(preview.content, tab).toContain('Last message');
      expect(preview.is_deleted, tab).toBe(false);
    }
  },
);

test(
  'TC-08: Verify that deleting the latest messages one after another keeps "You deleted this message" (Chat TC_15)',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');
    await send(chat, roomId, 'Oldest');
    const middle = await send(chat, roomId, 'Middle');
    const latest = await send(chat, roomId, 'Latest');

    await deleteAndCheck(chat, roomId, latest);
    expect((await chatApi.getPreview(chat, roomId)).content).toBe(youDeleted);

    // The most recent message that is not deleted yet
    await deleteAndCheck(chat, roomId, middle);

    const preview = await chatApi.getPreview(chat, roomId);
    expect(preview.content).toBe(youDeleted); // never "Oldest"
  },
);

test(
  'TC-09: Verify that a new attachment after a delete becomes the preview (Chat TC_21)',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'paya');
    const latest = await send(chat, roomId, 'To be deleted');
    await deleteAndCheck(chat, roomId, latest);

    const sent = await chatApi.sendFile(chat, roomId, image);
    leftovers.push({ chat, roomId, messageId: sent.id });

    const preview = await chatApi.getPreview(chat, roomId);
    expect(String(preview.id)).toBe(String(sent.id));
    expect(preview.is_deleted).toBe(false);
    expect(preview.attachments).toHaveLength(1); // the web app shows "image"
  },
);

test(
  'TC-10: Verify that a delete in one conversation does not change the preview of another (Chat TC_22)',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const paya = await openDriverChat(request, 'paya');
    const individual = await openDriverChat(request, 'individual');
    const otherLast = await send(
      individual.chat,
      individual.roomId,
      'Other conversation',
    );
    const latest = await send(paya.chat, paya.roomId, 'To be deleted');

    await deleteAndCheck(paya.chat, paya.roomId, latest);

    const otherPreview = await chatApi.getPreview(
      individual.chat,
      individual.roomId,
    );
    expect(String(otherPreview.id)).toBe(String(otherLast));
    expect(otherPreview.content).toContain('Other conversation');
    expect(otherPreview.is_deleted).toBe(false);
  },
);

test(
  'TC-11: Verify that a deleted image cannot be opened with its link any more (Chat TC_16) (BUG-API-030)',
  { tag: ['@regression', '@knownbug', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'paya');
    const sent = await chatApi.sendFile(chat, roomId, image);

    await deleteAndCheck(chat, roomId, sent.id);

    // The link the driver's phone and the other admins received before the delete
    const file = await request.get(sent.url);
    expect(file.status()).not.toBe(200);
  },
);

// ---------- Wrong delete requests ----------

test(
  'TC-12: Verify that deleting an unknown message returns 404 (BUG-API-029)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');

    const response = await chatApi.deleteMessage(chat, roomId, '999999999');
    await addToReport(response);

    expect(response.status()).toBe(404);
  },
);

test(
  'TC-13: Verify that a message cannot be deleted through another conversation (BUG-API-029)',
  { tag: ['@regression', '@knownbug', '@adds-data'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');
    const messageId = await send(chat, roomId, 'Wrong room check');

    const response = await chatApi.deleteMessage(chat, '1', messageId);
    await addToReport(response);

    expect(response.status()).toBe(404);
    expect((await chatApi.getPreview(chat, roomId)).is_deleted).toBe(false);
  },
);

test(
  'TC-14: Verify that a delete without the message id returns "params missing"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');

    const response = await chatApi.deleteMessage(chat, roomId, undefined);
    await addToReport(response);

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe('params missing');
  },
);

test(
  'TC-15: Verify that a delete without login returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const { chat, roomId } = await openDriverChat(request, 'individual');

    const response = await request.patch(
      chat.url(endpoints.chatDeleteMessage),
      {
        data: { chat_room_id: roomId, id: '1' },
      },
    );
    await addToReport(response);

    expect(response.status()).toBe(401);
  },
);

// ---------- Other admins (REQ-02, REQ-03): need ADMIN_B_* and PROMOTED_ADMIN_* in .env.staging ----------

test.describe('another admin of the station', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- runs only when the extra login is set
  test.skip(
    !process.env.ADMIN_B_EMAIL,
    'Needs a second admin of the test station: ADMIN_B_EMAIL and ADMIN_B_PASSWORD',
  );

  test(
    'TC-16: Verify that another admin sees "This message was deleted" as the preview and in the conversation (Chat TC_03, TC_07, TC_16, TC_17)',
    { tag: ['@regression', '@pr', '@adds-data'] },
    async ({ request }) => {
      const owner = await openDriverChat(request, 'paya');
      const adminB = await chatApi.loginToChatStation('ADMIN_B');
      const other = await openDriverChat(request, 'paya', adminB);
      await send(owner.chat, owner.roomId, 'Hello');
      const latest = await send(
        owner.chat,
        owner.roomId,
        'Are you available? QA-5566',
      );

      await deleteAndCheck(owner.chat, owner.roomId, latest);

      const preview = await chatApi.getPreview(other.chat, other.roomId);
      const message = await chatApi.getMessage(
        other.chat,
        other.roomId,
        latest,
      );
      expect(preview.content).toBe(deletedForOthers); // not "Hello"
      expect(message.content).toBe(deletedForOthers);
      expect(JSON.stringify(message)).not.toContain('QA-5566');
    },
  );

  test(
    'TC-17: Verify that another admin sees "This message was deleted" for a deleted image (Chat TC_09)',
    { tag: ['@regression', '@adds-data'] },
    async ({ request }) => {
      const owner = await openDriverChat(request, 'paya');
      const adminB = await chatApi.loginToChatStation('ADMIN_B');
      const other = await openDriverChat(request, 'paya', adminB);
      await send(owner.chat, owner.roomId, 'Text before the image');
      const sent = await chatApi.sendFile(owner.chat, owner.roomId, image);

      await deleteAndCheck(owner.chat, owner.roomId, sent.id);

      const preview = await chatApi.getPreview(other.chat, other.roomId);
      expect(preview.content).toBe(deletedForOthers);
      expect(preview.attachments).toBeFalsy();
    },
  );
});

test.describe('a promoted admin of the station', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- runs only when the extra login is set
  test.skip(
    !process.env.PROMOTED_ADMIN_EMAIL,
    'Needs a promoted admin of the test station: PROMOTED_ADMIN_EMAIL and PROMOTED_ADMIN_PASSWORD',
  );

  test(
    'TC-18: Verify that a promoted admin who deletes sees "You deleted this message", and the owner "This message was deleted" (Chat TC_05)',
    { tag: ['@regression', '@pr', '@adds-data'] },
    async ({ request }) => {
      const promotedLogin = await chatApi.loginToChatStation('PROMOTED_ADMIN');
      const promoted = await openDriverChat(request, 'paya', promotedLogin);
      const owner = await openDriverChat(request, 'paya');
      await send(promoted.chat, promoted.roomId, 'Hello');
      const latest = await send(
        promoted.chat,
        promoted.roomId,
        'Are you available?',
      );

      await deleteAndCheck(promoted.chat, promoted.roomId, latest);

      const promotedPreview = await chatApi.getPreview(
        promoted.chat,
        promoted.roomId,
      );
      const promotedMessage = await chatApi.getMessage(
        promoted.chat,
        promoted.roomId,
        latest,
      );
      expect(promotedPreview.content).toBe(youDeleted);
      expect(promotedMessage.content).toBe(youDeleted);

      const ownerPreview = await chatApi.getPreview(owner.chat, owner.roomId);
      const ownerMessage = await chatApi.getMessage(
        owner.chat,
        owner.roomId,
        latest,
      );
      expect(ownerPreview.content).toBe(deletedForOthers);
      expect(ownerMessage.content).toBe(deletedForOthers);
    },
  );

  test(
    'TC-19: Verify that the promoted admin sees "This message was deleted" when the owner deletes (Chat TC_03)',
    { tag: ['@regression', '@adds-data'] },
    async ({ request }) => {
      const owner = await openDriverChat(request, 'paya');
      const promotedLogin = await chatApi.loginToChatStation('PROMOTED_ADMIN');
      const promoted = await openDriverChat(request, 'paya', promotedLogin);
      await send(owner.chat, owner.roomId, 'Hello');
      const latest = await send(owner.chat, owner.roomId, 'Are you available?');

      await deleteAndCheck(owner.chat, owner.roomId, latest);

      const preview = await chatApi.getPreview(promoted.chat, promoted.roomId);
      const message = await chatApi.getMessage(
        promoted.chat,
        promoted.roomId,
        latest,
      );
      expect(preview.content).toBe(deletedForOthers);
      expect(message.content).toBe(deletedForOthers);
    },
  );
});
