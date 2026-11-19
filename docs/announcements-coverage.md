# Announcements — test coverage

This page shows how the 207 cases of the sheet **"Announcements_Module_Test_Cases"** (ANN-001 to ANN-207,
AC1 to AC14) are covered. It is written for QA. **163 cases are automated** (fully, or the admin side of
the case); **44 are not**, because they need the driver app, a phone, a database or accounts staging does
not have (see the end of this page).

## Words used

| Sheet                  | Here                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| Station                | **DYY6 (477)**: `ANN_STATION_ID`, `ANN_STATION_CODE`                                              |
| Owner / creating admin | **Arth** (`ANN_OWNER_EMAIL`, arth@yopmail.com), owner of DYY6                                     |
| Admin B (not creator)  | **gyani** (`ADMIN_B_EMAIL`), admin of DYY6                                                        |
| Driver A               | **Chad Elnahal** (`ANN_DRIVER_NAME`, user 13848, driver 33256): the only driver the tests send to |
| Station B / stranger   | AQWA (578, Arth's other station) and the test user allchat575 (no access to DYY6)                 |

**Every announcement the tests send goes only to Chad Elnahal ("Selected drivers").** Chad gets a push
notification and an SMS for each one (about 85 per full run; Chad's number is a valid test number). The
tests never use **All drivers**: DYY6 has 64 drivers with the LMD Driver app. Edits are saved with "Notify
drivers about this update" off. Every test deletes what it sent; after a run the station has 0
announcements.

## Where the tests are

| File                                                 | What it checks                                                                                                                                                                                      |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/api/announcements/announcements.spec.js`      | The server: listing, counts, search, sort, validation, files, recipients, comments, activity, history, edit, delete, permissions (52 tests)                                                         |
| `tests/ui/announcements.spec.js`                     | The screens: cards, tooltip, create page, limits and counters, files, driver picker, review, send, details, comments, activity, history, edit, delete (47 tests)                                    |
| `tests/api/announcements/admin-roles.spec.js`        | Other roles: an admin who is not the owner as creator (send, only the creator edits, delete, comment rules) and the promoted admin (sees, no Edit, Delete, comments, the two known bugs) (13 tests) |
| `tests/ui/announcements/roles.spec.js`               | The same roles on the screens: admin sends and has Edit; owner has no Edit on an admin's announcement; promoted admin card/details, comment, "admins reply" box, Send (6 tests)                     |
| `api/announcements.js`, `pages/AnnouncementsPage.js` | The helpers                                                                                                                                                                                         |
| `test-files/announcements/`                          | Sample PDF, DOCX, XLSX, PNG, and the bad files (.txt, .gif, .mp4, .exe, .exe renamed .pdf, broken PDF)                                                                                              |

Run them with **`npm run test:announcements`**: the API file first, then the UI file, one test at a time
(counts and "newest first" would change under a parallel test), and the UI file also runs when the API
file has known-bug failures. They are tagged `@adds-data`, so `npm test` skips them. Without `ANN_*` in the
`.env` file they are skipped. In a full run (`npx playwright test`) the UI file still waits for a clean API
file and is reported as "did not run"; on CI a separate step runs it (`.github/workflows/tests.yml`).

**Last run (2026-11-04, staging, DYY6):** API 47 passed, 5 failed on known bugs; UI 43 passed, 4 failed on
known bugs. Every other test passed. The station had 0 announcements after the run.

## Roles (added 2026-11-11)

The story says Owners/Admins create, only the creating admin edits, and admins delete. The role files check
this for **gyani** (admin, not the owner, as creator) and **koala11** (`PROMOTED_ADMIN`, a driver promoted to
admin). First run (2026-11-11, staging): 15 passed; 4 failed on the new known bugs BUG-API-045 (a promoted
admin cannot send: ROLE-11, ROLE-UI-06) and BUG-API-046 (a promoted admin is treated as a driver in comments:
ROLE-12, ROLE-13). The cases that still need a person (driver app, phone, demoted admin, database, questions
for the PO) are in **`docs/Announcements_Manual_To_Test.xlsx`** (52 rows, in test order).

**Rule change (2026-11-12):** only the creator deletes an announcement (also not the owner), and only the
author deletes a comment. The tests follow the new rule: ANN-023, ANN-115/125, ANN-130/131/157, ANN-134,
ANN-192/194/195/197, ANN-199, ROLE-02, ROLE-06, ROLE-07, ROLE-UI-02, ROLE-UI-03, and the new ROLE-14 (comment
delete by author only). `ann.cleanUp` deletes each test announcement as its creator. BUG-API-045 and
BUG-API-046 are fixed (ROLE-11, ROLE-12, ROLE-13, ROLE-UI-06 pass and are no longer @knownbug).

## Bugs found (2026-11-04)

| Bug         | What                                                                                            | Cases                  |
| ----------- | ----------------------------------------------------------------------------------------------- | ---------------------- |
| BUG-API-035 | **Attachments open without login**: Download is the public CloudFront link (High)               | ANN-117                |
| BUG-API-033 | The server accepts files over 10 MB                                                             | ANN-054 (size)         |
| BUG-API-032 | The server accepts a title over 100 characters (create and edit)                                | ANN-041, ANN-169       |
| BUG-API-034 | A broken PDF is accepted                                                                        | ANN-056                |
| BUG-UI-009  | Title/description take more than the limit (red message) instead of stopping at it — to confirm | ANN-041, 042, 045, 046 |

**Sheet differences to ask the BA about:**

- ANN-008: the sheet's tooltip text is "announcement go to drivers only new drivers automatically receive
  every announcement when they join"; the app says "Announcements go to drivers only. New drivers
  automatically receive every announcement when they join." The test checks the app's text.
- ANN-032 to ANN-035: the message is one line for both fields, "Add a title and description to continue."
  (not one message per field).
- ANN-084: in "Drivers comment, admins reply" the server answers an admin's new comment with an error; the
  screen hides the comment box. Both are checked.
- ANN-149/150: a title change in History shows the old and the new title (no "before/after" labels).

## Not automated (44 cases)

| Why                                                                                        | Cases                                                                                                                                |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **A driver must act in the driver app** (open, comment, acknowledge, see their own view)   | 049, 062, 079, 081, 082, 083, 085, 087, 088, 089, 091, 103, 116, 132, 133, 134 (driver part), 136, 138, 139, 158, 178, 179, 198, 207 |
| **A phone must be checked** (push notification, SMS)                                       | 098, 099, 100, 180, 181 — check by hand on Chad's phone                                                                              |
| **All drivers** (would notify all 64 DYY6 drivers) or a second real recipient              | 010, 059, 060, 154, 155, 156, 165                                                                                                    |
| **Newly added drivers** (a driver must join the station and log in to the driver app)      | 200, 201, 202, 203                                                                                                                   |
| **Creator demoted** (an admin we may demote; demoting gyani or koala11 breaks other tests) | 204, 205, 206                                                                                                                        |
| A driver without the LMD Driver app is needed by name                                      | 065                                                                                                                                  |
| The database must be checked (deleted data kept)                                           | 196                                                                                                                                  |

**To automate most of the first group**, the team can give QA a driver login for the LMD Driver app and the
driver app's announcement addresses (list, open/seen, acknowledge, comment). Then the tests can act as
Chad. For AC14, an extra admin on DYY6 that may be demoted; for "All drivers", a station whose drivers are
all test drivers.
