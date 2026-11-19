# Announcements — manual bug check (progress)

QA is checking by hand, one at a time, the bugs the automated Announcements tests found (see
[announcements-coverage.md](announcements-coverage.md)). This page says where the check stopped and what is
left, so it can be picked up again.

**Started:** 2026-11-04. **Stopped at:** Bug 6 (BUG-API-033), Postman step.

**Setup:** Chrome, https://staging.performance.lmdmax.com, Arth (arth@yopmail.com), station DYY6. Anything
sent goes to Chad Elnahal only (Selected drivers).

## Where each bug stands

| #   | Bug         | What                                          | Checked by hand | Result                                                                                                                          | Next step                                                                                                                                                                          |
| --- | ----------- | --------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | BUG-API-035 | Attachment link opens without login (High)    | Yes             | **Reproduced**: the PDF opened in Incognito                                                                                     | Dev is confirming. Jira ticket text written; add the Jira key here. Extra check ↓                                                                                                  |
| 2   | BUG-UI-011  | Cancel needs two clicks after picking drivers | Yes             | **Not a bug**: one click works. The test clicked too fast                                                                       | Withdrawn; the test was fixed. Do not log                                                                                                                                          |
| 3   | BUG-UI-009  | Title/description take more than the limit    | Yes             | Same as the test: text goes over, Review & send is disabled                                                                     | Ask the BA: stop at the limit (sheet) or block sending (app)? Not a code bug                                                                                                       |
| 4   | BUG-UI-010  | Activity has no station column                | Yes             | Same as the test: no station column                                                                                             | **Dropped** (2026-11-17): agreed with the BA, no station column. Test changed, ticket removed                                                                                                                           |
| 5   | BUG-API-034 | Broken PDF accepted                           | Steps given     | Jira ticket text written                                                                                                        | Check your result matches before logging; add the Jira key here                                                                                                                    |
| 6   | BUG-API-033 | Server accepts files over 10 MB               | Tried           | **Not reproduced by hand** (2026-11-06): Postman kept answering 404 (request setup). The automated test and a QA script get 200 | Kept aside. Later: import `C:\Users\Softsensor\Postman\files\BUG-API-033 upload 11MB.postman_collection.json` (logs in by itself)                                                  |
| 7   | BUG-API-032 | Server accepts a title over 100 characters    | Yes (screen)    | **Screen works** (2026-11-06): Review & send stays disabled over 100 characters. Only the server accepts it (API test)          | Not reproduced by hand on the server; keep as a Low API-only finding. Collection for later: `C:\Users\Softsensor\Postman\files\BUG-API-032 title over 100.postman_collection.json` |

## Not reproduced by hand (for now)

- **BUG-API-033** (files over 10 MB): Postman answered 404 on every try (URL with a line break, then still
  404). The server itself answers 401 without login and 200 with Arth's login for the 11 MB file (QA script,
  2026-11-04), and the automated test ANN-054 fails on it. To retry with the ready collection above.
- **BUG-API-032** (title over 100): the screen blocks it correctly (QA, 2026-11-06). The server accepting
  it was only seen by the automated tests (ANN-041, ANN-169); a user cannot do it through the web app.

**Extra check for Bug 1 (not done yet):** delete the announcement "QA bug 035 - please ignore" (DYY6), then
open the same PDF link (cloudfront.net) in Incognito again. If it still opens, add to the ticket: "The file
still opens without login after the announcement is deleted."

**Recheck on 2026-11-04:** the 11 MB upload, sent from the QA scripts as Arth, returned 200 "Attachments
uploaded" (size 11534336), with and without an `Origin` header. So the bug is there; the 404 in Postman is
the request setup.

## Postman setup (Bugs 6 and 7)

- Method **POST**, URL `https://staging-api.fleet.lmdmax.com/lmd/prfsrv/announcements/v1/attachments` (no
  slash at the end, empty Params tab).
- Headers: `x-access-token`, `x-access-user` (copy them from Chrome: F12 → Network → a `list` request of the
  Announcements page → Request Headers), `app-type: 2`.
- Body: form-data, key `files` set to **File**, value `qa-11mb.pdf`.
- Still 404: check the method (POST), the host (`staging-api...`, not `staging.performance...`), and send
  the URL and the body text of the answer. Or in Chrome, attach a file on the create page, right-click the
  `attachments` request → Copy → Copy as cURL (bash), and Postman → Import.
- Do not share the token or show it in screenshots.

## Files for the checks

All in `test-files/announcements/`:

- `qa-corrupt.pdf`, `qa-exe-renamed.pdf`: Bug 5
- `title-101.txt` (101 characters), `description-10001.txt` (10,001 characters): Bug 3, and the title for
  Bug 7
- `qa-11mb.pdf` (Bug 6) is not kept (11 MB). Make it again in PowerShell, from the project folder:

  ```powershell
  $src = [IO.File]::ReadAllBytes("test-files\announcements\qa-sample.pdf"); $pad = New-Object byte[] (11MB - $src.Length); for ($i = 0; $i -lt $pad.Length; $i++) { $pad[$i] = 32 }; [IO.File]::WriteAllBytes("$env:TEMP\qa-11mb.pdf", $src + $pad)
  ```

  The file is then in `%TEMP%\qa-11mb.pdf`.
