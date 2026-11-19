# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ..\..\..\..\..\..\..\..\Softsensor\Downloads\LMDmaxRegressionSuite-QA-main\tests\ui\chat-deleted-message.spec.js >> another admin of the station >> TC-06: Verify that another admin sees "This message was deleted" in both the preview and the conversation (Chat TC_03, TC_07) (BUG-UI-008)
- Location: tests\ui\chat-deleted-message.spec.js:178:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#messages_102844')
Expected substring: "This message was deleted"
Received string:    "This message has been deleted 3:32 PM"
Timeout: 15000ms

Call log:
  - Expect "toContainText" locator('#messages_102844') with timeout 15000ms
  - waiting for locator('#messages_102844')
    33 × locator resolved to <div id="messages_102844" class="MuiStack-root css-1nz02wh">…</div>
       - unexpected value "This message has been deleted 3:32 PM"

```

```yaml
- text: This message has been deleted 3:32 PM
```

# Test source

```ts
  108 |     await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
  109 |     await expect(await chatPage.lastMessage()).toContainText(youDeleted);
  110 | 
  111 |     // Reload (refresh the web app)
  112 |     await page.reload();
  113 |     await chatPage.openConversation(driverName);
  114 |     await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
  115 |     await expect(chatPage.chatRow(driverName)).not.toContainText(older);
  116 |     await expect(await chatPage.lastMessage()).toContainText(youDeleted);
  117 |   },
  118 | );
  119 | 
  120 | test(
  121 |   'TC-04: Verify that deleting the latest image shows "You deleted this message", not "image" or the older text (Chat TC_09, TC_20)',
  122 |   { tag: ['@regression', '@adds-data'] },
  123 |   async ({ page, request }) => {
  124 |     const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
  125 |       'Text before the image',
  126 |     ]);
  127 |     const image = await chatApi.sendFile(chat, roomId, {
  128 |       name: 'qa-image.jpeg',
  129 |       mimeType: 'image/jpeg',
  130 |       buffer: fs.readFileSync(
  131 |         path.join(__dirname, '../../test-files/driver-signature.jpeg'),
  132 |       ),
  133 |     });
  134 |     const chatPage = await openChatTab(page, 'paya');
  135 |     await chatPage.openConversation(driverName);
  136 |     await expect(chatPage.chatRow(driverName)).toContainText('image');
  137 | 
  138 |     await chatPage.deleteLastMessage();
  139 | 
  140 |     await expect(await chatPage.lastMessage()).toContainText(youDeleted);
  141 |     await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
  142 |     await expect(chatPage.chatRow(driverName)).not.toContainText('image');
  143 |     await expect(chatPage.chatRow(driverName)).not.toContainText(sent[0]);
  144 |     expect(image.id).toBeTruthy();
  145 |   },
  146 | );
  147 | 
  148 | test(
  149 |   'TC-05: Verify that a new message sent after a delete becomes the preview (Chat TC_11)',
  150 |   { tag: ['@regression', '@adds-data'] },
  151 |   async ({ page, request }) => {
  152 |     const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
  153 |       'To be deleted',
  154 |     ]);
  155 |     const chatPage = await openChatTab(page, 'paya');
  156 |     await chatPage.openConversation(driverName);
  157 |     await chatPage.deleteMessage(sent[0]);
  158 |     await expect(chatPage.chatRow(driverName)).toContainText(youDeleted);
  159 | 
  160 |     const newText = 'New message after the delete ' + Date.now();
  161 |     await chatPage.sendMessage(newText);
  162 | 
  163 |     await expect(chatPage.chatRow(driverName)).toContainText(newText);
  164 |     await expect(chatPage.chatRow(driverName)).not.toContainText(youDeleted);
  165 |     // Clean up the message sent on the screen
  166 |     const preview = await chatApi.getPreview(chat, roomId);
  167 |     leftovers.push({ chat, roomId, messageId: preview.id });
  168 |   },
  169 | );
  170 | 
  171 | test.describe('another admin of the station', () => {
  172 |   // eslint-disable-next-line playwright/no-skipped-test -- runs only when the extra login is set
  173 |   test.skip(
  174 |     !process.env.ADMIN_B_EMAIL,
  175 |     'Needs a second admin of the test station: ADMIN_B_EMAIL and ADMIN_B_PASSWORD',
  176 |   );
  177 | 
  178 |   test(
  179 |     'TC-06: Verify that another admin sees "This message was deleted" in both the preview and the conversation (Chat TC_03, TC_07) (BUG-UI-008)',
  180 |     { tag: ['@regression', '@knownbug', '@adds-data'] },
  181 |     async ({ browser, request }) => {
  182 |       // The owner deletes the latest message through the API
  183 |       const adminB = await chatApi.loginToChatStation('ADMIN_B');
  184 |       expect(adminB.token).toBeTruthy(); // fails with a clear message if ADMIN_B cannot open the test station
  185 |       const { chat, roomId, sent } = await sendThroughApi(request, 'paya', [
  186 |         'Hello',
  187 |         'Are you available?',
  188 |       ]);
  189 |       const latestId = leftovers.at(-1).messageId;
  190 |       await chatApi.deleteMessage(chat, roomId, latestId);
  191 |       leftovers = leftovers.slice(0, -1);
  192 | 
  193 |       // Admin B looks at the same conversation in their own browser
  194 |       const adminBPage = await (await browser.newContext()).newPage();
  195 |       const chatPage = await openChatTab(
  196 |         adminBPage,
  197 |         'paya',
  198 |         process.env.ADMIN_B_EMAIL,
  199 |         process.env.ADMIN_B_PASSWORD,
  200 |       );
  201 |       await chatPage.openConversation(driverName);
  202 | 
  203 |       await expect(chatPage.chatRow(driverName)).toContainText(
  204 |         deletedForOthers,
  205 |       );
  206 |       await expect(chatPage.chatRow(driverName)).not.toContainText(sent[0]);
  207 |       // Today: "You deleted this message", although Admin B did not delete it
> 208 |       await expect(await chatPage.lastMessage()).toContainText(
      |                                                  ^ Error: expect(locator).toContainText(expected) failed
  209 |         deletedForOthers,
  210 |       );
  211 |     },
  212 |   );
  213 | });
  214 | 
```