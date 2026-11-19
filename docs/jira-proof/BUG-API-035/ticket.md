# Announcements: attachments can be downloaded by anyone with the link, without login

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Announcements → an announcement → Attachments → Download |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-04 (staging, station DYY6) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-035 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** the Download link on the details page is the file's public storage address
(`https://d2jilumhwuwrmw.cloudfront.net/announcement/staging/477//<name>.pdf`). It opens without any login.
The server's own download address (`/announcements/v1/<id>/attachments/<id>/download`) is protected
correctly (401 without login, 404 for another station), but the web app does not use it.

**Steps to replicate**

1. Open **Announcements** → an announcement with an attachment.
2. Right-click **Download** → Copy link address.
3. Open the link in a private browser window.

**Expected result:** access is denied (sheet ANN-117: "the file does not download and access is denied").

**Actual result:** the file downloads (200).

**Business impact:** announcements can hold internal documents (policies, safety notices with names).
Anybody who gets the link (a forwarded message, a former driver) can open it for ever. The address also
shows the station id and the file name, so other files are easy to guess. Same kind of problem as
BUG-API-030 (chat files).

**Technical details (for developers)**

- `GET /announcements/v1/<id>/overview` → `attachments[].url` = public CloudFront address → `GET` without
  headers → 200.
- `GET /announcements/v1/<id>/attachments/<att>/download` without login → 401; as a user of another
  station → 404 (correct).
- Suggested fix: serve files only through the download address, or use signed URLs that expire.
