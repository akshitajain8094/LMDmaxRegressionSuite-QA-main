# Chat – Deleted Message Preview: 3 bugs (evidence)

Captured on **2026-11-03, 16:41 IST (11:11 UTC)** on **staging**, station **AQWA (578)**, driver **Aksh**.
Every request and full response is in `chat-bugs-evidence.json` (login tokens removed).

| User                   | Email             | user_id | Role  |
| ---------------------- | ----------------- | ------- | ----- |
| Arth (Admin A, owner)  | arth@yopmail.com  | 13832   | owner |
| gyani (Admin B)        | gyani@yopmail.com | 19615   | admin |
| Aksh (driver)          | –                 | 34257   | driver (driver_id 38598) |

Server: `https://staging-messaging.fleet.lmdmax.com`. Paya Chat room with Aksh: **5136**. Individual Chat room (Arth – Aksh): **5195**.

| Bug | Where | Severity | Summary |
| --- | ----- | -------- | ------- |
| BUG-UI-008 | Web app (front end) | High | Another admin is told "You deleted this message" for a message they did not delete |
| BUG-API-030 | Chat file storage | High | A deleted image can still be downloaded from its link, without login |
| BUG-API-029 | `delete_message` API | Low | Wrong delete requests return 500 instead of 404 |

---

## 1. BUG-UI-008 – Admin B sees "You deleted this message"

**Steps:** Arth sends two messages to Aksh in Paya Chat and deletes the latest (message **101996**). gyani
opens Paya Chat → Aksh.

**Expected:** gyani sees "This message was deleted" in the chat-list row **and** in the conversation.
**Actual:** the row says "This message was deleted", the conversation says **"You deleted this message"**.
Screenshot: `BUG-UI-008-gyani-conversation.png` ("Welcome gyani", row vs conversation).

**The server is right; the screen is wrong.** What the server sends for message 101996:

| Field (get_messages/5136) | To gyani (19615)             | To Arth (13832)              |
| ------------------------- | ---------------------------- | ---------------------------- |
| `content`                 | **"This message was deleted"** | "You deleted this message"   |
| `deleted_by`              | "13832"                      | "13832"                      |
| `authority`               | **"mine"**                   | "mine"                       |
| `is_deleted`              | true                         | true                         |
| Preview (`single_chat_head/5136` → `last_message.content`) | "This message was deleted" | "You deleted this message" |

**Likely cause:** in Paya Chat every admin's messages are sent as the station ("PAYA8 Chat", sender 13833),
so `authority` is `"mine"` for **every** admin. The conversation screen seems to choose the text from
`authority` instead of using `content` (or comparing `deleted_by` with the logged-in user).
**Suggested fix:** show `content` as sent by the server, or show "You deleted…" only when
`deleted_by === current user_id`.

Requests:

```
PATCH /lmd/twms/company-chat/578/chat/v1/delete_message   (Arth)
{"chat_room_id":"5136","id":"101996"}
→ 200 {"success":true,"message":"Message updated successfully","data":{"id":"101996","deleted_by":"13832",...}}

GET /lmd/twms/company-chat/578/chathead/v3/get_messages/5136?offset=0&limit=20   (gyani)
→ 200 … {"id":"101996","is_deleted":true,"deleted_by":"13832","authority":"mine","content":"This message was deleted",…}
```

Automated test: `tests/ui/chat-deleted-message.spec.js` TC-06 →
`Expected "This message was deleted", Received "You deleted this message 4:42 PM"`.

---

## 2. BUG-API-030 – A deleted image is still public

**Steps (all 200):** upload an image → send it to Aksh (message **101997**) → delete the message → open
the image link **without login**.

| # | Time (UTC) | Call | Result |
| - | ---------- | ---- | ------ |
| 1 | 11:11:34.354 | `PUT /lmd/twms/chatroom/v3/file` (qa-evidence-image.jpeg, 8986 bytes) | 200 "file uploaded successfully" |
| 2 | 11:11:34.749 | `POST /lmd/twms/company-chat/578/chat/v1/send_message` | 200, id 101997 |
| 3 | 11:11:35.110 | `GET <link>` before the delete, no login | 200, image/jpeg, 8986 bytes |
| 4 | 11:11:35.917 | `PATCH …/delete_message {"chat_room_id":"5136","id":"101997"}` | 200, deleted_by 13832, **answer still contains the attachment link** |
| 5 | 11:11:41.271 | `GET <link>` 5 s after the delete, no login | **200, image/jpeg, 8986 bytes, the same file** |

Link: `https://d2jilumhwuwrmw.cloudfront.net/chat/files/raw/f275d83b-14d2-4002-b8b8-29d09067876f/source.jpg`

**Expected:** after "Delete for everyone" the file can no longer be opened (403/404), and the delete answer
has no attachment.
**Actual:** the file is still served to anyone with the link. Step 5's response header is
`x-cache: Miss from cloudfront`, so it came from the storage itself, not from a CDN cache: **the file is
never removed.** The driver's phone and the other admins already received this link.

**Suggested fix:** on delete, remove (or make private) the stored file and invalidate its CloudFront path;
or serve chat files through signed, expiring URLs. Do not return `attachments` for deleted messages.

Automated test: `tests/api/chat/deleted-message-preview.spec.js` TC-11 → `Expected: not 200, Received: 200`.

---

## 3. BUG-API-029 – `delete_message` returns 500 for wrong requests

Endpoint: `PATCH /lmd/twms/chat/v1/delete_message` (Individual Chat), room **5195**, message **101998**.

| # | Time (UTC) | Body | Expected | Actual |
| - | ---------- | ---- | -------- | ------ |
| 1 | 11:11:44.031 | `{"chat_room_id":"1","id":"101998"}` (wrong room) | 404 / 403 | **500** "Error in Message updation" |
| 2 | 11:11:45.079 | `{"chat_room_id":"5195","id":"999999999"}` (no such message) | 404 | **500** "Error in Message updation" |
| 3 | 11:11:45.441 | `{"chat_room_id":"5195","id":"101998"}` (correct) | 200 | 200 "Message updated successfully" |
| 4 | 11:11:45.791 | `{"chat_room_id":"5195"}` (id missing) | 400 | 400 "params missing" (correct) |

After request 1 the message was **not** deleted (checked with `get_messages/5195` at 11:11:44.381), so
data is safe; only the error handling is missing. Request 3 shows the same message deletes fine with the
right room.

```
→ 500 {"success":false,"message":"Error in Message updation","data":{},"status":500}
```

**Suggested fix:** look the message up by `id` **and** `chat_room_id` first; if not found return 404
(or 403 if it is in a room the user cannot access).

Automated tests: TC-12 and TC-13 → `Expected: 404, Received: 500`.

---

## Rerun

```
npx playwright test --project=api-chat --grep "TC-1[123]"        # BUG-API-030, BUG-API-029
npx playwright test --project=ui-chat --no-deps --grep "TC-06"   # BUG-UI-008
```
