# Announcements — Jira ticket drafts

Ticket texts to copy into Jira, written 2026-11-04 (see
[announcements-bug-repro-progress.md](announcements-bug-repro-progress.md)). After logging, write the Jira
key next to the title.

---

## BUG-API-035 — Jira key: \_\_\_\_

**Issue type:** Bug
**Summary:** Announcements: attachment Download link is a public CloudFront URL that opens without login
**Priority:** High | **Severity:** High
**Component:** Announcements (web app, API) | **Labels:** security, announcements, attachments
**Environment:** Staging, https://staging.performance.lmdmax.com, station DYY6 (477), Chrome
**Found by / date:** QA, 2026-11-04 | **Test case:** ANN-117

**Description**

The Download link of an announcement attachment is the file's permanent public storage address, for
example `https://d2jilumhwuwrmw.cloudfront.net/announcement/staging/477//qa-sample.pdf`. This link opens in
a browser with no login: anyone who has the link can download the file, for as long as the file exists.

The API's own download endpoint `GET /lmd/prfsrv/announcements/v1/<id>/attachments/<att>/download` is
protected correctly (401 without login, 404 for a user of another station), but the web app does not use
it; it uses `attachments[].url` from `GET /announcements/v1/<id>/overview`.

This is not about soft delete: the announcement in the steps below is not deleted, and its file still opens
without login.

**Steps to reproduce**

1. Log in as the DYY6 owner, select station DYY6.
2. Announcements → Create announcement. Title, description, attach a PDF, Selected drivers → one driver,
   Review & send → Send announcement.
3. Open the announcement (View details).
4. In Attachments, right-click Download → Copy link address.
5. Open a private (Incognito) window, where no one is logged in, and open the link.

**Expected result:** access is denied (401/403 or redirect to login), as ANN-117 expects: "the file does
not download and access is denied".

**Actual result:** the PDF opens / downloads (200) with no login. The link also shows the station id (477)
and the original file name.

**Business impact**

- Announcements can carry internal documents (policies, safety notices, documents with names).
- Anyone who gets a link (a forwarded message, a former driver, a screenshot of the address) can open the
  file for ever.
- The address follows a pattern (station id + file name), so other files are easier to guess.
- Same kind of problem as chat files (BUG-API-030).

**Suggested fix**

1. Serve files only through the protected endpoint `/announcements/v1/<id>/attachments/<att>/download`,
   which returns the file or a short-lived signed URL (for example 5 minutes).
2. Stop returning the permanent CloudFront `url` in the overview response.
3. Make the S3 bucket private (reachable only through CloudFront) and make CloudFront require signed URLs
   or signed cookies, so old shared links stop working.
4. For soft-deleted announcements, the download endpoint returns 404 and issues no new links.
5. Optional: store files under random names (`announcement/<uuid>`), not station id + original file name.

**Acceptance criteria**

- An old CloudFront link opened without login gives 403 (or a login page).
- The Download button still works for the logged-in admin, and in the driver app for the driver.
- A new Download link copied into a private window stops working after it expires.
- A user of another station gets 404.
- After the announcement is deleted, its file cannot be downloaded.
- `npx playwright test --grep "BUG-API-035"` passes.

**Attachments:** screenshot of the Download link on the details page; screenshot of the Incognito window
with the PDF open and the CloudFront address visible; screenshot of the same Incognito window showing the
login page for /announcements.

**Links:** related to BUG-API-030 (chat files public). QA reference: `docs/known-bugs/api-bugs.md`
BUG-API-035.

---

## BUG-API-034 — Jira key: \_\_\_\_

**Issue type:** Bug
**Summary:** Announcements: a broken (corrupt) PDF is accepted as an attachment
**Priority:** P3 (Low) | **Severity:** Low
**Component:** Announcements (API, attachments) | **Labels:** announcements, attachments, validation
**Environment:** Staging, https://staging.performance.lmdmax.com, station DYY6 (477), Chrome
**Found by / date:** QA, 2026-11-04 | **Test case:** ANN-056

**Description**

When an admin attaches a file to an announcement, the server checks only the start of the file. A file
that starts like a real PDF but whose content is broken is accepted and can be sent to drivers, who then
get a file that does not open. An .exe renamed to .pdf is refused ("qa-exe-renamed.pdf is not a supported
file type"), so the type check works; only the content is not checked.

**Steps to reproduce**

1. Log in as the DYY6 owner, select DYY6, open Announcements.
2. Create announcement.
3. Under Attachments, choose `qa-corrupt.pdf` (a valid PDF header followed by random bytes; attached).
4. To compare, choose `qa-exe-renamed.pdf` (an .exe renamed to .pdf; attached).

**Expected result:** `qa-corrupt.pdf` is refused with a clear message, for example "qa-corrupt.pdf is
damaged or cannot be opened" (ANN-056).

**Actual result**

- `qa-corrupt.pdf` is accepted: `POST /lmd/prfsrv/announcements/v1/attachments` returns 200 "Attachments
  uploaded", and the file can be sent to drivers.
- `qa-exe-renamed.pdf` is correctly refused.

**Business impact:** drivers receive an attachment that does not open, possibly an important notice, and
the admin gets no warning. Low risk: no data is lost and no access is wrong.

**Suggested fix:** on upload, try to parse the file for its type (PDF: open with a PDF library and check
for at least one readable page; DOCX/XLSX: valid ZIP/Office package; PNG/JPG: decode the image). If
parsing fails, return 400 with a message naming the file.

**Question for the developers:** is checking the whole file planned? If not, say so on the ticket, so QA
can ask the BA to change ANN-056.

**Acceptance criteria**

- Uploading `qa-corrupt.pdf` gives 400 with a clear message, shown on the create page.
- Valid PDF, DOCX, XLSX, PNG, JPG files still upload.
- `qa-exe-renamed.pdf` is still refused.
- `npx playwright test --grep "BUG-API-034"` passes.

**Attachments:** `qa-corrupt.pdf` and `qa-exe-renamed.pdf` (from `test-files/announcements/`); screenshot
of the create page with `qa-corrupt.pdf` in the list and no error; screenshot of the `qa-exe-renamed.pdf`
error.

**QA reference:** `docs/known-bugs/api-bugs.md` BUG-API-034.

---

## Messages for the BA / PO

**BUG-UI-009 (BA):** Announcements create page: when the title goes over 100 characters (or the
description over 10,000), the box still accepts the text, the counter shows e.g. 101 / 100, and Review &
send is disabled. Sheet cases ANN-041/042/045/046 say the box should stop accepting characters at the
limit. Which behaviour is correct? If the app's behaviour is fine, can we update the sheet cases?

**BUG-API-035 (dev, about soft delete):** Soft delete is fine for keeping the data. This bug is about
access: the attachment link (cloudfront.net/announcement/staging/477/...) opens in a private window with no
login, for an announcement that is not deleted. Your own download endpoint
/announcements/v1/:id/attachments/:att/download correctly returns 401 without login, so the web app should
use that, or signed links that expire. Sheet case ANN-117 expects "access is denied".

---

## Announcement delete by a non-creator — Jira key: \_\_\_\_

> **Done, no need to log (2026-11-12):** the requirement changed and staging already enforces it: only the creator can delete an announcement (403 "Only the admin who created this announcement can delete it"); the tests were updated.

**Issue type:** Bug
**Summary:** Announcements: an admin who did not create the announcement can delete it
**Priority:** High | **Severity:** High
**Component:** Announcements (web app, API) | **Labels:** announcements, permissions
**Environment:** Staging, https://staging.performance.lmdmax.com, station DYY6 (477)
**Found by / date:** QA, 2026-11-11 | **Test cases:** ANN-023, ANN-115, ANN-192 (to update)

**Description**

Only the admin who created an announcement should be able to delete it. Today any other admin of the
station can delete it, including a promoted admin (a driver promoted to admin). The announcement is then gone
for the creator and for the drivers.

**Steps to reproduce**

1. Log in as the DYY6 owner (Arth). Announcements → Create announcement → Selected drivers → one driver →
   Review & send → Send announcement.
2. Log out. Log in as another admin of DYY6 (for example the promoted admin koala11), select DYY6.
3. Announcements → open the announcement from step 1 → Delete → confirm.

**Expected result:** the Delete option is not shown to an admin who did not create the announcement, and the
server refuses the delete (403, for example "Only the admin who created the announcement can delete it").

**Actual result:** the announcement is deleted: "Announcement deleted, it is no longer visible to drivers"
(200). The creator then gets "Announcement not found" (404).

**API:** `DELETE /lmd/prfsrv/announcements/v1/<announcement id>` with the token of an admin who is not the
creator → 200 (expected 403).

**Business impact:** any admin, including a driver promoted to admin, can remove another admin's
announcement (for example a safety notice) without the creator knowing; drivers no longer see it.

**Note:** the test sheet says the opposite (ANN-115, ANN-192: "another admin can delete"). The sheet and the
automated tests must be updated with this rule.

---

## Comment delete by any admin — Jira key: \_\_\_\_

> **Done, no need to log (2026-11-12):** the requirement changed and staging already enforces it: only the author can delete a comment (403 "Only the author can delete this comment"); the tests were updated.

**Issue type:** Bug
**Summary:** Announcements: any admin can delete the comment of any other admin or of the owner
**Priority:** Medium | **Severity:** Medium
**Component:** Announcements (web app, API) | **Labels:** announcements, comments, permissions
**Environment:** Staging, https://staging.performance.lmdmax.com, station DYY6 (477)
**Found by / date:** QA, 2026-11-11 | **Test cases:** ANN-131, ANN-134 (to update)

**Description**

Only the person who wrote a comment should be able to delete it. Today every admin of the station (admins
and promoted admins) sees Delete on every comment and can delete the comment of any other admin or of the
owner. When the comment has replies, the replies are deleted with it.

**Steps to reproduce**

1. Log in as the DYY6 owner (Arth). Open an announcement whose comments are "Everyone" → write a comment.
2. Log in as admin gyani, select DYY6, open the same announcement → write a comment.
3. Log in as the promoted admin koala11 (or as gyani), select DYY6, open the same announcement → Comments.
4. On Arth's comment → Delete → confirm. On gyani's comment → Delete → confirm.

**Expected result:** Delete is shown only on the user's own comments; the server refuses to delete another
user's comment (403).

**Actual result:**

| Who deletes              | Whose comment | Result                              |
| ------------------------ | ------------- | ----------------------------------- |
| gyani (admin)            | Arth (owner)  | 200 "Comment deleted"               |
| koala11 (promoted admin) | Arth (owner)  | 200 "Comment and 1 replies deleted" |
| koala11 (promoted admin) | gyani (admin) | 200 "Comment deleted"               |

Every admin also gets `can_delete: true` on every comment, so the screen shows Delete on all of them. History
records "comment_deleted" by the admin who deleted it.

**API:** `DELETE /lmd/prfsrv/announcements/v1/<announcement id>/comments/<comment id>` with the token of an
admin who did not write the comment → 200 (expected 403). `GET /lmd/prfsrv/announcements/v1/<announcement
id>/overview` → `comments.threads[].can_delete: true` for comments of other users (expected false).

**Business impact:** any admin, including a driver promoted to admin, can remove the comments of the owner and
of other admins, and the replies under them, without the author knowing.

**Note:** the test sheet says the opposite (ANN-131: "an admin can delete"). The sheet and the automated
tests must be updated with this rule.

---

## New drivers do not get earlier "All drivers" announcements — Jira key: \_\_\_\_

**Issue type:** Bug
**Summary:** Announcements: a newly added driver does not receive the earlier "All drivers" announcements
**Priority:** High | **Severity:** High
**Component:** Announcements (web app, API) | **Labels:** announcements, recipients, new-drivers
**Environment:** Staging, https://staging.performance.lmdmax.com, station DYY6 (477)
**Found by / date:** QA, 2026-11-11 | **Test cases:** ANN-200, ANN-201, ANN-202, ANN-203 (AC13)

**Description**

User story and the tooltip on the Announcements page: "Announcements go to drivers only. New drivers
automatically receive every announcement when they join." An announcement sent to **All drivers** is saved
with `includes_new_drivers: true`, but a driver added to the station after it was sent is never added to its
recipients. Only announcements sent after the driver joined reach the driver.

**Steps to reproduce**

1. Log in as the DYY6 owner (Arth). Announcements → Create announcement → **All drivers** → Review & send →
   Send (example: "vbgfb", sent 2026-11-11 01:06 UTC to 64 drivers).
2. Leaderboard → Add Driver → add a new driver to DYY6 with sign-in allowed (example: joennn, driver 40057,
   user 36129, joennn@yopmail.com).
3. Send another announcement to **All drivers** (example: "safety policy", sent 06:30 UTC).
4. Open each announcement → Activity, and search for the new driver. (Optional: log in to the LMD Driver app
   as the new driver and open Announcements.)

**Expected result:** the new driver receives every earlier "All drivers" announcement: "vbgfb" shows 65
recipients, the new driver is listed in its Activity (Not seen), and sees it in the driver app.

**Actual result:**

| Announcement                     | Sent                 | Recipients | New driver joennn in Activity |
| -------------------------------- | -------------------- | ---------- | ----------------------------- |
| vbgfb (before the driver joined) | 2026-11-11 01:06 UTC | 64         | **No**                        |
| safety policy (after)            | 2026-11-11 06:30 UTC | 65         | Yes                           |

The only difference between the two recipient lists is joennn. "vbgfb" still says
`audience: { type: "all", recipients: 64, includes_new_drivers: true }`.

**API:** `GET /lmd/prfsrv/announcements/v1/<id>/overview` → `audience.recipients` is not updated;
`GET /lmd/prfsrv/announcements/v1/<id>/activity?filter=all` → the new driver is not listed.

**Business impact:** drivers who join a station miss the standing announcements (safety notices, policies)
that the story says they must receive; their acknowledgement can never be tracked.

**To confirm with the developers:** whether new drivers are meant to be added when they are created or only
when they first log in to the driver app. If it happens at first login, please say so in the story; QA will
then repeat the check after the new driver logs in.
