# Chat: deleting an unknown message, or through another conversation, gives a server error (500)

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Low |
| Screen | Chat → Paya Chat / Individual Chat → hover a message → Delete |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-03 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-029 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** the web app only offers Delete on real messages, so the screen is fine. But when the server
gets a delete for a message that does not exist, or for a message of another conversation, it answers
with a server error "Error in Message updation" instead of "not found".

**Before you start:** the test login; the test driver Jordan Whitaker.

**Steps to replicate**

Through the server (the bug, see Technical details):

1. Delete the message `999999999` in Jordan Whitaker's Individual Chat.
2. Or send a message to Jordan Whitaker and delete it through the conversation `1`.

**Expected result:** 404 "message not found". The message of the other conversation is not changed.

**Actual result:** 500 `"Error in Message updation"`. (The message is not deleted, which is correct.)

**Business impact:** a 500 looks like a breakdown in the server logs and alerts, so real problems are
harder to see. Another app (for example the driver app) cannot tell "already gone" from "server down".

**Technical details (for developers)**

- `PATCH https://staging-messaging.fleet.lmdmax.com/lmd/twms/chat/v1/delete_message` with
  `{ "chat_room_id": "5191", "id": "999999999" }` → 500 `{ "success": false, "message": "Error in Message updation" }`.
- The same with a real message id and `"chat_room_id": "1"`.
- Without `id` → 400 `"params missing"` (correct). Without login → 401 (correct).
- Deleting an already deleted message again → 200 `"Message updated successfully"` (could be 404 or 409).
