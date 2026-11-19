# Deleted Message Preview — test coverage

This page shows how the 24 cases of the sheet **"Deleted Message Preview – Test Cases"** (TC_01 to TC_24,
requirements REQ-01 to REQ-06) are covered. It is written for QA. The web app parts are automated; the
**driver app** parts are checked by hand with the checklist at the end of this page.

## Words used

| Sheet                 | Web app                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| DSP Shortcode Chat    | **Chat → Paya Chat** (`/in-app-chat/company/all`): the station's shared chat, sent as "PAYa Chat" |
| Individual Chat       | **Chat → Individual Chat** (`/in-app-chat/individual/all`): the admin's own conversations         |
| Owner Admin / Admin A | The owner of the chat station AQWA (578): `CHAT_OWNER_EMAIL` (arth@yopmail.com)                   |
| Admin B               | A second admin of AQWA: `ADMIN_B_EMAIL` (gyani@yopmail.com)                                       |
| Promoted Admin        | A driver promoted to admin on AQWA: `PROMOTED_ADMIN_EMAIL` (koala11@yopmail.com)                  |
| The driver            | The AQWA driver **Aksh** (`CHAT_DRIVER_NAME`; has LMD Drive access, one conversation per tab)     |
| Delete                | Hover a message → red trash icon → "Delete Message – Are you sure…for everyone?" → **Delete**     |

The texts: the admin who deleted sees **"You deleted this message"**; everybody else sees **"This message
was deleted"**, both in the chat list (the preview) and in the conversation.

## Where the tests are

| File                                             | What it checks                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `tests/api/chat/deleted-message-preview.spec.js` | The server: what each viewer gets as the preview and in the conversation (19 tests)  |
| `tests/ui/chat-deleted-message.spec.js`          | The screen: delete with the mouse, then the chat list and the conversation (6 tests) |
| `api/chat.js`, `pages/InAppChatPage.js`          | The helpers: open a tab, find the driver's conversation, send, upload, delete, read  |

Run them with `npx playwright test --project=ui-chat` (runs the API file first, then the UI file). They
are tagged `@adds-data`: they send messages to the chat driver and delete them again, so `npm test` skips
them. Both files change the same two conversations, so `playwright.config.js` never runs them at the same
time (projects `api-chat` and `ui-chat`).

**The chat station.** The chat tests run on their own station, set by `CHAT_STATION_ID`, `CHAT_STATION_CODE`,
`CHAT_OWNER_*` and `CHAT_DRIVER_NAME` in `.env.staging` (AQWA, Arth, Aksh), because the second admin and
the promoted admin are on AQWA, not on the test station DYY1. Without `CHAT_*` the tests use the test user
on the test station. **Two-admin tests** (API TC-16 to TC-19, UI TC-06) also need `ADMIN_B_*` and
`PROMOTED_ADMIN_*`; without them they are skipped. Last run (2026-11-03, AQWA): API 16 passed and 3 known
bugs; UI 5 passed and TC-06 failed on BUG-UI-008.

## Summary

| Status         | Cases | Meaning                                                                                      |
| -------------- | ----- | -------------------------------------------------------------------------------------------- |
| **Automated**  | 10    | Every viewer of the case is checked by a test                                                |
| **Partly**     | 8     | The admins are automated; the driver's view is in the driver-app checklist                   |
| **Manual**     | 4     | Needs the driver app (the driver sends a message), or data a test cannot make again each run |
| **To confirm** | 2     | The sheet expects another admin in an Individual Chat; today only its members see it         |
| **Total**      | 24    |                                                                                              |

**Bugs found:**

| Bug                                   | What                                                                               | Cases               |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------------------- |
| [BUG-UI-008](known-bugs/ui-bugs.md)   | Admin B sees "You deleted this message" in the conversation (the preview is right) | TC_03, TC_07, TC_17 |
| [BUG-API-030](known-bugs/api-bugs.md) | A deleted image or file still opens with its link, without login                   | TC_16               |
| [BUG-API-029](known-bugs/api-bugs.md) | Deleting an unknown message, or through another conversation, gives a 500          | —                   |

What works today (for the admin who deletes, both tabs): the preview shows "You deleted this message"
and never falls back to the second-last message, also after a reload; images and files behave the same;
a new message replaces it; deleting an older message does not change the preview; several deletes in a row
keep it; other conversations are not changed; the deleted text is no longer in the conversation.

## Cases

API = `tests/api/chat/deleted-message-preview.spec.js`, UI = `tests/ui/chat-deleted-message.spec.js`.

| Case  | Req.   | What                                                         | Status     | Tests                              | Not automated                                  |
| ----- | ------ | ------------------------------------------------------------ | ---------- | ---------------------------------- | ---------------------------------------------- |
| TC_01 | REQ-01 | Paya Chat: the deleting admin's preview                      | Automated  | API TC-01 · UI TC-01               |                                                |
| TC_02 | REQ-01 | Individual Chat: the deleting admin's preview                | Automated  | API TC-02 · UI TC-02               |                                                |
| TC_03 | REQ-02 | Paya Chat: the promoted admin sees "was deleted"             | Automated  | API TC-16, TC-19 · UI TC-06        | BUG-UI-008 (UI TC-06)                          |
| TC_04 | REQ-02 | Paya Chat: the driver sees "was deleted"                     | Manual     | —                                  | Driver app: checklist D1                       |
| TC_05 | REQ-02 | Paya Chat: the promoted admin deletes                        | Automated  | API TC-18                          |                                                |
| TC_06 | REQ-02 | Individual Chat: the owner deletes, the promoted admin looks | To confirm | —                                  | See "To confirm" below                         |
| TC_07 | REQ-03 | Paya Chat: preview = conversation for every viewer           | Partly     | API TC-03, TC-16 · UI TC-01, TC-06 | Driver: D1. BUG-UI-008                         |
| TC_08 | REQ-03 | Individual Chat: preview = conversation for every viewer     | Partly     | API TC-03 · UI TC-02               | Admin B: to confirm. Driver: D2                |
| TC_09 | REQ-04 | Paya Chat: deleted image, every viewer                       | Partly     | API TC-04, TC-17 · UI TC-04        | Driver: D3                                     |
| TC_10 | REQ-04 | Individual Chat: deleted file, every viewer                  | Partly     | API TC-05                          | Admin B: to confirm. Driver: D3                |
| TC_11 | REQ-05 | Paya Chat: a new text after the delete                       | Automated  | API TC-06 · UI TC-05               |                                                |
| TC_12 | REQ-05 | Individual Chat: the driver sends after the delete           | Manual     | —                                  | Driver app: D4                                 |
| TC_13 | REQ-06 | Deleting an older message keeps the preview                  | Partly     | API TC-07 (both tabs)              | Other admin and driver: D5                     |
| TC_14 | REQ-01 | The only message of a conversation is deleted                | Manual     | —                                  | Needs a driver nobody has chatted with yet: M1 |
| TC_15 | REQ-01 | Several latest messages deleted in a row                     | Automated  | API TC-08                          |                                                |
| TC_16 | REQ-02 | The deleted text is not shown to others                      | Partly     | API TC-03, TC-11, TC-16            | Driver: D1. BUG-API-030 (file link)            |
| TC_17 | REQ-01 | No fall back to "Hello"                                      | Partly     | API TC-01, TC-16 · UI TC-01        | Driver: D1                                     |
| TC_18 | REQ-03 | Leave and reopen the chat                                    | Automated  | UI TC-03                           |                                                |
| TC_19 | REQ-03 | Refresh the web app, relaunch the driver app                 | Partly     | UI TC-03                           | Driver app relaunch: D6                        |
| TC_20 | REQ-04 | Deleted attachment after an older text                       | Automated  | API TC-05 · UI TC-04               |                                                |
| TC_21 | REQ-05 | A new attachment after the delete                            | Automated  | API TC-09                          |                                                |
| TC_22 | REQ-01 | Another conversation is not changed                          | Automated  | API TC-10                          |                                                |
| TC_23 | REQ-02 | Individual Chat: the promoted admin deletes                  | To confirm | —                                  | See "To confirm" below. Driver: D2             |
| TC_24 | REQ-05 | The driver sends right after the delete                      | Manual     | —                                  | Driver app: D4                                 |

**To confirm (TC_06, TC_23 and the Admin B part of TC_08, TC_10):** an Individual Chat belongs to one
admin. Its members are that admin and the driver; another admin is not a member and does not see it (the
API lists only the admin's own Individual conversations). Please ask the BA whether these cases mean a
**group** in Individual Chat with two admins and the driver. If yes, the tests can create such a group.

**Also not automated: M1 (TC_14).** In the Paya Chat a conversation with a driver exists only once, and
the chat driver's already has many messages. Check by hand with a driver nobody has chatted with: send one
message, delete it, check that the row says "You deleted this message" and that the conversation still
opens and shows the same text.

## Driver app checklist (by hand)

**Before you start:** log in to the driver app as a test driver who can receive in-app chats (for example
Aksh on AQWA, or ask for a driver login). Keep the web app open as the admin on the same station.
Use texts you can recognise, for example "Hello QA" (older) and "Are you available QA?" (latest).

| #   | Cases                      | In the web app (admin)                                                                     | In the driver app, check                                                                                                                                                                                                                                             |
| --- | -------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | TC_04, TC_07, TC_16, TC_17 | Paya Chat → the driver → send "Hello QA", then "Are you available QA?" → delete the latest | **Chat list:** the row shows "This message was deleted", **not** "Hello QA" and **not** "You deleted this message". **Conversation:** "This message was deleted" where the message was; "Are you available QA?" is nowhere (also not in a notification you open now) |
| D2  | TC_08, TC_23               | The same in **Individual Chat** (owner, then promoted admin)                               | The same checks for the Individual conversation: "This message was deleted" in the row and the conversation                                                                                                                                                          |
| D3  | TC_09, TC_10               | Send an image (Paya) and a file (Individual), delete each                                  | Row and conversation: "This message was deleted"; no thumbnail, no file name, not "image"; tapping the place does not open the file                                                                                                                                  |
| D4  | TC_12, TC_24               | Delete the latest message                                                                  | Send a reply from the driver app **right after**. In the web app: the row shows the driver's new message, not "You deleted this message"; in the conversation the deleted message still shows "You deleted this message" in its place and the order is right         |
| D5  | TC_13                      | Send 3 messages, delete the **middle** one                                                 | The row still shows the last message; "This message was deleted" is only in the conversation, in the middle                                                                                                                                                          |
| D6  | TC_19                      | Delete the latest message                                                                  | Close the driver app completely and open it again: the row and the conversation still say "This message was deleted"                                                                                                                                                 |
| D7  | (extra)                    | Delete a message while the driver app is open on that conversation                         | The bubble changes to "This message was deleted" without leaving the screen (or after pull-to-refresh: note which)                                                                                                                                                   |
| D8  | (extra)                    | Delete the latest message while the driver app is closed                                   | The push notification that arrived before the delete: does it still show the text when opened? Note it for the BA                                                                                                                                                    |

Write the result of each line (OK, or what you saw, with a screenshot) in the "Actual Result" column of
the sheet.
