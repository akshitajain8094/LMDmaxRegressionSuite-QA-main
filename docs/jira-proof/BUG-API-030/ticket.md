# Chat: a deleted image or file can still be opened with its link (privacy)

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Chat → Paya Chat / Individual Chat → an image or a file → Delete |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-03 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-API-030 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** after an admin deletes an image or a file "for everyone", the conversation and the preview
correctly show "You deleted this message". But the file itself stays online: its link still opens it,
without any login.

**Before you start:** the test login; the test driver Jordan Whitaker.

**Steps to replicate**

1. Open **Chat → Paya Chat → Jordan Whitaker** and send an image (paper clip).
2. Right-click the image → **Copy image address** (or take the link from DevTools → Network).
3. Delete the image: hover it → red trash icon → **Delete**.
4. Open the copied link in a private browser window.

**Expected result:** the file is gone (403 or 404), as the requirement says the deleted content must not
be shown to anybody (sheet case TC_16).

**Actual result:** the image opens (200). The same for a text file.

**Question for the developers:** is the file kept on purpose (for example for legal records)? If yes,
the link should at least need a login or expire.

**Business impact:** a manager who deletes a photo sent by mistake (for example a document with personal
data) thinks it is gone, but everybody who received the link (the driver's phone, other admins,
notifications) can still open and share it.

**Technical details (for developers)**

- Upload: `PUT /lmd/twms/chatroom/v3/file` → `url: https://d2jilumhwuwrmw.cloudfront.net/chat/files/raw/<id>/source.jpg`.
- After `PATCH /lmd/twms/chat/v1/delete_message` (200), `GET` of that `url` → 200 `image/jpeg` (no login).
- The delete answer itself also still contains the original `content` of the message (only the admin
  who deleted gets this answer).
