const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const LoginPage = require('../../pages/LoginPage');
const InAppChatPage = require('../../pages/InAppChatPage');
const chatApi = require('../../api/chat');

// Deleted Message Preview on the screen (sheet "Deleted Message Preview – Test Cases", Chat TC_xx,
// see docs/chat-deleted-message-coverage.md). Chat → "Paya Chat" and "Individual Chat"
// on the chat station (CHAT_STATION_CODE, AQWA on staging), as its owner (CHAT_OWNER_EMAIL), with its test driver
// (CHAT_DRIVER_NAME). The driver needs LMD Drive access (otherwise the chat list shows "User Restricted" instead of
// the preview). The API chat tests use the same conversations: playwright.config.js runs this file after them.
// The messages are sent through the API (faster); the delete and the checks are done on the screen.
// @adds-data: the tests send messages and delete them. They share the driver's conversations, so they run one after another.
test.describe.configure({ mode: 'default' });

const driverName = process.env.CHAT_DRIVER_NAME || 'Jordan Whitaker';
const youDeleted = 'You deleted this message';
const deletedForOthers = 'This message was deleted';

let leftovers = [];

test.afterEach(async () => {
  for (const { chat, roomId, messageId } of leftovers) {
    await chatApi.deleteMessage(chat, roomId, messageId);
  }
  leftovers = [];
});

// Sends texts to the test driver in a tab, as the chat owner; gives the texts as sent (unique per run)
async function sendThroughApi(request, tab, texts) {
  const chat = await chatApi.openChat(
    request,
    await chatApi.loginAsChatOwner(),
    tab,
  );
  const roomId = await chatApi.findRoom(chat, driverName);
  const sent = [];
  for (const text of texts) {
    const unique = text + ' ' + Date.now();
    const messageId = await chatApi.sendText(chat, roomId, unique);
    leftovers.push({ chat, roomId, messageId });
    sent.push(unique);
  }
  return { chat, roomId, sent };
}

// Logs in (as the chat owner, or as the user given), chooses the chat station and opens a chat tab
async function openChatTab(page, tab, email, password) {
  const loginPage = new LoginPage(page);
  await loginPage.open();
  await loginPage.login(
    email || process.env.CHAT_OWNER_EMAIL || process.env.LOGIN_EMAIL,
    password || process.env.CHAT_OWNER_PASSWORD || process.env.LOGIN_PASSWORD,
  );
  await expect(page).toHaveURL(/dashboard|chat/, { timeout: 30000 });
  const chatPage = new InAppChatPage(page);
  await chatPage.selectStation(process.env.CHAT_STATION_CODE || 'DYY1');
  await chatPage.open(tab);
  return chatPage;
}

for (const [tab, tabName, sheetCase] of [
  ['paya', 'Paya Chat', 'Chat TC_01'],
  ['individual', 'Individual Chat', 'Chat TC_02'],
]) {
  test(
    `TC-0${tab === 'paya' ? 1 : 2}: Verify that deleting the latest message in ${tabName} shows "You deleted this message" in the conversation and the preview (${sheetCase})`,
    { tag: ['@smoke', '@regression', '@pr', '@adds-data'] },
    async ({ page, request }) => {
      const { sent } = await sendThroughApi(request, tab, [
        'Hello',
        'Are you available?',
      ]);
      const [older, latest] = sent;
      const chatPage = await openChatTab(page, tab);
      await chatPage.openConversation(driverName);
      await expect(chatPage.message(latest)).toBeVisible();

      await chatPage.deleteMessage(latest);

      await expect(await chatPage.lastMessage()).toContainText(youDeleted);
      await expect(chatPage.message(latest)).toHaveCount(0);
      await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
      await expect(chatPage.chatRow(driverName)).not.toContainText(older);
    },
  );
}

test(
  'TC-03: Verify that the preview still says "You deleted this message" after leaving the chat and after a reload (Chat TC_18, TC_19)',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    const { sent } = await sendThroughApi(request, 'paya', [
      'Hello',
      'Are you available?',
    ]);
    const [older, latest] = sent;
    const chatPage = await openChatTab(page, 'paya');
    await chatPage.openConversation(driverName);
    await chatPage.deleteMessage(latest);
    await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);

    // Another screen, then back to the chat
    await page.goto('/v2/dashboard/daily-highlights');
    await chatPage.open('paya');
    await chatPage.openConversation(driverName);
    await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
    await expect(await chatPage.lastMessage()).toContainText(youDeleted);

    // Reload (refresh the web app)
    await page.reload();
    await chatPage.openConversation(driverName);
    await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
    await expect(chatPage.chatRow(driverName)).not.toContainText(older);
    await expect(await chatPage.lastMessage()).toContainText(youDeleted);
  },
);

test(
  'TC-04: Verify that deleting the latest image shows "You deleted this message", not "image" or the older text (Chat TC_09, TC_20)',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
      'Text before the image',
    ]);
    const image = await chatApi.sendFile(chat, roomId, {
      name: 'qa-image.jpeg',
      mimeType: 'image/jpeg',
      buffer: fs.readFileSync(
        path.join(__dirname, '../../test-files/driver-signature.jpeg'),
      ),
    });
    const chatPage = await openChatTab(page, 'paya');
    await chatPage.openConversation(driverName);
    await expect(chatPage.chatRow(driverName)).toContainText('image');

    await chatPage.deleteLastMessage();

    await expect(await chatPage.lastMessage()).toContainText(youDeleted);
    await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
    await expect(chatPage.chatRow(driverName)).not.toContainText('image');
    await expect(chatPage.chatRow(driverName)).not.toContainText(sent[0]);
    expect(image.id).toBeTruthy();
  },
);

test(
  'TC-05: Verify that a new message sent after a delete becomes the preview (Chat TC_11)',
  { tag: ['@regression', '@adds-data'] },
  async ({ page, request }) => {
    const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
      'To be deleted',
    ]);
    const chatPage = await openChatTab(page, 'paya');
    await chatPage.openConversation(driverName);
    await chatPage.deleteMessage(sent[0]);
    await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);

    const newText = 'New message after the delete ' + Date.now();
    await chatPage.sendMessage(newText);

    await expect(chatPage.chatRow(driverName)).toContainText(newText);
    await expect(chatPage.chatRow(driverName)).not.toContainText(youDeleted);
    // Clean up the message sent on the screen
    const preview = await chatApi.getPreview(chat, roomId);
    leftovers.push({ chat, roomId, messageId: preview.id });
  },
);

test.describe('another admin of the station', () => {
  // eslint-disable-next-line playwright/no-skipped-test -- runs only when the extra login is set
  test.skip(
    !process.env.ADMIN_B_EMAIL,
    'Needs a second admin of the test station: ADMIN_B_EMAIL and ADMIN_B_PASSWORD',
  );

  test(
    'TC-06: Verify that another admin sees "This message was deleted" in both the preview and the conversation (Chat TC_03, TC_07) (BUG-UI-008)',
    { tag: ['@regression', '@knownbug', '@adds-data'] },
    async ({ browser, request }) => {
      // The owner deletes the latest message through the API
      const adminB = await chatApi.loginToChatStation('ADMIN_B');
      expect(adminB.token).toBeTruthy(); // fails with a clear message if ADMIN_B cannot open the test station
      const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
        'Hello',
        'Are you available?',
      ]);
      const latestId = leftovers.at(-1).messageId;
      await chatApi.deleteMessage(chat, roomId, latestId);
      leftovers = leftovers.slice(0, -1);

      // Admin B looks at the same conversation in their own browser
      const adminBPage = await (await browser.newContext()).newPage();
      const chatPage = await openChatTab(
        adminBPage,
        'paya',
        process.env.ADMIN_B_EMAIL,
        process.env.ADMIN_B_PASSWORD,
      );
      await chatPage.openConversation(driverName);

      await expect(chatPage.chatRow(driverName)).toContainText(
        deletedForOthers,
      );
      await expect(chatPage.chatRow(driverName)).not.toContainText(sent[0]);
      // Today: "You deleted this message", although Admin B did not delete it
      await expect(await chatPage.lastMessage()).toContainText(
        deletedForOthers,
      );
    },
  );
});
