# Announcements: the server accepts a title longer than 100 characters

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Low |
| Screen | Announcements → Create announcement / Edit announcement |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-04 (staging, station DYY6) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-032 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** the create page blocks a title of more than 100 characters, but the server itself does not:
a title of 101 characters is sent to the drivers (create) and saved (edit). The server does check the
description (10,000 characters), so only the title check is missing.

**Before you start:** the owner Arth on DYY6; the test driver Chad Elnahal.

**Steps to replicate**

1. Send `POST /lmd/prfsrv/announcements/v1/create` with a title of 101 characters, to Chad only (see
   Technical details).

**Expected result:** 400 "Title cannot exceed 100 characters", as for the description.

**Actual result:** 200 "Announcement sent to 1 driver". The same for `PATCH /update/<id>`.

**Business impact:** any other client (the driver app, a script, an old web app) can save titles the
screens are not made for, which can break the card and the driver app layout.

**Technical details (for developers)**

- `POST /lmd/prfsrv/announcements/v1/create` with `{ "title": "<101 characters>", "description": "QA",
"audience_type": "selected", "user_ids": ["13848"], "comment_mode": "everyone",
"acknowledgement_enabled": false, "attachment_ids": [], "request_id": "<uuid>" }` → 200.
- A description of 10,001 characters → 400 "Description can not exceed 10000 characters" (correct).
- The web app's rule: `title.length > 100` → "Title cannot exceed 100 characters." (create page).
