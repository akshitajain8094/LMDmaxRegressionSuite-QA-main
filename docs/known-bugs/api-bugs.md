# Known bugs — API (server)

This document lists the bugs that our automated tests found in the LMDmax **server** (also called the
API): the part of LMDmax that saves data and sends it to the web app. It is written for everybody: QA,
developers, BAs and managers. You do not need to know the code to read it.

- All bugs were found on **staging** (<https://staging.performance.lmdmax.com>) with station **DYY1**.
- Every bug has the same parts: **Summary**, **Before you start**, **Steps to replicate**, **Expected
  result**, **Actual result**, **Business impact** and **How to check the fix**. Developers find the
  exact requests under **Technical details** at the end of each bug (click it to open it).
- An open bug has automated tests that fail on purpose until the bug is fixed. Run all of them with
  `npm run test:knownbug`.

**In this document:** [Why a server bug matters](#why-a-server-bug-matters-when-the-screen-is-correct) ·
[Words used](#words-used) · [How to replicate a bug](#how-to-replicate-a-bug) · [Summary](#summary) ·
[Bugs by screen](#bugs-by-screen) · [Suggestions](#suggestions-not-bugs) · [Test environment
requests](#test-environment-requests) · [History](#history) · [Adding a new bug](#adding-a-new-bug)

## Why a server bug matters when the screen is correct

The web app checks a lot before it saves. For example, a driver name can have at most 35 characters,
and a threshold cannot be empty. But the web app is not the only way to reach the server. Other LMDmax
apps (for example the Scheduler, which also saves call-outs), imports, integrations and any person with
a login and a tool like Postman can send data straight to the server. So the server must check the
same rules as the screens.

In many bugs below, the screen is correct and the server is not. The steps then show both: first what
the screen does (correct), then what the server does (the bug).

## Words used

| Word                         | Meaning                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web app**                  | The LMDmax pages a manager uses in the browser.                                                                                                                                                                  |
| **Server** (API)             | The part of LMDmax that saves data and sends it to the web app and to other apps.                                                                                                                                |
| **Request**                  | What the web app (or another app) sends to the server, for example "save this rescue" or "give me the call-outs of 25 September".                                                                                |
| **Answer**                   | What the server sends back. Developers call it the response.                                                                                                                                                     |
| **Accepted** (200 or 201)    | The server says "OK".                                                                                                                                                                                            |
| **Refused** (400)            | The server says "your request is wrong" and saves nothing. This is the right answer for wrong input.                                                                                                             |
| **Not logged in** (401)      | The request has no valid login.                                                                                                                                                                                  |
| **Not found** (404)          | The address or the record does not exist.                                                                                                                                                                        |
| **Already exists** (409)     | The data belongs to another record, for example another driver already has this phone number.                                                                                                                    |
| **Server error** (500)       | The server failed while it worked on the request.                                                                                                                                                                |
| **Swagger**                  | The developers' manual of the server: <https://staging-api.fleet.lmdmax.com/api-docs/>                                                                                                                           |
| **Station DYY1**             | The test station. All numbers in this document are from DYY1.                                                                                                                                                    |
| **Test drivers**             | Drivers made for testing. Their phones and emails reach no real person: Jordan Whitaker (38267), Casey Brooks (38315), Riley Thompson (38308) and Morgan Ellis (38309). Driver 38272 is an inactive test driver. |
| **Driver page**              | The page of one driver, with the tabs Profile, E-Signature, Weekly and Timeline. Its address is `/driver/profile/<driver number>`, for example <https://staging.performance.lmdmax.com/driver/profile/38267>.    |
| **Automated test** (TC-xx)   | A test in this project. For example `rescues/rescue.spec.js` TC-05 is test case 5 in the file `tests/api/rescues/rescue.spec.js`.                                                                                |
| **Known-bug test**           | An automated test that checks the correct behaviour. It fails until the bug is fixed.                                                                                                                            |
| **Structure check** (schema) | An automated test that checks the shape of an answer: which parts it has, and what kind of value each part holds (a number, a text, a list).                                                                     |

## How to replicate a bug

**The easiest way (QA): run the bug's automated tests.**

1. Open this project in VS Code and open a terminal (**Terminal → New Terminal**).
2. Run the command from the bug's **How to check the fix** part, for example
   `npx playwright test --grep "BUG-API-022"`.
3. Open the report with `npm run report`. Click a test, then **API call**: it shows the address, the
   status and the server's answer.

**By hand (QA or developers), with Postman or curl:**

1. Log in to the web app and choose station **DYY1** (top right of the page).
2. Press **F12** and open the **Network** tab. Click any request to `staging-api.fleet.lmdmax.com` →
   **Headers**, and copy the values of `x-access-token` and `x-access-user`. They are your login:
   never share them.
3. Send the request from the bug's **Technical details** with these two headers. The address starts
   with `https://staging-api.fleet.lmdmax.com`.

Example with curl (a request that only reads data):

```bash
curl 'https://staging-api.fleet.lmdmax.com/lmd/prfsrv/rescue/v2/rescue?date=2026-08-13' \
  -H 'x-access-token: <your x-access-token>' \
  -H 'x-access-user: <your x-access-user>'
```

A request that saves data also needs `-X POST` (or `-X PATCH`, `-X DELETE`),
`-H 'content-type: application/json'` and `-d '<the body from Technical details>'`. The web app also
sends the headers `app-type: 2` and `client-time-zone` (for example `Asia/Calcutta`): add them to send
exactly what the web app sends.

**In Swagger:** click **Authorize** and fill both fields, `x-access-token` and `x-access-user`. Some
parts of Swagger are wrong (BUG-API-011, BUG-API-012), so some bugs can only be replicated with
Postman, curl or the tests.

## Summary

| ID          | Title                                                                                                       | Screen                                                               | Severity | Priority | Status     | Automated tests        |
| ----------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | -------- | ---------- | ---------------------- |
| BUG-API-001 | Wrong or missing details in a request give empty or wrong data instead of an error                          | Dashboard, Driver page, Callouts, Rescue                             | High     | P1       | Open       | 31                     |
| BUG-API-002 | A date range that ends before it starts is accepted                                                         | Leaderboard (Suspend Driver), Dashboard, Callouts, Rescue            | Medium   | P2       | Open       | 13                     |
| BUG-API-003 | Error messages show internal technical text instead of a clear message                                      | Dashboard, Add Driver, Driver page, Callouts, Rescue                 | Medium   | P3       | Open       | 33                     |
| BUG-API-004 | Your Scorecard: the weekly insights of a week without data give a program error                             | Your Scorecard                                                       | Medium   | P2       | Open       | 2                      |
| BUG-API-005 | The same information comes in two different forms                                                           | Driver page, E-Signature, Dashboard, Callouts, Rescue, Set Threshold | Low      | P3       | Open       | 2 + 7 structure checks |
| BUG-API-006 | Leaderboard: no driver has rank 1 (the ranking starts at 2)                                                 | Leaderboard                                                          | Medium   | P2       | Open       | 1                      |
| BUG-API-007 | Leaderboard: the Overall Standing column is empty for every driver                                          | Leaderboard                                                          | Medium   | P3       | To confirm | —                      |
| BUG-API-008 | Leaderboard: the server sends drivers' personal data that the page does not show                            | Leaderboard                                                          | Medium   | P2       | To discuss | —                      |
| BUG-API-009 | Your Scorecard: bad-news insights are marked as good news                                                   | Your Scorecard                                                       | Medium   | P3       | To discuss | —                      |
| BUG-API-010 | Your Scorecard: the weekly insights for drivers are always empty                                            | Your Scorecard                                                       | Low      | P3       | To confirm | —                      |
| BUG-API-011 | Swagger: the manual lists wrong request details for several addresses                                       | Swagger                                                              | High     | P1       | Open       | —                      |
| BUG-API-012 | Swagger: "Try it out" fails for the graph and Leaderboard addresses                                         | Swagger                                                              | Medium   | P2       | Open       | —                      |
| BUG-API-013 | Swagger: many addresses the web app uses are missing or not explained                                       | Swagger                                                              | Low      | P3       | Open       | —                      |
| BUG-API-014 | Spelling mistakes in texts from the server                                                                  | Graphs, E-Signature (driver's link), Driver page (Weekly, Timeline)  | Low      | P4       | Open       | 1                      |
| BUG-API-015 | The server saves wrong data that the screens do not allow                                                   | Add Driver, E-Signature, Callouts, Leaderboard, Set Threshold        | High     | P2       | Open       | 8                      |
| BUG-API-016 | E-Signature: a signed or refused write-up can still be deleted                                              | E-Signature                                                          | High     | P1       | Open       | 1                      |
| BUG-API-017 | Write-ups and rescues: the "last changed" time does not change after an edit                                | E-Signature, Rescue                                                  | Low      | P3       | Open       | 2                      |
| BUG-API-018 | Callouts: a driver can get two call-outs on the same day                                                    | Callouts                                                             | High     | P2       | Open       | 1                      |
| BUG-API-019 | E-Signature: the driver's signing link works without its secret key (security)                              | E-Signature (driver's link)                                          | High     | P1       | To confirm | —                      |
| BUG-API-020 | Edit driver: another driver's phone number or transporter ID is saved without a warning                     | Driver page (Edit)                                                   | High     | P1       | Open       | 3                      |
| BUG-API-021 | Driver status: the server does not follow the Leaderboard rules for suspended and inactive drivers          | Leaderboard                                                          | Medium   | P2       | Open       | 2                      |
| BUG-API-022 | Rescue: a driver can be their own rescuer, and an inactive driver can be a rescuer                          | Rescue                                                               | Medium   | P2       | Open       | 2                      |
| BUG-API-023 | Scorecards: weeks 31 and 32 have the same scorecard for every driver                                        | Driver page (Weekly)                                                 | Medium   | P2       | To confirm | —                      |
| BUG-API-024 | Driver page: the ScoreCard and the POD report show different POD opportunities for 3 drivers                | Driver page (Weekly)                                                 | Low      | P3       | To confirm | —                      |
| BUG-API-025 | E-Signature: right after a write-up is sent, the driver's link and Refuse say that it does not exist        | E-Signature (driver's link)                                          | High     | P2       | To confirm | —                      |
| BUG-API-026 | Sign in: the password also works with spaces before or after it                                             | Sign In                                                              | Medium   | P2       | To confirm | 1                      |
| BUG-API-027 | Forgot Password: an unregistered email answers "not found" and "success" at the same time                   | Forgot Password                                                      | Low      | P3       | Open       | 1                      |
| BUG-API-028 | Control Tower: the logout works without a login (security)                                                  | Control Tower sign-in                                                | High     | P2       | To confirm | 1                      |
| BUG-API-029 | Chat: deleting an unknown message, or through another conversation, gives a server error (500)              | Chat (Paya Chat, Individual Chat)                                    | Low      | P3       | Open       | 2                      |
| BUG-API-030 | Chat: a deleted image or file can still be opened with its link (privacy)                                   | Chat (Paya Chat, Individual Chat)                                    | High     | P2       | To confirm | 1                      |
| BUG-API-032 | Announcements: the server accepts a title longer than 100 characters                                        | Announcements                                                        | Low      | P3       | Open       | 2                      |
| BUG-API-033 | Announcements: the server accepts attachments larger than 10 MB                                             | Announcements                                                        | Medium   | P3       | Open       | 1                      |
| BUG-API-034 | Announcements: a broken (corrupt) PDF is accepted as an attachment                                          | Announcements                                                        | Low      | P3       | Open       | 1                      |
| BUG-API-035 | Announcements: attachments can be downloaded by anyone with the link, without login                         | Announcements                                                        | High     | P2       | Open       | 2                      |
| BUG-API-036 | Add Driver: an owner's email and phone are not checked: they can be used for a driver                       | Leaderboard → Add Driver                                             | High     | P2       | Open       | 5                      |
| BUG-API-037 | Add Driver: a conflict with another company sends that company's driver details to the admin (privacy)      | Leaderboard → Add Driver                                             | High     | P2       | Open       | 1                      |
| BUG-API-038 | Add Driver: the same phone with "+1" in front is a new number                                               | Leaderboard → Add Driver                                             | Medium   | P3       | To confirm | 1                      |
| BUG-API-039 | Super Admin: Update & Resolve accepts a wrong phone number (5 digits) and resolves the request              | Super Admin → Conflict Requests                                      | Medium   | P2       | Open       | 1                      |
| BUG-API-040 | Promotion: a driver whose details are used in another company is promoted to admin without the Super Admin  | Leaderboard → Promote As An Admin                                    | High     | P2       | Open       | 1                      |
| BUG-API-041 | Add Driver: a driver of earthhh added in Brothers is not reported as a conflict (one direction only)        | Leaderboard → Add Driver                                             | High     | P2       | Open       | 1                      |
| BUG-API-042 | Activation: a driver is activated although the same person is active in another company                     | Leaderboard (status switch), Driver page → Edit                      | High     | P2       | Open       | 1                      |
| BUG-API-044 | Add Driver: an admin can add a driver to a station of another company (any station id is accepted)          | Leaderboard → Add Driver                                             | High     | P1       | Open       | —                      |
| BUG-API-045 | Announcements: a promoted admin cannot send an announcement (the Create page is offered, Send fails)        | Announcements → Create announcement → Send                           | High     | P2       | Fixed      | 2                      |
| BUG-API-046 | Announcements: a promoted admin is treated as a driver in comments (starts comments in "admins reply" mode) | Announcement details → Comments                                      | Medium   | P3       | Fixed      | 2                      |
| BUG-API-047 | Announcements: a newly added driver does not receive the earlier "All drivers" announcements                | Announcements (All drivers) / Add Driver                             | High     | P2       | Open       | — (manual, ANN-200)    |

**Severity** (how bad it is for the business): **High** = wrong data is saved or shown, or there is a
security risk · **Medium** = something works wrong, but there is a way around it · **Low** = a small
problem, for example a spelling mistake.
**Priority** (how soon to fix it): **P1** = fix next · **P2** = fix soon · **P3** = fix later · **P4**
= fix when there is time.
**Status:** **Open** = a confirmed bug · **To confirm** = we need an answer from the developers first ·
**To discuss** = the right behaviour must be agreed first · **Fixed** · **Closed**.

## Bugs by screen

| Screen (menu → page)                                                 | Bugs                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Dashboard → Daily Highlights                                         | 001, 002, 003, 005                                                       |
| Dashboard → Your Scorecard                                           | 001, 002, 003, 004, 005, 009, 010                                        |
| Dashboard → Leaderboard                                              | 002 (Suspend Driver), 006, 007, 008, 021 (status switch, Suspend/Resume) |
| Dashboard → Leaderboard → Add Driver                                 | 003, 015                                                                 |
| Driver page → Profile → Edit                                         | 003, 015, 020                                                            |
| Driver page → E-Signature (write-ups and acknowledgements)           | 005, 014, 015, 016, 017, 019, 025                                        |
| Driver page → Weekly                                                 | 001, 003, 005, 014, 023, 024                                             |
| Driver page → Driver Rating History                                  | 005                                                                      |
| Driver page → Timeline                                               | 014                                                                      |
| Data Management → Callouts                                           | 001, 002, 003, 005, 015, 018                                             |
| Data Management → Rescue                                             | 001, 002, 003, 005, 017, 022                                             |
| Settings → Set Threshold → Scorecard                                 | 005, 015                                                                 |
| Sign In, Forgot Password and Control Tower sign-in                   | 014 (Forgot Password), 026, 027, 028                                     |
| Chat → Paya Chat and Individual Chat (deleted messages)              | 029, 030                                                                 |
| Announcements (create, details, edit)                                | 032, 033, 034, 035                                                       |
| Leaderboard → Add Driver (Rehire & conflicts)                        | 036, 037, 038                                                            |
| Super Admin site → Conflict Requests                                 | 039                                                                      |
| Swagger (the developers' manual)                                     | 011, 012, 013                                                            |
| Server parts that no screen uses today (8 graph dashboards, 1 graph) | 001, 002, 003, 014 (see SUG-API-005)                                     |

---

## BUG-API-001: Wrong or missing details in a request give empty or wrong data instead of an error

|                     |                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Screens**         | Dashboard (Daily Highlights, Your Scorecard), Driver page (Weekly), Callouts, Rescue |
| **Severity**        | High for the dashboard, Medium for the rest                                          |
| **Priority**        | P1                                                                                   |
| **Status**          | Open                                                                                 |
| **Found on**        | 2026-09-23 (staging, station DYY1)                                                   |
| **Automated tests** | 31 (see "Where it happens")                                                          |

**Summary:** when a request to the server has a missing or wrong detail (for example no dates, an
unknown type, or week 99), the server should refuse it with a clear message. Instead it says "OK" and
sends empty, zero or wrong data. So a mistake looks exactly like "there is no data".

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate** (example: the dashboard)

In the web app (correct):

1. Open **Dashboard → Daily Highlights**. The page shows the numbers of the chosen dates, for example
   the number of write-ups from Sep 19 to Sep 25, 2026. To get them, the web app sends the start date
   and the end date to the server.

Through the server (the bug):

2. Send the same request **without** the start date and the end date (see Technical details).
3. Look at the answer.

**Expected result:** the server refuses the request with a clear message, for example "start and end
are required". It already refuses the request when only one of the two dates is missing.

**Actual result:** the server says "OK", and every number in the answer (write-ups, call-outs,
rescues, ...) is 0.

**Business impact:** mistakes are hidden. If an app, an integration or a report sends a wrong request,
the manager sees zeros or empty lists and thinks there was no activity, and nobody notices the error.
The dashboard case is the most serious: it looks normal, but all numbers are 0. This is exactly what
happens when someone follows Swagger (BUG-API-011).

**Where it happens**

| Screen                                              | What the request had                                                                           | What the server did                                                                                    | Automated test                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Dashboard → Daily Highlights                        | no start date and no end date                                                                  | "OK", every number is 0                                                                                | `dashboard/dashboard-data.spec.js` TC-15                                  |
| Dashboard → Daily Highlights (insights)             | no insight type, or an unknown type                                                            | "OK", empty list                                                                                       | `dashboard/daily-insights.spec.js` TC-17, TC-18                           |
| Dashboard → Daily Highlights (insights for drivers) | no report name, or an unknown report name                                                      | "OK", empty list                                                                                       | `dashboard/daily-insights.spec.js` TC-19, TC-20                           |
| Dashboard → Your Scorecard (Smart Insights)         | no insight type, or an unknown type                                                            | "OK", empty list                                                                                       | `dashboard/weekly-insights.spec.js` TC-12, TC-13                          |
| Dashboard → Your Scorecard (graph)                  | an unknown metric (also "score", the example in Swagger)                                       | "no data" for every week                                                                               | `graph-data/dsp-scorecard-graph.spec.js` TC-15, TC-16                     |
| Dashboard → Your Scorecard (graph)                  | a number of weeks of 0, -1 or "abc"                                                            | an empty graph                                                                                         | `graph-data/dsp-scorecard-graph.spec.js` TC-17, TC-18                     |
| Dashboard → Your Scorecard (graph)                  | week 99                                                                                        | weeks 94 to 99, which do not exist                                                                     | `graph-data/dsp-scorecard-graph.spec.js` TC-20                            |
| Driver page → Weekly (graph)                        | no metric                                                                                      | the graph of another metric (FICO score)                                                               | `graph-data/driver-compare-scorecard-graph.spec.js` TC-14                 |
| Driver page → Weekly (graph)                        | an unknown metric (also "score", the example in Swagger)                                       | weeks with a scorecard have no value                                                                   | `graph-data/driver-compare-scorecard-graph.spec.js` TC-15                 |
| Driver page → Weekly (graph)                        | a number of weeks of 0, -1 or "abc"                                                            | no weeks                                                                                               | `graph-data/driver-compare-scorecard-graph.spec.js` TC-16, TC-17          |
| Driver page → Weekly (graph)                        | week 99                                                                                        | weeks 94 to 99, which do not exist                                                                     | `graph-data/driver-compare-scorecard-graph.spec.js` TC-19                 |
| Driver page → Weekly (ScoreCard)                    | week 99                                                                                        | "OK", an empty ScoreCard ("No Data Found")                                                             | `scorecard/driver-scorecard.spec.js` TC-06                                |
| Driver page → Weekly ("Rating: Week 34")            | no week                                                                                        | "OK", no rating: the same answer as a week without a rating                                            | `scorecard/driver-scorecard.spec.js` TC-11                                |
| Driver page → Weekly ("Rating: Week 34")            | no driver                                                                                      | "OK", no rating ("View all week's ratings" and the Driver Rating History answer "params missing" here) | `scorecard/driver-scorecard.spec.js` TC-12                                |
| Driver page → Weekly ("View all week's ratings")    | 0 or "abc" weeks (the window offers 10, 8, 6 or 4)                                             | "OK", no weeks                                                                                         | `scorecard/driver-scorecard.spec.js` TC-18                                |
| Driver page → Weekly ("View all week's ratings")    | week 99                                                                                        | weeks 94 to 99, which do not exist                                                                     | `scorecard/driver-scorecard.spec.js` TC-19                                |
| A driver graph that no screen uses                  | an unknown metric; 0, -1 or "abc" weeks; week 99                                               | "no data" for every week, an empty graph, weeks that do not exist                                      | `graph-data/driver-current-scorecard-graph.spec.js` TC-14 to TC-16, TC-18 |
| Data Management → Callouts                          | no day                                                                                         | "OK", the call-out of another day                                                                      | `call-outs/call-out.spec.js` TC-08                                        |
| Data Management → Callouts                          | a day written as day-month-year (25-08-2026), a day that does not exist (30 February), or text | "OK", empty list                                                                                       | `call-outs/call-out.spec.js` TC-09                                        |
| Data Management → Callouts (Edit)                   | a call-out that does not exist                                                                 | "CallOut data updated successfully", but nothing changed                                               | `call-outs/call-out.spec.js` TC-21                                        |
| Data Management → Rescue                            | no day                                                                                         | "OK", the 3 rescues of another day (13 August 2026)                                                    | `rescues/rescue.spec.js` TC-05                                            |
| Data Management → Rescue (Edit)                     | a rescue that does not exist                                                                   | "Rescue data updated successfully", but nothing changed                                                | `rescues/rescue.spec.js` TC-19                                            |

**To discuss** (no tests yet): the web app always sends these details and asks only for real drivers.
The developers and QA must agree what the server should do when a detail is missing: use the latest
week, or refuse the request?

- Your Scorecard, "Compare with 4 Weeks" without a week: every metric without a value.
- The Your Scorecard graph without a week: an empty graph.
- A driver graph for a driver who does not exist: "no data" for every week, the same as a real driver
  without a scorecard.
- The rating of a driver who does not exist: no rating, the same as a real driver without a rating.

**How to check the fix:** run `npx playwright test --grep "BUG-API-001"`. The 31 tests fail while the
bug is open and pass when it is fixed. Then QA removes `@knownbug` and `(BUG-API-001)` from them and
adds the exact error message to each test.

<details>
<summary>Technical details (for developers)</summary>

- `GET /dashboard/v1/dashboard_data` without `start` and `end` → 200, every total `0`. Only one of
  them missing → 400.
- `GET /dashboard/v1/daily_insights` without `type`, or `type=xyz` → 200, empty list (Swagger marks
  `type` as required).
- `GET /dashboard/v1/daily_insights?type=drivers` without `report_name`, or `report_name=xyz` → 200,
  empty list.
- `GET /dashboard/v1/weekly_insights` without `type`, or `type=xyz` → 200, empty list.
- `GET /lmd/prfsrv/graph/v2/dsp_scorecard_graph`:
  - `field=xyz` or `field=score` (Swagger's example) → `-0.01` ("no data") for every week
  - `range=0`, `range=-1` or `range=abc` → empty data `{}`
  - `week_number=202699` → "weeks" `202694` to `202699`, which do not exist
- `GET /lmd/prfsrv/graph/v2/driver_compare_scorecard_graph`:
  - no `field`, or `field=` (empty) → the graph of `fico_score`. `driver_current_scorecard_graph`
    answers 400 `"params missing"` here.
  - `field=xyz` or `field=score` → weeks with a scorecard have no `current` value
  - `range=0`, `range=-1` or `range=abc` → only `{ "field": ... }`, no weeks
  - `week_number=202699` → "weeks" `202694` to `202699`
- `GET /lmd/prfsrv/graph/v2/driver_current_scorecard_graph` (no screen uses it, SUG-API-005):
  `field=xyz` or `score` → `-0.01` for every week; `range=0`, `-1` or `abc` → `{}`;
  `week_number=202699` → weeks that do not exist.
- `GET /lmd/prfsrv/call_out/v2/call_out` without `date`, `start` and `end` → a call-out of another
  day. Only `start` or only `end` → 400 `"params missing"`. `date=25-08-2026`, `date=2026-02-30` or
  `date=abc` → empty list.
- `PATCH /lmd/prfsrv/call_out/v2/call_out` with a call-out `_id` that does not exist → 200
  `"CallOut data updated successfully"`, nothing changes. Expected: 404.
- `GET /lmd/prfsrv/rescue/v2/rescue` without `date`, `start` and `end` → 200 `"ok"`, the 3 rescues of
  2026-08-13. Only `start` or only `end` → 400 `"params missing"`.
- `PATCH /lmd/prfsrv/rescue/v2/rescue` with a rescue `_id` that does not exist → 200
  `"Rescue data updated successfully"`, nothing changes. Expected: 404.
- `GET /lmd/prfsrv/scorecard/v2/compare?transporter_id=A3D7TKWA5X4ZCT&week_number=202699` → 200 `"ok"`,
  `{"current": [], "trailing": []}`.
- `GET /lmd/prfsrv/driver_rating/v2/get_driver_rating?driver_id=36363` (no `week_number`), or
  `?week_number=202634` (no `driver_id`) → 200 `{"rating": null}`. Without `driver_id`,
  `get_rating_graph_data` and `get_driver_rating_all` answer 400 `"params missing"`.
- `GET /lmd/prfsrv/driver_rating/v2/get_rating_graph_data?driver_id=36363&week_number=202634` with `range=0`
  or `range=abc` → 200 `{}`; with `range=6&week_number=202699` → "weeks" `202694` to `202699`, each `-0.01`.
- To discuss: `get_driver_rating?driver_id=99999999&week_number=202634` → 200 `{"rating": null}`.
- To discuss: `GET /dashboard/v1/dashboard_data_weekly?compare_with=4` without `week_number` → every
  metric without a value; `dsp_scorecard_graph` without `week_number` → `{}`;
  `driver_compare_scorecard_graph` and `driver_current_scorecard_graph` with `transporter_id=XYZ123`
  → `-0.01` for every week.

</details>

---

## BUG-API-002: A date range that ends before it starts is accepted

|                     |                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------- |
| **Screens**         | Leaderboard (Suspend Driver), Dashboard (Daily Highlights, Your Scorecard), Callouts, Rescue |
| **Severity**        | Medium                                                                                       |
| **Priority**        | P2                                                                                           |
| **Status**          | Open                                                                                         |
| **Found on**        | 2026-09-23 (staging, station DYY1)                                                           |
| **Automated tests** | 13 (see "Where it happens")                                                                  |

**Summary:** a date range must end on or after the day it starts. The dashboard numbers already refuse
a range that ends before it starts. Other parts of the server accept it: they answer with an empty list
that looks normal, and Suspend Driver even saves the suspension.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Riley Thompson (38308).

**Steps to replicate** (example: Suspend Driver)

In the web app (correct):

1. Open **Dashboard → Leaderboard** and find Riley Thompson in the list (use the search box of the
   Leaderboard).
2. Open the row menu of Riley Thompson and click **Suspend Driver**.
3. Choose **From** = 3 days from today and **To** = today.
4. The screen shows "The end date must be equal to or later than the start date" and does not save.

Through the server (the bug):

5. Send the same suspension to the server (see Technical details).
6. Look at the answer, then at the Leaderboard.

**After the test:** resume Riley Thompson (row menu → **Resume Driver**).

**Expected result:** the server refuses the suspension with a clear message, for example "End date must
be the same or after start date." (the message the dashboard already uses).

**Actual result:** the server saves the suspension, and Riley Thompson becomes a suspended driver.

**Business impact:** a wrong date range looks like "there is no data" in lists and reports, so mistakes
are not noticed. A suspension with impossible dates is saved and changes the driver's status.

**Where it happens**

| Screen                                                                                 | What the request had                    | What the server did                                  | Automated test                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard → Leaderboard → Suspend Driver                                               | From = in 3 days, To = today            | saved: the driver becomes suspended                  | `drivers/driver-lifecycle-journeys.spec.js` TC-12                                                                                                                                          |
| Dashboard → Daily Highlights (the write-up report)                                     | from 31 August 2026 to 1 September 2025 | "OK", empty list                                     | `dashboard/dashboard-drivers.spec.js` TC-23                                                                                                                                                |
| Dashboard → Your Scorecard (Smart Insights)                                            | from week 34 back to week 25            | "OK", 9 insights, each with an empty list of drivers | `dashboard/weekly-insights.spec.js` TC-19                                                                                                                                                  |
| Data Management → Callouts                                                             | from 31 August to 1 August 2026         | "OK", empty list                                     | `call-outs/call-out.spec.js` TC-10                                                                                                                                                         |
| Data Management → Rescue                                                               | from 31 August to 1 August 2026         | "OK", empty list                                     | `rescues/rescue.spec.js` TC-06                                                                                                                                                             |
| Graph dashboards that no screen uses: attendance, attendance extras, rescue, Netradyne | from 31 August 2026 to 1 September 2025 | "OK", no drivers and 0 in the graph                  | `graph-data/attendance-dashboard.spec.js` TC-14, `graph-data/attendance-extras.spec.js` TC-14, `graph-data/rescue-dashboard.spec.js` TC-14, `graph-data/netradyne-dashboard.spec.js` TC-14 |
| Graph dashboards that no screen uses: delivery, quality, EOC, e-Mentor                 | from 31 August 2026 to 1 September 2025 | "OK", no drivers and 0 in the graph                  | `graph-data/delivery-dashboard.spec.js` TC-12, `graph-data/quality-dashboard.spec.js` TC-12, `graph-data/eoc-dashboard.spec.js` TC-12, `graph-data/e-mentor-dashboard.spec.js` TC-12       |

**How to check the fix:** run `npx playwright test --grep "BUG-API-002"`. The 13 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-002)` from them.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/prfsrv/suspended/v3/suspend_driver` → 200, saved, the driver is suspended:

  ```json
  {
    "suspend_data": {
      "driver_id": "38308",
      "start": "<today + 3 days, YYYY-MM-DD>",
      "end": "<today, YYYY-MM-DD>",
      "notes": "End before start."
    }
  }
  ```

  Put it back with Resume: `POST /lmd/prfsrv/suspended/v3/suspend_driver/update` with
  `{"driver_id": "38308"}`.

- `GET /dashboard/v1/dashboard_drivers?start=2026-08-31&end=2025-09-01&report_name=writeupReport` →
  200 `"ok"`, empty list.
- `GET /dashboard/v1/weekly_insights?start=202634&end=202625&type=dsp` → 200 `"ok"`, 9 insights with
  empty `ids`.
- `GET /lmd/prfsrv/call_out/v2/call_out?start=2026-08-31&end=2026-08-01` → 200
  `"CallOut data fetched successfully"`, empty list.
- `GET /lmd/prfsrv/rescue/v2/rescue?start=2026-08-31&end=2026-08-01` → 200 `"ok"`, empty list.
- `GET /lmd/prfsrv/graph/v2/<dashboard>?start=2026-08-31&end=2025-09-01` for `attendance_dashboard`,
  `attendance_extras`, `rescue_dashboard`, `netradyne_dashboard`, `delivery_dashboard`,
  `quality_dashboard`, `eoc_dashboard` and `e_mentor_dashboard` → 200 `"success"`, no drivers and 0
  in the graph.
- Correct today: `dashboard_data` and `daily_insights` answer 400
  `"End date must be the same or after start date."`.

</details>

---

## BUG-API-003: Error messages show internal technical text instead of a clear message

|                     |                                                                            |
| ------------------- | -------------------------------------------------------------------------- |
| **Screens**         | Dashboard, Add Driver, Driver page (Edit, Weekly), Callouts, Rescue, login |
| **Severity**        | Medium                                                                     |
| **Priority**        | P3                                                                         |
| **Status**          | Open                                                                       |
| **Found on**        | 2026-09-23 (staging, station DYY1)                                         |
| **Automated tests** | 33 (see "Where it happens")                                                |

**Summary:** when a request has a wrong value (for example a date written as day-month-year, or a text
where a number is needed), the server refuses it. That part is correct. But the message is an internal
technical text, for example `Cast to date failed for value "Invalid Date" ... for model
"rescue_report_staging"`. Users cannot understand it, and it shows internal names of the server and
its database.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate** (example: the Rescue screen)

In the web app (correct):

1. Open **Data Management → Rescue**. The page asks the server for the rescues of the chosen day, with
   the date written as year-month-day (for example 2026-08-13).

Through the server (the bug):

2. Ask for the rescues of the same day, with the date written as day-month-year: 13-08-2026 (see
   Technical details).
3. Read the message in the answer.

**Expected result:** a clear message, like the one the dashboard already gives for a wrong date:
"Invalid start or end date. Expected format: YYYY-MM-DD".

**Actual result:** `Cast to date failed for value "Invalid Date" (type Date) at path "date" for model
"rescue_report_staging"`.

**Business impact:** users, support staff and other apps get messages they cannot understand, so
problems take longer to solve. The messages also show internal names (database tables, and on some
addresses the file paths on the server), which helps an attacker.

**Where it happens**

| Screen                                                                                 | What the request had                                                   | What the server said (short)                                                         | Automated test                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard → Daily Highlights (summary reports)                                         | dates written as day-month-year, or dates that do not exist (month 13) | `Cast to date failed ... for model "e_signature_staging"`                            | `dashboard/dashboard-drivers.spec.js` TC-21, TC-22                                                                                                                                         |
| Dashboard → Your Scorecard                                                             | week "abc" or "2026-34"                                                | `Cast to Number failed ... for model "scorecard_report_v2_staging"`                  | `dashboard/dashboard-data-weekly.spec.js` TC-15, TC-16                                                                                                                                     |
| Dashboard → Your Scorecard (Smart Insights)                                            | week "abc", a date instead of a week, or week 99                       | `Cast to Number failed ... for model "scorecard_report_v2_staging"`                  | `dashboard/weekly-insights.spec.js` TC-14 to TC-16                                                                                                                                         |
| Dashboard → Your Scorecard (graph)                                                     | week "abc"                                                             | `Cast to Number failed for value "NaN" ...`                                          | `graph-data/dsp-scorecard-graph.spec.js` TC-19                                                                                                                                             |
| Driver page → Weekly (graph)                                                           | week "abc" or "2026-34"                                                | `Cast to Number failed for value "NaN" ...`                                          | `graph-data/driver-compare-scorecard-graph.spec.js` TC-18                                                                                                                                  |
| Driver page → Weekly (ScoreCard)                                                       | week "abc"                                                             | `Cast to Number failed ... for model "scorecard_report_v2_staging"`                  | `scorecard/driver-scorecard.spec.js` TC-07                                                                                                                                                 |
| Driver page → Weekly ("Rating: Week 34")                                               | week "abc"                                                             | `Cast to Number failed ... for model "driver_rating_v2_staging"`                     | `scorecard/driver-scorecard.spec.js` TC-13                                                                                                                                                 |
| Driver page → Weekly (POD - Quality Report)                                            | week "abc"                                                             | `Cast to Number failed for value "NaN" ... for model "pod_report_v2_staging"`        | `scorecard/driver-scorecard.spec.js` TC-26                                                                                                                                                 |
| A driver graph that no screen uses                                                     | week "abc" or "2026-34"                                                | `Cast to Number failed for value "NaN" ...`                                          | `graph-data/driver-current-scorecard-graph.spec.js` TC-17                                                                                                                                  |
| Graph dashboards that no screen uses: attendance, attendance extras, rescue, Netradyne | dates written as day-month-year, "abc", or 30 February                 | `Cast to date failed ... for model "call_out_report_staging"` (the name changes)     | `graph-data/attendance-dashboard.spec.js` TC-13, `graph-data/attendance-extras.spec.js` TC-13, `graph-data/rescue-dashboard.spec.js` TC-13, `graph-data/netradyne-dashboard.spec.js` TC-13 |
| Graph dashboards that no screen uses: delivery, quality, EOC, e-Mentor                 | dates written as day-month-year, "abc", or 30 February                 | `Cast to date failed ...`                                                            | `graph-data/delivery-dashboard.spec.js` TC-11, `graph-data/quality-dashboard.spec.js` TC-11, `graph-data/eoc-dashboard.spec.js` TC-11, `graph-data/e-mentor-dashboard.spec.js` TC-11       |
| Dashboard → Leaderboard → Add Driver                                                   | an email without "@", or a phone number with 5 digits                  | the whole technical rule for the email or the phone (a "regular expression")         | `drivers/add-driver.spec.js` TC-20, TC-21                                                                                                                                                  |
| Driver page → Profile → Edit                                                           | an email without "@", or a phone number with 5 digits                  | the whole technical rule for the email or the phone                                  | `drivers/driver-lifecycle.spec.js` TC-14, TC-15                                                                                                                                            |
| Data Management → Callouts (Save)                                                      | a date written as day-month-year (21-09-2026)                          | `call_out_report_staging validation failed: date: Cast to date failed ...`           | `call-outs/call-out.spec.js` TC-16                                                                                                                                                         |
| Data Management → Callouts (Save)                                                      | Excused? = "Maybe" (the screen offers only Yes and No)                 | ``... metrics.excused: `Maybe` is not a valid enum value``                           | `call-outs/call-out.spec.js` TC-17                                                                                                                                                         |
| Data Management → Callouts (Delete)                                                    | a call-out that does not exist                                         | `Cannot read properties of null (reading 'driver_id')`: a program error              | `call-outs/call-out.spec.js` TC-20                                                                                                                                                         |
| Data Management → Rescue                                                               | a date written as day-month-year (13-08-2026)                          | `Cast to date failed ... for model "rescue_report_staging"`                          | `rescues/rescue.spec.js` TC-07                                                                                                                                                             |
| Data Management → Rescue (Save)                                                        | No. of Packages = "abc"                                                | `rescue_report_staging validation failed: ... Cast to Number failed for value "abc"` | `rescues/rescue.spec.js` TC-13                                                                                                                                                             |
| Data Management → Rescue (Save)                                                        | Status = "Maybe" (the screen offers only Completed and Refuse)         | ``... metrics.status: `Maybe` is not a valid enum value``                            | `rescues/rescue.spec.js` TC-14                                                                                                                                                             |
| Data Management → Rescue (Save)                                                        | a date written as day-month-year (21-09-2026)                          | `rescue_report_staging validation failed: date: Cast to date failed ...`             | `rescues/rescue.spec.js` TC-15                                                                                                                                                             |
| Data Management → Rescue (Delete)                                                      | a rescue that does not exist                                           | `Cannot read properties of null (reading 'rescuer_id')`: a program error             | `rescues/rescue.spec.js` TC-18                                                                                                                                                             |
| Login                                                                                  | a broken request (not valid JSON)                                      | `Expected property name or '}' in JSON at position 1 (line 1 column 2)`              | —                                                                                                                                                                                          |
| Any address the server does not know                                                   | for example a graph address without `/lmd/prfsrv` (BUG-API-012)        | 404 with the full server "stack trace" (file paths on the server)                    | —                                                                                                                                                                                          |

**How to check the fix:** run `npx playwright test --grep "BUG-API-003"`. The 33 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-003)` from them. If the developers choose other
clear messages, QA puts the exact message in each test.

<details>
<summary>Technical details (for developers)</summary>

- `GET /dashboard/v1/dashboard_drivers?start=01-09-2025&end=31-08-2026` (and
  `start=2026-02-30&end=2026-13-45`) → `Cast to date failed ... for model "e_signature_staging"`.
- `GET /dashboard/v1/dashboard_data_weekly?week_number=abc` (and `week_number=2026-34`) →
  `Cast to Number failed ... for model "scorecard_report_v2_staging"`.
- `GET /dashboard/v1/weekly_insights?start=abc` (and `start=2026-08-17`, `start=202699`) →
  `Cast to Number failed ... for model "scorecard_report_v2_staging"`.
- `GET /lmd/prfsrv/graph/v2/dsp_scorecard_graph?week_number=abc` →
  `Cast to Number failed for value "NaN" ...`.
- `GET /lmd/prfsrv/graph/v2/driver_compare_scorecard_graph` and `driver_current_scorecard_graph` with
  `week_number=abc` or `week_number=2026-34` → `Cast to Number failed for value "NaN" ... for model
"scorecard_report_v2_staging"`.
- `GET /lmd/prfsrv/graph/v2/<dashboard>` (the 8 graph dashboards) with
  `start=01-09-2025&end=31-08-2026`, `start=abc` or `start=2026-02-30` →
  `Cast to date failed for value "Invalid Date" ... for model "call_out_report_staging"` (the model
  name changes with the report).
- `POST /lmd/usrsrv/drivers/v1/driver` (Add Driver) with `email=jordan.whitaker.qa` or `phone=55501` →
  `"email" with value "..." fails to match the required pattern: /^(?=.{1,254}$)...$/`.
- `PATCH /lmd/usrsrv/drivers/v1/driver/<id>` (Edit driver) with `email=riley.thompson.qa` or
  `phone=55501` → `"phone" with value "55501" fails to match the required pattern: /^\+?\d{10,12}$/`.
- `POST /lmd/prfsrv/call_out/v2/call_out` with `date=21-09-2026` →
  `call_out_report_staging validation failed: date: Cast to date failed for value "21-09-2026"`; with
  `excused=Maybe` →
  ``call_out_report_staging validation failed: metrics.excused: `Maybe` is not a valid enum value``.
- `DELETE /lmd/prfsrv/call_out/v2/call_out` with a call-out `_id` that does not exist →
  `Cannot read properties of null (reading 'driver_id')`. Expected: 404.
- `GET /lmd/prfsrv/rescue/v2/rescue?date=13-08-2026` →
  `Cast to date failed for value "Invalid Date" (type Date) at path "date" for model "rescue_report_staging"`.
- `POST /lmd/prfsrv/rescue/v2/rescue` with `number_of_packages=abc` →
  `rescue_report_staging validation failed: metrics.number_of_packages: Cast to Number failed for value "abc"`;
  with `status=Maybe` →
  ``rescue_report_staging validation failed: metrics.status: `Maybe` is not a valid enum value``; with
  `date=21-09-2026` →
  `rescue_report_staging validation failed: date: Cast to date failed for value "Invalid Date"`.
- `DELETE /lmd/prfsrv/rescue/v2/rescue` with a rescue `_id` that does not exist →
  `Cannot read properties of null (reading 'rescuer_id')`. Expected: 404.
- `GET /lmd/prfsrv/scorecard/v2/compare?transporter_id=A3D7TKWA5X4ZCT&week_number=abc` →
  `Cast to Number failed for value "abc" (type string) at path "week_number" for model "scorecard_report_v2_staging"`.
- `GET /lmd/prfsrv/driver_rating/v2/get_driver_rating?driver_id=36363&week_number=abc` →
  `Cast to Number failed for value "abc" (type string) at path "week_number" for model "driver_rating_v2_staging"`.
- `GET /lmd/prfsrv/pod/v2/pod_report?week_number=abc&transporter_id=A3D7TKWA5X4ZCT` →
  `Cast to Number failed for value "NaN" (type number) at path "week_number" for model "pod_report_v2_staging"`.
- `POST /lmd/usrsrv/users/v1/user/perf_login` with the body `{bad json` →
  `Expected property name or '}' in JSON at position 1 (line 1 column 2)`.
- Any unknown path, for example `/graph/v2/...` without `/lmd/prfsrv`, or a wrong method on a
  users-service address (`GET /lmd/usrsrv/drivers/v1/driver`) → 404 with `error.stack`
  (`at /usr/src/app/dist/app.js:232:13`, `node_modules/express/...`).

</details>

---

## BUG-API-004: Your Scorecard: the weekly insights of a week without data give a program error

|                     |                                                  |
| ------------------- | ------------------------------------------------ |
| **Screen**          | Dashboard → Your Scorecard (Smart Insights)      |
| **Severity**        | Medium                                           |
| **Priority**        | P2                                               |
| **Status**          | Open                                             |
| **Found on**        | 2026-09-23 (staging, station DYY1)               |
| **Automated tests** | `dashboard/weekly-insights.spec.js` TC-17, TC-18 |

**Summary:** the Smart Insights on **Your Scorecard** come from the weekly insights of the server. For
a week that has no scorecard (for example week 1 of 2026, or a week in the future), the server should
answer "no data". Instead it fails with a program error.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

In the web app:

1. Open **Dashboard → Your Scorecard**. The page shows the Smart Insights of the chosen week (for
   example Week 34). To get them, it asks the server for the weekly insights of that week.

Through the server (the bug):

2. Ask for the weekly insights of week 1 of 2026, a week without a scorecard (see Technical details).
3. Read the answer.

**Expected result:** an empty list, or a clear message such as "No data found for the specified week"
(the message that the numbers of Your Scorecard already use).

**Actual result:** the request is refused with a program error: `Cannot read properties of undefined
(reading 'metrics')`. The same happens for a week in the future.

**Business impact:** "no data" is a normal case: a new station, a week before the first upload, or a
future week. The server cannot handle it, so a screen or report that asks for such a week gets an error
instead of "no data".

**How to check the fix:** run `npx playwright test --grep "BUG-API-004"`. The 2 tests pass when the bug
is fixed. Then QA removes `@knownbug` and `(BUG-API-004)` from them and checks the agreed answer.

<details>
<summary>Technical details (for developers)</summary>

- `GET /dashboard/v1/weekly_insights?start=202601&end=202601&type=dsp` (a valid week without a
  scorecard) → 400 `"Cannot read properties of undefined (reading 'metrics')"`.
- `GET /dashboard/v1/weekly_insights?start=203001&end=203001&type=dsp` (a future week) → the same.
- `dashboard_data_weekly` answers `"No data found for the specified week"` in this case.

</details>

---

## BUG-API-005: The same information comes in two different forms

|                     |                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Screens**         | Driver page (E-Signature, Weekly, Driver Rating History), Dashboard, Callouts, Rescue, Set Threshold                              |
| **Severity**        | Low                                                                                                                               |
| **Priority**        | P3                                                                                                                                |
| **Status**          | Open                                                                                                                              |
| **Found on**        | 2026-09-23 (staging, station DYY1)                                                                                                |
| **Automated tests** | `e-signature/acknowledgement-journeys.spec.js` TC-03, `scorecard/driver-scorecard-journeys.spec.js` TC-06, and 7 structure checks |

**Summary:** the same piece of information does not always come in the same form. An acknowledgement
is called "ack" in one answer and "acknowledgement" in another. A driver number is sometimes a number
(38267) and sometimes a text ("38267"). A week without a rating is `null`, `-0.01` or "N/A", depending on the screen. Every app, report or export that reads this data must handle
both forms, or it misses records.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Jordan Whitaker (38267).

**Steps to replicate** (example: an acknowledgement)

1. Open the Driver page of Jordan Whitaker → **E-Signature**.
2. Click **Add Report**, choose Report Type **Acknowledgement**, fill in the details and send it.
3. Press **F12** → **Network** and reload the page. In the answer of the request **get_report** (the
   list of reports), the type of the new report is "acknowledgement".
4. Click **View** on the new report. In the answer of the request that opens it, the type is "ack".

**After the test:** delete the acknowledgement (possible while it is not signed).

**Expected result:** the same name in every answer (the developers choose one).

**Actual result:** "ack" when the acknowledgement is sent and when it is opened, "acknowledgement" in
the list of reports.

**Business impact:** a filter, count or export that looks for one form misses the records with the
other form. For example, a report that counts "acknowledgement" does not count the ones called "ack".

**Where it happens**

| Screen                                         | Information                       | The two forms                                                                                                             | Automated test                                            |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Driver page → E-Signature                      | the type of an acknowledgement    | "ack" when it is sent and opened, "acknowledgement" in the list                                                           | `e-signature/acknowledgement-journeys.spec.js` TC-03      |
| Dashboard → Daily Highlights                   | the change of the call-out number | a text ("-11.00"), while every other change is a number                                                                   | structure check `schemas/dashboard-data.schema.js`        |
| Dashboard → Your Scorecard                     | the week                          | a number (202634), or a text ("202634") when a week is chosen                                                             | structure check `schemas/dashboard-data-weekly.schema.js` |
| Dashboard → Daily Highlights (insights)        | the drivers of an insight         | numbers for the station's insights, texts for the drivers' insights                                                       | structure check `schemas/daily-insights.schema.js`        |
| Data Management → Callouts                     | the driver number                 | a number in the answer, a text when the web app saves a call-out                                                          | structure check `schemas/call-out-list.schema.js`         |
| Data Management → Rescue                       | the rescuer and receiver numbers  | numbers in the answer, texts when the web app saves a rescue                                                              | structure check `schemas/rescue-list.schema.js`           |
| Settings → Set Threshold → Scorecard           | the target values                 | a text ("800") for most metrics, a number (0, 3900) for some                                                              | structure check `schemas/thresholds.schema.js`            |
| Driver page → Weekly and Driver Rating History | a week without a rating           | `null` on the Weekly tab, `-0.01` in "View all week's ratings", "N/A" in the Driver Rating History and the ratings report | `scorecard/driver-scorecard-journeys.spec.js` TC-06       |
| Driver page → Weekly (ScoreCard)               | the week of the answer            | a number (202634) when no week is asked, a text ("202634") when a week is asked                                           | structure check `schemas/driver-scorecard.schema.js`      |

The structure checks accept both forms today, and have a note with this bug ID, so they pass.

**How to check the fix:** run `npx playwright test --grep "BUG-API-005"`. The 2 tests (the acknowledgement
type and "no rating") pass when each piece of information has one form. Then QA removes `@knownbug` and
`(BUG-API-005)` from them, and changes the check of `scorecard/driver-scorecard.spec.js` TC-10 (today
`null`) to the agreed form. For the other rows, QA sets the agreed form in each structure check and
removes the note.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/prfsrv/e-signature/v2/create` with `report_type: "ack"` → the answer has
  `report_type: "ack"`; `GET /lmd/prfsrv/e-signature/v1/<id>` → `"ack"`;
  `GET /lmd/prfsrv/e-signature/v1/get_report?driver_id=38267&station_id=541` → `"acknowledgement"`.
- `GET /dashboard/v1/dashboard_data`: `team.callouts.change` is text (`"-11.00"`); every other
  `change` is a number.
- `GET /dashboard/v1/dashboard_data_weekly`: `week` is the number `202634` without parameters, and
  the text `"202634"` with `week_number`.
- `GET /dashboard/v1/daily_insights`: `ids` are numbers (`[36211, ...]`) with `type=dsp`, texts
  (`["36190"]`) with `type=drivers`.
- `GET /lmd/prfsrv/call_out/v2/call_out`: `driver_id` is a number (`38267`); the web app sends text
  (`"38267"`) when it saves; the Leaderboard and write-ups use text.
- `GET /lmd/prfsrv/rescue/v2/rescue`: `caller_id` and `rescuer_id` are numbers; the web app sends text
  when it saves.
- `GET /lmd/prfsrv/threshold/v3/threshold/weekly`: `threshold[].values[].value` is text for most
  metrics and a number for some, for example `following_distance_rate` (`0`) and `dc_dpmo` (`3900`).
- A week without a rating (driver 36363, week 33): `get_driver_rating` → `{"rating": null}`;
  `get_rating_graph_data` → `"202633": -0.01`; `get_driver_rating_all` →
  `{"year": "2026", "week": "33", "rating": "N/A"}`; `get_ratings_report` → `"Week 33": "N/A"`.
- `GET /lmd/prfsrv/scorecard/v2/compare`: the `week_number` of the answer is the number `202634` without
  `week_number` in the request, and the text `"202634"` with it.

</details>

---

## BUG-API-006: Leaderboard: no driver has rank 1 (the ranking starts at 2)

|                     |                                                   |
| ------------------- | ------------------------------------------------- |
| **Screen**          | Dashboard → Leaderboard                           |
| **Severity**        | Medium                                            |
| **Priority**        | P2                                                |
| **Status**          | Open                                              |
| **Found on**        | 2026-09-24 (staging, station DYY1)                |
| **Automated tests** | `leaderboard/leaderboard-dashboard.spec.js` TC-10 |

**Summary:** the driver with the best rating should have rank 1 (a gold medal). Today no driver has
rank 1: the two drivers with a rating have rank 2 and rank 3.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open **Dashboard → Leaderboard**.
2. Look at the **Rank** and **Rating** columns of the drivers with a rating (8.99 and 8.89).
3. Look at the **Smart Insights** at the top of the page.

**Expected result:** the driver with the best rating (8.99) has rank 1 and a gold medal, and the next
driver (8.89) has rank 2.

**Actual result:** the driver with 8.99 has rank 2 (a silver medal) and the driver with 8.89 has rank
3 (a bronze medal). No driver has rank 1, active or inactive. The Smart Insights also only talk about
ranks 2 and 3.

**Business impact:** the ranking is wrong: the best driver looks like number 2. Rewards, recognition
or coaching that use the ranking can be unfair.

**How to check the fix:** run `npx playwright test --grep "BUG-API-006"`. The test passes when a
driver has rank 1. Then QA removes `@knownbug` and `(BUG-API-006)` from it.

<details>
<summary>Technical details (for developers)</summary>

- `GET /lmd/prfsrv/compare/v3/dashboard` → only 2 drivers have a `rank`: `2` (rating 8.99) and `3`
  (rating 8.89). No driver has `rank: 1`.
- The Smart Insights come from `GET /lmd/prfsrv/compare/v3/insights`.

</details>

---

## BUG-API-007: Leaderboard: the Overall Standing column is empty for every driver

|                     |                                    |
| ------------------- | ---------------------------------- |
| **Screen**          | Dashboard → Leaderboard            |
| **Severity**        | Medium                             |
| **Priority**        | P3                                 |
| **Status**          | To confirm                         |
| **Found on**        | 2026-09-24 (staging, station DYY1) |
| **Automated tests** | none yet                           |

**Summary:** the **Overall Standing** column of the Leaderboard is empty for every driver, even for
drivers who have a weekly scorecard.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open **Dashboard → Leaderboard**.
2. Look at the **Overall Standing** column.

**Expected result:** drivers with a weekly scorecard show their standing, for example "Fantastic".

**Actual result:** the column is empty for every driver. The server sends an empty standing for all
of them, even for the 11 drivers who are in the scorecard insights of week 34.

**Question for the developers:** where should the standing come from? If it comes from the weekly
scorecard, this is a bug.

**Business impact:** managers cannot see at a glance how each driver is doing on the scorecard.

**How to check the fix:** QA adds a test that at least one driver has an overall standing.

<details>
<summary>Technical details (for developers)</summary>

- `GET /lmd/prfsrv/compare/v3/dashboard` → `overall_standing` is `""` for every driver.
- 11 of these drivers are in the week 34 scorecard insights (matched by transporter ID), so scorecard
  data exists for them.

</details>

---

## BUG-API-008: Leaderboard: the server sends drivers' personal data that the page does not show

|                     |                                    |
| ------------------- | ---------------------------------- |
| **Screen**          | Dashboard → Leaderboard            |
| **Severity**        | Medium                             |
| **Priority**        | P2                                 |
| **Status**          | To discuss                         |
| **Found on**        | 2026-09-24 (staging, station DYY1) |
| **Automated tests** | none yet                           |

**Summary:** to show the Leaderboard, the server sends every driver's phone number and email, and for
some drivers the address and date of birth. The page does not show these details, but every browser
that opens the Leaderboard receives them.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open **Dashboard → Leaderboard**.
2. Press **F12** → **Network** and reload the page. Click the request **dashboard** (its address ends
   with `compare/v3/dashboard`).
3. Open **Response** (or **Preview**) and open one driver.

**Expected result:** the answer has only what the Leaderboard shows: name, rank, rating, overall
standing, infractions, write-ups, call-outs and status.

**Actual result:** every driver also has a phone number and an email. Some drivers also have an
address and a date of birth. All have the hire date, the work anniversary and station settings.

**Business impact:** personal data reaches every browser that opens the Leaderboard, even though the
page does not need it. This is a data-protection risk: if a manager's account or computer is misused,
the personal data of all drivers is exposed.

**To discuss:** the developers and the product owner agree which details the Leaderboard needs.

**How to check the fix:** QA adds a structure check that these details are no longer in the answer.

<details>
<summary>Technical details (for developers)</summary>

- `GET /lmd/prfsrv/compare/v3/dashboard` → every driver has `phone` and `email`; some have `address`
  and `date_of_birth`; all have `hire_date`, `work_anniversary` and station settings.
- Known as "excessive data exposure" (OWASP API Security Top 10).

</details>

---

## BUG-API-009: Your Scorecard: bad-news insights are marked as good news

|                     |                                             |
| ------------------- | ------------------------------------------- |
| **Screen**          | Dashboard → Your Scorecard (Smart Insights) |
| **Severity**        | Medium                                      |
| **Priority**        | P3                                          |
| **Status**          | To discuss                                  |
| **Found on**        | 2026-09-23 (staging, station DYY1)          |
| **Automated tests** | none yet                                    |

**Summary:** each weekly insight has a label that says if it is good news or bad news. All insights of
week 34 have the label "positive" (good news), also the 4 that are bad news ("... Threshold
Breached"). The web app still shows the right colours, because it uses another part of the answer.
But any other app or report that uses the label counts no problems at all.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open **Dashboard → Your Scorecard** and choose Week 34.
2. Look at the **Smart Insights**: some are green ("... Stable") and some are red ("... Threshold
   Breached", for example "Speeding Event Rate Threshold Breached").
3. Press **F12** → **Network** and reload the page. Click the request **weekly_insights** and open
   **Response**.

**Expected result:** bad news has a bad-news label, as in the daily insights ("rise" for "Most
Write-Ups").

**Actual result:** all 9 insights of week 34 have the label "positive": the 5 green ones and the 4 red
ones.

**Business impact:** an app, report or alert that counts problems with this label misses every
breached threshold.

**To discuss:** the developers and the product owner agree which labels to use.

**How to check the fix:** QA adds a test for the agreed labels.

<details>
<summary>Technical details (for developers)</summary>

- `GET /dashboard/v1/weekly_insights?start=202634&end=202634&type=dsp` → all 9 insights have
  `type: "positive"`; 4 of them have a red `color` and "Threshold Breached" in the text.
- `daily_insights` uses `positive` and `rise`. The web app uses `color`, so it shows the right icon.

</details>

---

## BUG-API-010: Your Scorecard: the weekly insights for drivers are always empty

|                     |                                    |
| ------------------- | ---------------------------------- |
| **Screen**          | Dashboard → Your Scorecard         |
| **Severity**        | Low                                |
| **Priority**        | P3                                 |
| **Status**          | To confirm                         |
| **Found on**        | 2026-09-23 (staging, station DYY1) |
| **Automated tests** | none yet                           |

**Summary:** the server has weekly insights for the station and for drivers. The Your Scorecard page
asks for the driver insights when a manager opens the details of a metric. The driver insights are
always empty, for every metric, even for 10 weeks for which the station has 18 insights.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open **Dashboard → Your Scorecard**, choose Week 34 and **Compare with 10 Weeks**.
2. Open the details of a metric, for example **Seatbelt Off Rate**.
3. Press **F12** → **Network** and open the answer of the request **weekly_insights** with
   `type=driver`.

**Expected result:** the driver insights for the metric, if there are any.

**Actual result:** an empty list, for all 12 metrics the web app uses. A metric name that does not
exist also gives an empty list, so a correct request cannot be told apart from a wrong one.

**Question for the developers:** do the driver insights work, or has the test station no driver
insights?

**Business impact:** if the driver insights do not work, managers do not see which drivers cause a
change in a metric.

**How to check the fix:** after the developers' answer, QA adds tests for the driver insights.

<details>
<summary>Technical details (for developers)</summary>

- `GET /dashboard/v1/weekly_insights?start=202625&end=202634&type=driver&report_name=seatbelt_off_rate_(per_trip)`
  → 200, empty list. The same for the other report names the web app uses, for example `pod`,
  `packages_delivered` and `dnr`.
- `type=dsp` for the same weeks → 18 insights.
- An unknown `report_name` → also 200 and an empty list.

</details>

---

## BUG-API-011: Swagger: the manual lists wrong request details for several addresses

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| **Screen**          | Swagger (<https://staging-api.fleet.lmdmax.com/api-docs/>) |
| **Severity**        | High                                                       |
| **Priority**        | P1                                                         |
| **Status**          | Open                                                       |
| **Found on**        | 2026-09-23 (staging)                                       |
| **Automated tests** | none (it is a document)                                    |

**Summary:** Swagger is the manual of the server. For several addresses, it lists other names or
formats than the ones the server reads and the web app sends. Anybody who follows the manual gets
empty dashboards or errors.

**Before you start:** open Swagger and click **Authorize** (fill `x-access-token` and `x-access-user`,
see [How to replicate a bug](#how-to-replicate-a-bug)).

**Steps to replicate** (example: the dashboard numbers)

1. In Swagger, open **dashboard_data** and click **Try it out**. Swagger asks for `start_date` and
   `end_date`.
2. Fill in 2025-09-01 and 2026-08-31 and click **Execute**.
3. Compare with the web app: **Dashboard → Daily Highlights** sends `start` and `end` instead.

**Expected result:** Swagger shows the names the server reads, so its example gives the real numbers.

**Actual result:** the server ignores `start_date` and `end_date` and answers "OK" with every number at 0. With `start` and `end`, the same dates give the real numbers (for example 100 write-ups).

**Business impact:** anybody who builds an integration or a report from the manual gets wrong or empty
data. It also misled the first version of our own tests.

**How to check the fix:** open Swagger and repeat the steps for each row in Technical details.

<details>
<summary>Technical details (for developers)</summary>

| Address                                                                                | Swagger says                                                                                                 | The server reads (the web app sends)                                                                                                                             | What happens with Swagger's version                                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard/v1/dashboard_data`                                                         | `start_date`, `end_date`                                                                                     | `start`, `end`                                                                                                                                                   | 200 with every total `0` (ignored); real: 100 write-ups                                                                                   |
| `/dashboard/v1/dashboard_drivers`                                                      | `week_start`, `week_end`                                                                                     | `start`, `end`                                                                                                                                                   | 400 `"start and end are required for daily reports"`                                                                                      |
| `/dashboard/v1/weekly_insights`                                                        | `start`, `end` as dates (`YYYY-MM-DD`)                                                                       | `start`, `end` as weeks (`YYYYWW`, for example `202634`)                                                                                                         | 400 with an internal error (BUG-API-003)                                                                                                  |
| `/dashboard/v1/dashboard_data_weekly`                                                  | `compare_with`: "Compare with week"                                                                          | a number of weeks: `4`, `6`, `8` or `10`                                                                                                                         | a week number is read as a number of weeks                                                                                                |
| `/graph/v2/dsp_scorecard_graph`                                                        | example `field=score`, `week_number=42`, `start`/`end` dates                                                 | metric keys (for example `safety_and_compliance`), `YYYYWW`, no dates                                                                                            | "no data" or empty; dates return one unrelated week                                                                                       |
| `/graph/v2/driver_compare_scorecard_graph`, `/graph/v2/driver_current_scorecard_graph` | `transporter_id` is a number (example `12345`); example `field=score`, `week_number=42`, `start`/`end` dates | `transporter_id` is the Amazon transporter ID (text); `field` is a driver scorecard metric (for example `delivered`, `pod`); `week_number` is `YYYYWW`; no dates | no values: compare returns "weeks" `33` to `42` (no year), current returns one unrelated week; dates alone also return one unrelated week |

Question: the `dashboard_drivers` message says "daily reports". Are there weekly reports that use
`week_start` / `week_end`? The web app sends none.

</details>

---

## BUG-API-012: Swagger: "Try it out" fails for the graph and Leaderboard addresses

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| **Screen**          | Swagger (<https://staging-api.fleet.lmdmax.com/api-docs/>) |
| **Severity**        | Medium                                                     |
| **Priority**        | P2                                                         |
| **Status**          | Open                                                       |
| **Found on**        | 2026-09-23 (staging)                                       |
| **Automated tests** | none (it is a document)                                    |

**Summary:** in Swagger, "Try it out" answers "Not Found" for all 11 graph addresses and for the
Leaderboard addresses. The addresses work, but only with `/lmd/prfsrv` in front, and Swagger does not
add it.

**Before you start:** open Swagger and click **Authorize** (fill both fields).

**Steps to replicate**

1. In Swagger, open a graph address, for example `/graph/v2/dsp_scorecard_graph`.
2. Click **Try it out**, fill in the example values and click **Execute**.

**Expected result:** Swagger reaches the server and shows its answer.

**Actual result:** 404 "Not Found". The answer also contains the server's internal "stack trace"
(BUG-API-003). The same request with `/lmd/prfsrv` in front of the address works.

**Business impact:** these addresses cannot be tried in Swagger at all, so developers and testers
cannot use the manual for them.

**How to check the fix:** repeat the steps in Swagger. (`api/endpoints.js` in this project already
uses the working addresses.)

<details>
<summary>Technical details (for developers)</summary>

- Swagger has no server prefix. `/dashboard/v1/...` works with or without `/lmd/prfsrv`, but the 11
  "Graph Data" addresses (`/graph/v2/...`) and `/compare/v3/...` only work **with** it (checked for
  each address on 2026-09-24). Without it:

  ```
  404 {"success": false, "message": "Not Found", "service_name": "users", "error": {"stack": "..."}}
  ```

</details>

---

## BUG-API-013: Swagger: many addresses the web app uses are missing or not explained

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| **Screen**          | Swagger (<https://staging-api.fleet.lmdmax.com/api-docs/>) |
| **Severity**        | Low                                                        |
| **Priority**        | P3                                                         |
| **Status**          | Open                                                       |
| **Found on**        | 2026-09-23 (staging)                                       |
| **Automated tests** | none (it is a document)                                    |

**Summary:** Swagger should list every server address the web app uses, the values each detail can
have, and what the server answers. Many addresses are missing (for example the login, the Leaderboard
and the whole E-Signature flow), and for others the allowed values and the answer are not described.

**Before you start:** open Swagger.

**Steps to replicate**

1. Search Swagger for the login address `perf_login`: it is not there.
2. Search for the Leaderboard address `/compare/v3/dashboard`: only the older `/compare/v2/...` is
   there.
3. Open `dashboard_drivers`: the list of report names (for example `rescueReport`) is not there.

**Expected result:** every address the web app uses is in Swagger, with the allowed values and the
answer.

**Actual result:** the addresses and details in Technical details are missing.

**Business impact:** nobody can use the server correctly from Swagger alone. We had to read the web
app's code to find the right values, which costs time for every new developer, tester or integration.

**How to check the fix:** open Swagger and check each row in Technical details.

<details>
<summary>Technical details (for developers)</summary>

| Address                                                                 | Missing in Swagger                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/lmd/usrsrv/users/v1/user/perf_login`                                  | the whole address (no login in Swagger)                                                                                                                                                                                                                                                   |
| `/compare/v3/dashboard`, `/compare/v3/insights`                         | the whole addresses (Swagger only has the older `/compare/v2/...`)                                                                                                                                                                                                                        |
| `/dashboard/v1/dashboard_drivers`                                       | the valid `report_name` values (`callOutReport`, `workingDeviceReport`, `rescueReport`, `deliveryConcessions`, `qualityReport`, `deliveryReport`, `writeupReport`); the answer (`message` is `"ok"`, not `"Drivers data retrieved successfully"`)                                         |
| `/dashboard/v1/daily_insights`                                          | the `type` values (`dsp`, `drivers`); the `report_name` detail; the answer                                                                                                                                                                                                                |
| `/dashboard/v1/weekly_insights`                                         | the `type` values (`dsp`, `driver`); the `report_name` detail; the answer                                                                                                                                                                                                                 |
| `/dashboard/v1/dashboard_data_weekly`                                   | the answer (sections of `{ key, value }`; with `compare_with`: `{ key, value, change, color }`); the hidden `start` / `end` week range, which returns an internal query as `week`                                                                                                         |
| `/graph/v2/dsp_scorecard_graph`                                         | the answer: one value per week, text or `-0.01` for "no data"                                                                                                                                                                                                                             |
| `/graph/v2/driver_compare_scorecard_graph`                              | the valid `field` values (the metrics of the driver's scorecard, for example `s_no`, `delivered`, `pod`, `dsb_count`); the answer: `{ current, trailing }` per week, text or `-0.01` for "no data", and `field` inside `data`                                                             |
| `/graph/v2/driver_current_scorecard_graph`                              | the valid `field` values (as for the compare graph); the answer: one value per week, text or `-0.01` for "no data"                                                                                                                                                                        |
| The 8 dashboards `/graph/v2/*_dashboard`, `/graph/v2/attendance_extras` | the fields of a `driver_data` row and of a `graph_data` item (`label`, `value`, `color`; the Total item has no `color`); the real `action` values differ from Swagger's examples (for example attendance: `get_daily_attendance_dashboard` in Swagger, `get_latest_safety` in the answer) |
| `/e-signature/v1/...`, `/e-signature/v2/...`                            | the whole E-Signature flow the web app uses for write-ups and acknowledgements (send, update, re-send, list, delete, the driver's sign and refuse). Swagger only has the older `/writeup/...` and `/acknowledgement/...` addresses                                                        |

</details>

---

## BUG-API-014: Spelling mistakes in texts from the server

|                     |                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Screens**         | Graphs, E-Signature (driver's link), Driver page (Weekly, Timeline)                 |
| **Severity**        | Low                                                                                 |
| **Priority**        | P4                                                                                  |
| **Status**          | Open                                                                                |
| **Found on**        | 2026-09-24 (staging, station DYY1)                                                  |
| **Automated tests** | `graph-data/quality-dashboard.spec.js` TC-13, `login/forgot-password.spec.js` TC-09 |

**Summary:** some texts that the server sends have spelling mistakes. Any screen, report or export
that shows these texts shows the mistake.

**Before you start:** nothing special (see the table below).

**Steps to replicate**

1. Run the automated test (see How to check the fix), or read the answers in Technical details.
2. Compare each text with the correct text:

| Where the text comes from                                      | Text from the server                       | Correct text                 |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| The quality graph (no screen uses it today)                    | "Total Delievered Packages"                | "Total Delivered Packages"   |
| The driver signs a write-up (the driver's link)                | "File sucessfully uploaded"                | "File successfully uploaded" |
| Driver page → Timeline (the name of a part of the answer)      | `upadated_by_name`                         | `updated_by_name`            |
| Driver page → Weekly ("Rating: Week 34", a part of the answer) | `"action": "dirver_rating"`                | `"driver_rating"`            |
| An address of the web app for driver ratings                   | `driver_rating/v2/update_rating_permisson` | `update_rating_permission`   |
| Forgot Password → a wrong OTP (found 2026-11-02)               | "Invalid OTP" (two spaces)                 | "Invalid OTP"                |

**Expected result:** the texts are spelled correctly.

**Actual result:** the texts have the spelling mistakes shown in the table.

**Business impact:** small, but users notice spelling mistakes, and they make the product look less
careful. A part of an answer with a wrong name must keep the wrong name in every app that reads it.

**How to check the fix:** run `npx playwright test --grep "BUG-API-014"`. The tests pass when the
graph label and the OTP message are fixed. Then QA removes `@knownbug` and `(BUG-API-014)` from it, and updates
`schemas/driver-timeline.schema.js` for the timeline name.

<details>
<summary>Technical details (for developers)</summary>

- `GET /lmd/prfsrv/graph/v2/quality_dashboard` → the graph label `"Total Delievered Packages"`.
- `POST /lmd/prfsrv/e-signature/v1/sign_form` (the driver signs) → the message
  `"File sucessfully uploaded"`.
- `GET /lmd/prfsrv/driver_timeline/v3/get_timeline` → the field name `upadated_by_name` (noted in
  `schemas/driver-timeline.schema.js`).
- `GET /lmd/prfsrv/driver_rating/v2/get_driver_rating` → `"action": "dirver_rating"`.
- The web app calls `driver_rating/v2/update_rating_permisson` (found in the web app's code; the tests do not
  call it, because it changes a setting).
- `POST /lmd/usrsrv/users/v1/user/credentials/verify` and `.../credentials/reset` with a wrong OTP → 401
  `"Invalid  OTP"` (two spaces).

</details>

---

## BUG-API-015: The server saves wrong data that the screens do not allow

|                     |                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| **Screens**         | Leaderboard (Add Driver, status switch), Driver page (Edit, E-Signature), Callouts, Set Threshold |
| **Severity**        | High                                                                                              |
| **Priority**        | P2                                                                                                |
| **Status**          | Open                                                                                              |
| **Found on**        | 2026-09-24 (staging, station DYY1)                                                                |
| **Automated tests** | 8 (see "Where it happens")                                                                        |

**Summary:** the screens check what a manager enters: for example, a driver needs a transporter ID, a
driver name can have at most 35 characters, and a threshold cannot be empty. The server does not
repeat these checks. So data that comes from anywhere else (another app, an import, a script) is
saved even when it is wrong, and in one case the server fails.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate** (example: Set Threshold)

In the web app (correct):

1. Open **Settings → Set Threshold → Scorecard**.
2. Clear the **Fico Score** value. (The page saves every change at once.)
3. The page shows "Threshold Value Can Not Be Empty" and does not save.

Through the server (the bug):

4. Save the Scorecard thresholds with an empty Fico Score value (see Technical details).
5. Open **Settings → Set Threshold → Scorecard** again.

**After the test:** put the Fico Score value back (800).

**Expected result:** the server refuses the empty value with a clear message, like the screen does.

**Actual result:** the server saves it ("Success"). The Scorecard has no Fico Score target any more.

**Business impact:** wrong data gets into the station: drivers without a transporter ID (no scorecard
can ever match them), drivers with a status that no list shows, call-outs on the wrong day or for a
driver who does not exist (they change the dashboard numbers), and a Scorecard without a target. A
driver cannot be deleted, so a wrongly saved driver stays (it can only be deactivated).

**Where it happens**

| Screen                               | What the request had                                            | What the server did                                                                                              | Automated test                                    |
| ------------------------------------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Leaderboard → Add Driver             | no transporter ID (the form requires it)                        | saved: no scorecard can ever match this driver                                                                   | `drivers/add-driver.spec.js` TC-16                |
| Leaderboard → Add Driver             | status "xyz"                                                    | saved: the profile shows "Xyz", and the driver is in neither the Active nor the Inactive list of the Leaderboard | `drivers/add-driver.spec.js` TC-17                |
| Leaderboard → Add Driver             | a name of 36 characters (the form allows 35)                    | saved                                                                                                            | `drivers/add-driver.spec.js` TC-18                |
| Leaderboard → Add Driver             | a station the manager cannot open                               | a server error (500 "something went wrong")                                                                      | `drivers/add-driver.spec.js` TC-19                |
| Leaderboard → status switch          | status "xyz"                                                    | saved: the driver's status becomes "xyz"                                                                         | `drivers/driver-lifecycle-journeys.spec.js` TC-08 |
| Driver page → Profile → Edit         | a name of 36 characters (the form allows 35)                    | saved                                                                                                            | `drivers/driver-lifecycle-journeys.spec.js` TC-09 |
| Settings → Set Threshold → Scorecard | an empty Fico Score value                                       | saved: the Scorecard has no Fico Score target                                                                    | `settings/threshold-journeys.spec.js` TC-02       |
| Settings → Set Threshold → Scorecard | a Fico Score value that is not a number ("abc")                 | saved                                                                                                            | `settings/threshold-journeys.spec.js` TC-03       |
| Driver page → E-Signature (Send)     | a write-up without a type (the form requires "Select Type")     | saved and sent to the driver                                                                                     | —                                                 |
| Driver page → E-Signature (Send)     | a driver who does not exist                                     | "Success": the write-up is saved; only a small note in the answer says "Driver not found" (no SMS)               | —                                                 |
| Data Management → Callouts (Save)    | a call-out type that is not in the station's list ("Jury Duty") | saved                                                                                                            | —                                                 |
| Data Management → Callouts (Save)    | a reason of 251 characters (the screen allows 250)              | saved                                                                                                            | —                                                 |
| Data Management → Callouts (Save)    | a driver who does not exist                                     | saved, and counted on the dashboard of that day                                                                  | —                                                 |
| Data Management → Callouts (Save)    | a day that does not exist (30 February)                         | saved on another day (2 March)                                                                                   | —                                                 |

Why some rows have no test: a test would save a write-up on every run (it cannot be deleted once
signed), and staging went down twice while call-out tests ran (ENV-005). QA adds these tests once the
server refuses these inputs, or once the cause of the outages is known. The Add Driver tests send the
details of an existing driver, so they get "already exists" and save nothing while the bug is open;
the other tests put the data back right after the request.

**How to check the fix:** run `npx playwright test --grep "BUG-API-015"`. The 8 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-015)` from them, and adds tests for the rows
without a test.

<details>
<summary>Technical details (for developers)</summary>

- Set Threshold: `POST /lmd/prfsrv/threshold/v3/threshold` with the web app's body (all 15 metrics
  of the Scorecard), where `fico_score` has `"values": [{"value": ""}, {"value": ""}]` (or `"abc"`)
  → 200 `"Success"`:

  ```json
  {
    "data": {
      "type": "weekly",
      "fields": {
        "threshold": [
          {
            "field": "fico_score",
            "enable": true,
            "order": "normal",
            "values": [{ "value": "" }, { "value": "" }]
          },
          "... the other 14 metrics as they are ..."
        ]
      }
    }
  }
  ```

  Put it back by sending the original list (read it first with
  `GET /lmd/prfsrv/threshold/v3/threshold/weekly`).

- Add Driver: `POST /lmd/usrsrv/drivers/v1/driver` without `transporter_id` → 200 (saved); with
  `status=xyz` → 200; with a 36-character `name` → 200; with `station_code=["999999"]` → 500
  `"something went wrong"`.
- Status switch: `PATCH /lmd/usrsrv/drivers/v1/statusUpdate` with
  `{"status": "xyz", "id": ["38308"], "type": "single"}` → 200 `"ok"`.
- Edit driver: `PATCH /lmd/usrsrv/drivers/v1/driver/38308` with a 36-character `name` → 201.
- Write-up Send: `POST /lmd/prfsrv/e-signature/v2/create` without `violation` → 200 `"Success"`,
  saved and sent; with `driver_id=99999999` → 200 `"Success"`, saved; only `failed_records` says
  `"Driver not found"`.
- Call-out Save: `POST /lmd/prfsrv/call_out/v2/call_out` with `callout_time=Jury Duty`, a
  251-character `reason`, `driver_id=99999999` or `date=2026-02-30` → 200
  `"CallOut data saved successfully"` (the last one is saved on 2026-03-02).

</details>

---

## BUG-API-016: E-Signature: a signed or refused write-up can still be deleted

|                     |                                               |
| ------------------- | --------------------------------------------- |
| **Screen**          | Driver page → E-Signature                     |
| **Severity**        | High                                          |
| **Priority**        | P1                                            |
| **Status**          | Open                                          |
| **Found on**        | 2026-09-25 (staging, station DYY1)            |
| **Automated tests** | `e-signature/write-up-journeys.spec.js` TC-05 |

**Summary:** once a driver has signed or refused a write-up, it must not be deleted. The web app does
not offer Delete for it. But the server deletes it when it gets a delete request.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use a write-up of
the test driver Jordan Whitaker that the driver has signed (the daily tests leave some, ENV-004).

**Steps to replicate**

In the web app (correct):

1. Open the Driver page of Jordan Whitaker → **E-Signature**.
2. Find a write-up with the status "signed". It has no Delete option: the web app shows Delete only
   while a write-up is "sent" or "draft".

Through the server (the bug):

3. Send a delete request for this write-up (see Technical details).
4. Open the E-Signature list again, and **Dashboard → Daily Highlights**.

**Expected result:** the server refuses to delete a signed or refused write-up.

**Actual result:** the server deletes it ("Report deleted successfully."). The write-up disappears
from the driver's list, from the dashboard and from the Leaderboard.

**Business impact:** a signed disciplinary document can be removed without a trace by anyone who can
send requests to the server. This is a legal and audit risk.

**How to check the fix:** run `npx playwright test --grep "BUG-API-016"`. The test passes when the
server refuses the delete. Then QA removes `@knownbug` and `(BUG-API-016)` from it. (While the bug is
open, the test deletes its own signed write-up. After the fix, that write-up stays, see ENV-004.)

<details>
<summary>Technical details (for developers)</summary>

- `DELETE /lmd/prfsrv/e-signature/v1/<write-up id>` for a write-up with `status: "signed"` (with the
  driver's signature) or a refused one → 200 `"Report deleted successfully."`.
- The web app's rule (driver page → E-Signature): Delete is shown only for the statuses "sent" and
  "draft".

</details>

---

## BUG-API-017: Write-ups and rescues: the "last changed" time does not change after an edit

|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Screens**         | Driver page → E-Signature, Data Management → Rescue                                    |
| **Severity**        | Low                                                                                    |
| **Priority**        | P3                                                                                     |
| **Status**          | Open                                                                                   |
| **Found on**        | 2026-09-25 (staging, station DYY1)                                                     |
| **Automated tests** | `e-signature/write-up-journeys.spec.js` TC-06, `rescues/rescue-journeys.spec.js` TC-06 |

**Summary:** every write-up and rescue has a "last changed" time (`updated_at`). After a manager edits
one, the change is saved, but the "last changed" time stays at the time the record was created.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test drivers
Casey Brooks (the rescuer) and Jordan Whitaker (the receiver).

**Steps to replicate** (example: a rescue)

1. Open **Data Management → Rescue** (today is chosen).
2. Click **Add New Rescue**: Rescuer Casey Brooks, Receiver Jordan Whitaker, 20 packages, 8 stops, a
   reason. Click **Save Changes**.
3. Click **Start Editing**, change **No. of Stops** to 10 and click **Save Changes**.
4. Press **F12** → **Network** and reload the page. Open the answer of the request `rescue?date=...`
   and look at `created_at` and `updated_at` of the rescue.

**After the test:** delete the rescue (bin icon).

**Expected result:** `updated_at` (the "last changed" time) shows the time of the edit.

**Actual result:** the change is saved (10 stops), but `updated_at` is still the same as `created_at`.
The same happens when a manager edits a write-up (Edit → Update).

**Business impact:** nobody can see when a write-up or a rescue was changed, for example a write-up
that was changed after the driver saw it. This matters for audits and disputes.

**How to check the fix:** run `npx playwright test --grep "BUG-API-017"`. Both tests pass when the bug
is fixed. Then QA removes `@knownbug` and `(BUG-API-017)` from them.

<details>
<summary>Technical details (for developers)</summary>

- Rescue: `PATCH /lmd/prfsrv/rescue/v2/rescue` → 200 `"Rescue data updated successfully"`, but
  `updated_at` does not change:

  ```json
  {
    "updateData": [
      {
        "caller_name": "Jordan Whitaker",
        "rescuer_name": "Casey Brooks",
        "status": "Completed",
        "number_of_packages": 20,
        "number_of_stops": 10,
        "reason": "Late start on route DYY1-05.",
        "_id": "<rescue id>",
        "date": "<date of the rescue>",
        "caller_id": 38267,
        "rescuer_id": 38315
      }
    ]
  }
  ```

- Write-up: `POST /lmd/prfsrv/e-signature/v2/update/<id>` → the notes change, `updated_at` stays the
  creation time.

</details>

---

## BUG-API-018: Callouts: a driver can get two call-outs on the same day

|                     |                                             |
| ------------------- | ------------------------------------------- |
| **Screen**          | Data Management → Callouts                  |
| **Severity**        | High                                        |
| **Priority**        | P2                                          |
| **Status**          | Open                                        |
| **Found on**        | 2026-09-25 (staging, station DYY1)          |
| **Automated tests** | `call-outs/call-out-journeys.spec.js` TC-06 |

**Summary:** a driver can have only one call-out per day. The Callouts screen follows this rule, but
the server saves a second call-out for the same driver and day. Both are then counted.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Jordan Whitaker.

**Steps to replicate**

In the web app (correct):

1. Open **Data Management → Callouts** (today is chosen).
2. Click **Add New CallOut**, search for Jordan Whitaker, click the name and close the window. Choose
   Callout Type **Sick**, write a reason and click **Save Changes**.
3. Note: the screen allows only one call-out per driver and day. If you pick a driver who already has
   a call-out that day, the screen removes the old one.

Through the server (the bug):

4. Save a second call-out for Jordan Whitaker on the same day, for example **No Call No Show** (see
   Technical details).
5. Reload the Callouts screen, and open **Dashboard → Daily Highlights** for that day.

**After the test:** delete both call-outs (bin icon).

**Expected result:** the server refuses the second call-out (for example "this driver already has a
call-out on this day"), or replaces the first one.

**Actual result:** the server saves it ("CallOut data saved successfully"). The day now has two
call-outs for Jordan Whitaker, and the dashboard, its call-out report and the Leaderboard count both.

**Business impact:** one absence is counted twice in the attendance numbers and in the driver's
Callouts count. Other apps also save call-outs (for example the Scheduler), so the check on the screen
is not enough.

**How to check the fix:** run `npx playwright test --grep "BUG-API-018"`. The test passes when the
server refuses the second call-out. Then QA removes `@knownbug` and `(BUG-API-018)` from it. If the
developers choose "replace the first one", QA changes the test to check that.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/prfsrv/call_out/v2/call_out` twice with the same `driver_id` and `date` → both 200
  `"CallOut data saved successfully"`:

  ```json
  {
    "callOut": [
      {
        "name": "Jordan Whitaker",
        "callout_time": "Sick",
        "excused": "No",
        "driver_id": "38267",
        "date": "<YYYY-MM-DD>",
        "reason": "Called at 5:40 AM: fever since last night."
      }
    ]
  }
  ```

  The second request has `"callout_time": "No Call No Show"` and another reason.

- Call-outs saved by the Scheduler have `created_from_app_type` "8".

</details>

---

## BUG-API-019: E-Signature: the driver's signing link works without its secret key (security)

|                     |                                                                |
| ------------------- | -------------------------------------------------------------- |
| **Screen**          | Driver page → E-Signature, and the driver's link (sent by SMS) |
| **Severity**        | High (security)                                                |
| **Priority**        | P1                                                             |
| **Status**          | To confirm                                                     |
| **Found on**        | 2026-09-25 (staging, station DYY1)                             |
| **Automated tests** | none yet                                                       |

**Summary:** the link that a driver gets by SMS to sign a write-up has two parts: a secret key and the
number (id) of the write-up. The link page sends only the write-up id to the server, without the key
and without a login. So the key is never checked.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use only a write-up
of the test driver Jordan Whitaker.

**Steps to replicate**

1. Send a write-up to Jordan Whitaker: Driver page → **E-Signature** → **Add Report**.
2. Open the driver's link for this write-up. It looks like
   `.../sign_write_up_report/<key>/<write-up id>` (it is in the SMS, and in the server's answer for
   the list of reports).
3. Press **F12** → **Network** and look at the requests of the link page: it asks the server for the
   write-up with the write-up id only (`sign_form?data_id=<write-up id>`), without the key and without
   a login.

**Expected result:** the server checks the key of the link (or a login that belongs to the driver) on
every open, sign and refuse request, and refuses a request without it.

**Actual result:** the server opens, signs and refuses a write-up with the write-up id alone. Our own
journeys do this with the test driver's write-ups (`e-signature/write-up-journeys.spec.js` TC-01,
TC-02).

**Business impact:** anyone who has, or can work out, a write-up id could read that write-up (the
driver's name and the notes) and sign or refuse it in the driver's name. The ids are not secret: they
are database numbers, partly based on the time they were made.

**To confirm with the developers:** whether the key is checked in another way. We did not try other
or made-up ids: the tests only use our own test write-ups.

**How to check the fix:** the journeys then send the key the way the web app does, and QA adds a test
that a request without the key is refused.

<details>
<summary>Technical details (for developers)</summary>

- Open: `GET /lmd/prfsrv/e-signature/v1/sign_form?data_id=<write-up id>`; sign:
  `POST /lmd/prfsrv/e-signature/v1/sign_form` (multipart: `file`, `driver_id`, `driver_name`,
  `company_id`, `data_id`); refuse: `PATCH /lmd/prfsrv/e-signature/v1/refuse_form_driver`. None of
  them needs a login, and none gets the key of the link (checked in the web app's code).

</details>

---

## BUG-API-020: Edit driver: another driver's phone number or transporter ID is saved without a warning

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| **Screen**          | Driver page → Profile → Edit                               |
| **Severity**        | High                                                       |
| **Priority**        | P1                                                         |
| **Status**          | Open                                                       |
| **Found on**        | 2026-09-25 (staging, station DYY1)                         |
| **Automated tests** | `drivers/driver-lifecycle-journeys.spec.js` TC-05 to TC-07 |

**Summary:** two drivers must not share a phone number, a transporter ID or an email. The server can
check this and show a conflict window ("phone number already exists"). But when the web app saves an
edit, it always tells the server that the conflict is already solved, so the server skips the check.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test drivers
Riley Thompson (38308) and Jordan Whitaker (38267).

**Steps to replicate**

1. Open the Driver page of Jordan Whitaker (`/driver/profile/38267`) and note the phone number.
2. Open the Driver page of Riley Thompson (`/driver/profile/38308`) and click **Edit**.
3. Enter Jordan Whitaker's phone number and click **Save**.

**After the test:** put Riley Thompson's own phone number back.

**Expected result:** the conflict window opens with "phone number already exists", and nothing is
saved until the manager decides.

**Actual result:** the change is saved without a warning ("updated successfully"): now two drivers
have the same phone number. The same happens with a transporter ID. With another driver's email the
server fails ("something went wrong"). We checked this by sending the web app's own Save request.

**Business impact:** scorecards are matched to drivers by transporter ID, so a shared transporter ID
gives two drivers the same performance data. SMS and chat messages go to a phone number that belongs
to two drivers. The manager never sees the conflict window.

**How to check the fix:** run `npx playwright test --grep "BUG-API-020"`. The 3 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-020)` from them. The web app probably must
send "conflict solved" only after the manager solved a conflict: check with the developers.

<details>
<summary>Technical details (for developers)</summary>

- `PATCH /lmd/usrsrv/drivers/v1/driver/38308` with the web app's body:

  ```json
  {
    "station_code": ["541"],
    "phone": "<Jordan Whitaker's phone>",
    "conflict_resolved": true
  }
  ```

| Change on the driver          | With `conflict_resolved: true` (the web app)                      | Without `conflict_resolved`           |
| ----------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| the phone of another driver   | 201 `"updated successfully"`: two drivers have one phone number   | 409 `"phone number already exists"`   |
| the transporter ID of another | 201 `"updated successfully"`: two drivers have one transporter ID | 409 `"transporter id already exists"` |
| the email of another driver   | 500 `"something went wrong"`                                      | 409 `"email address already exists"`  |

- The web app sends `conflict_resolved: true` with every Edit, even the first Save.

</details>

---

## BUG-API-021: Driver status: the server does not follow the Leaderboard rules for suspended and inactive drivers

|                     |                                                          |
| ------------------- | -------------------------------------------------------- |
| **Screen**          | Dashboard → Leaderboard (status switch, row menu)        |
| **Severity**        | Medium                                                   |
| **Priority**        | P2                                                       |
| **Status**          | Open                                                     |
| **Found on**        | 2026-09-25 (staging, station DYY1)                       |
| **Automated tests** | `drivers/driver-lifecycle-journeys.spec.js` TC-10, TC-11 |

**Summary:** the Leaderboard has three rules: the status of a suspended driver cannot be changed, a
suspended driver can only be resumed (not suspended again), and only an active driver can be
suspended. The server accepts all three.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Riley Thompson (38308).

**Steps to replicate**

In the web app (correct):

1. Open **Dashboard → Leaderboard** and find Riley Thompson in the list (use the search box of the
   Leaderboard).
2. Open the row menu of Riley Thompson → **Suspend Driver**. Choose From = today and To = tomorrow,
   write the details and confirm. Riley Thompson is now in the list of suspended drivers.
3. Click the status switch of Riley Thompson. The screen shows "You have selected suspended driver
   remove the suspended driver" and does not change the status.
4. Open the row menu again: it shows **Resume Driver** instead of Suspend Driver.

Through the server (the bug):

5. Deactivate Riley Thompson (see Technical details).
6. Resume Riley Thompson (row menu → **Resume Driver**) and look at the status.

**After the test:** switch Riley Thompson back to active.

**Expected result:** the server refuses to change the status of a suspended driver, refuses a second
suspension, and refuses to suspend an inactive driver.

**Actual result:** the server accepts all of them:

- Deactivate a suspended driver: accepted. The driver still shows as suspended, and after Resume the
  driver is inactive.
- Suspend a suspended driver again: accepted. The driver now has two suspensions for the same days.
- Suspend an inactive driver: accepted. The inactive driver becomes suspended.

**Business impact:** a driver can end up in a status that the web app never shows (inactive under a
suspension), and Resume then gives the driver a status the manager did not choose.

**How to check the fix:** run `npx playwright test --grep "BUG-API-021"`. The 2 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-021)` from them.

<details>
<summary>Technical details (for developers)</summary>

- Suspend: `POST /lmd/prfsrv/suspended/v3/suspend_driver` with
  `{"suspend_data": {"driver_id": "38308", "start": "<today>", "end": "<tomorrow>", "notes": "..."}}`.
- Deactivate while suspended: `PATCH /lmd/usrsrv/drivers/v1/statusUpdate` with
  `{"status": "inactive", "id": ["38308"], "type": "single"}` → 200 `"ok"`.
- Suspend again (the same body) → 200: a second suspension for the same days.
- Inactive driver: `POST /lmd/prfsrv/inactive_drivers/v2/save_inactive_driver?driver_id=38308` (the
  reason), then `statusUpdate` with `"inactive"`, then `suspend_driver` → 200: suspended.
- Resume: `POST /lmd/prfsrv/suspended/v3/suspend_driver/update` with `{"driver_id": "38308"}`.

</details>

---

## BUG-API-022: Rescue: a driver can be their own rescuer, and an inactive driver can be a rescuer

|                     |                                                |
| ------------------- | ---------------------------------------------- |
| **Screen**          | Data Management → Rescue                       |
| **Severity**        | Medium                                         |
| **Priority**        | P2                                             |
| **Status**          | Open                                           |
| **Found on**        | 2026-09-25 (staging, station DYY1)             |
| **Automated tests** | `rescues/rescue-journeys.spec.js` TC-04, TC-05 |

**Summary:** in a rescue, one driver (the rescuer) takes over packages and stops of another driver
(the receiver). The Rescue screen does not let a manager choose the same driver twice, and it does not
offer inactive drivers. The server saves both.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Jordan Whitaker (38267) and the inactive test driver 38272.

**Steps to replicate**

In the web app (correct):

1. Open **Data Management → Rescue**.
2. Click **Add New Rescue**.
3. In **Rescuer**, choose Jordan Whitaker.
4. Open **Receiver**: Jordan Whitaker is not in the list. Inactive drivers are not in either list.
5. Leave without saving.

Through the server (the bug):

6. Save a rescue with Jordan Whitaker as both rescuer and receiver (see Technical details).
7. Save a rescue with the inactive driver 38272 as the rescuer.
8. Reload the Rescue screen for that day.

**After the test:** delete both rescues (bin icon).

**Expected result:** the server refuses both rescues with a clear message, just like the screen does
not allow them.

**Actual result:** the server saves both ("Rescue data saved successfully"): a driver who "rescued
themselves", and a rescue by an inactive driver.

**Business impact:** rescues feed the dashboard, the rescue report and the driver ratings (Rate your
Drivers uses rescues completed, requested and refused), so a rescue that cannot happen can change
these numbers.

**How to check the fix:** run `npx playwright test --grep "BUG-API-022"`. The 2 tests pass when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-022)` from them. (While the bug is open, each
test deletes the rescue it saved.)

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/prfsrv/rescue/v2/rescue` → 200 `"Rescue data saved successfully"`:

  ```json
  {
    "rescue": [
      {
        "caller_name": "Jordan Whitaker",
        "rescuer_name": "Jordan Whitaker",
        "caller_id": "38267",
        "rescuer_id": "38267",
        "number_of_packages": "42",
        "number_of_stops": "18",
        "status": "Completed",
        "date": "<YYYY-MM-DD>",
        "reason": "Rescue of the same driver.",
        "is_caller_empty": false,
        "is_rescuer_empty": false
      }
    ]
  }
  ```

  The second request has `"rescuer_id": "38272"` (an inactive driver).

- The web app's rule (from its code): both driver lists use only drivers whose status is not
  "inactive", and the Rescuer list leaves out the chosen Receiver.
- Delete:
  `DELETE /lmd/prfsrv/rescue/v2/rescue?_id=<id>&rescuer_id=<id>&caller_id=<id>&date=<saved date>`.

</details>

---

## BUG-API-023: Scorecards: weeks 31 and 32 have the same scorecard for every driver

|                     |                                                                    |
| ------------------- | ------------------------------------------------------------------ |
| **Screen**          | Driver page → Weekly (and every screen that shows weeks 31 and 32) |
| **Severity**        | Medium                                                             |
| **Priority**        | P2                                                                 |
| **Status**          | To confirm                                                         |
| **Found on**        | 2026-09-29 (staging, station DYY1)                                 |
| **Automated tests** | none yet                                                           |

**Summary:** the scorecards of week 31 and week 32 of 2026 are exactly the same for all 118 drivers of
DYY1: the same numbers in every metric. Two real weeks are never the same for every driver. Week 31 was
saved on 17 August 2026, four days after week 32 (13 August). It looks like the file of week 32 was
uploaded again as week 31, and nothing noticed that the week inside the file was a different week.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use driver 36363 (any
driver of DYY1 shows the same).

**Steps to replicate**

1. Open the Weekly tab of driver 36363: <https://staging.performance.lmdmax.com/driver/weekly/36363>.
2. Click **Week: 34** and click **1** (1 August 2026, a day of week 31). Note the ScoreCard, for
   example Delivered 461, Photo-On-Delivery 99.7%, Delivery Completion DPMO 4282.6, POD Opps. 291.
3. Click the week button again and click **5** (5 August 2026, a day of week 32).
4. Compare: the ScoreCard of week 32 shows exactly the same numbers as week 31. The rating is the same
   too (8.81 in both weeks).
5. Do the same for other drivers: weeks 31 and 32 are always the same.

**Expected result:** each week has its own scorecard, from that week's file.

**Actual result:** weeks 31 and 32 have the same scorecard for all 118 drivers.

**Question for the developers:** was the same file uploaded twice on staging? Does the scorecard upload
check that the week inside the file is the week the manager chose?

**Business impact:** if the upload accepts a file for the wrong week, the performance of one week is
copied into another week. The drivers' ratings, the ranking and the Leaderboard of that week are then
wrong, and drivers are coached or rewarded on numbers that are not theirs.

**How to check the fix:** after the developers' answer, QA adds a test. A test of the upload needs a
separate test station, so that it does not change the numbers of DYY1.

<details>
<summary>Technical details (for developers)</summary>

- `GET /lmd/prfsrv/scorecard/v2/compare?week_number=202631` and `?week_number=202632` (all drivers of the
  week) → 118 scorecards each. For every transporter ID, the `metrics` are the same in both weeks (the
  name and `s_no` were left out of the comparison).
- `created_at`: week 31 `2026-08-17T06:39:41.340Z`, week 32 `2026-08-13T05:52:57.529Z`.
- For comparison, weeks 32 and 34: 97 drivers are in both weeks, and none has the same metrics.

</details>

---

## BUG-API-024: Driver page: the ScoreCard and the POD report show different POD opportunities for 3 drivers

|                     |                                    |
| ------------------- | ---------------------------------- |
| **Screen**          | Driver page → Weekly               |
| **Severity**        | Low                                |
| **Priority**        | P3                                 |
| **Status**          | To confirm                         |
| **Found on**        | 2026-09-29 (staging, station DYY1) |
| **Automated tests** | none yet                           |

**Summary:** the Weekly tab of a driver shows the number of photo-on-delivery opportunities twice: in the
ScoreCard ("POD Opps.") and in the POD - Quality Report ("Opportunities"). For 107 of the 110 drivers of
week 34 the two numbers are the same. For 3 drivers they differ by 1.

**Before you start:** log in to the web app as a manager and choose station DYY1.

**Steps to replicate**

1. Open the Weekly tab of driver 34024: <https://staging.performance.lmdmax.com/driver/weekly/34024> (it
   opens with week 34).
2. In the **ScoreCard**, read **POD Opps.**: 628.
3. In the **POD - Quality Report** below it, read **Opportunities**: 627.

**Expected result:** the same number in both places, or a note that explains why they are different.

**Actual result:** 628 in the ScoreCard and 627 in the POD report. The same happens for 2 other drivers
of week 34 (441 and 442, 674 and 675).

**Question for the developers:** both numbers come from uploaded Amazon files (the weekly scorecard and
the POD report). Is the difference already in Amazon's files, or does LMDmax read one of the files
differently?

**Business impact:** a manager sees two different numbers for the same thing on one page and cannot tell
which one is right. If LMDmax reads a file wrongly, other numbers could be wrong too.

**How to check the fix:** after the developers' answer, QA checks the numbers of every driver. Today the
journey test checks driver 36363 only, whose numbers agree (`scorecard/driver-scorecard-journeys.spec.js`
TC-04).

<details>
<summary>Technical details (for developers)</summary>

- ScoreCard: `GET /lmd/prfsrv/scorecard/v2/compare?transporter_id=<id>&week_number=202634` →
  `metrics.pod_opps`. POD report: `GET /lmd/prfsrv/pod/v2/pod_report?week_number=202634&transporter_id=<id>`
  → `metrics.opportunities`.
- Different for `A3CC5KMYNS1B6Q` (driver 34024: 628 and 627), `A3E3M2AW6Q6LNI` (441 and 442) and
  `A3MMICQQHRH134` (674 and 675). The POD % is the same in both places (100.0%).

</details>

---

## BUG-API-025: E-Signature: right after a write-up is sent, the driver's link and Refuse say that it does not exist

|                     |                                                                                  |
| ------------------- | -------------------------------------------------------------------------------- |
| **Screen**          | Driver page → E-Signature, and the driver's link (sent by SMS)                   |
| **Severity**        | High                                                                             |
| **Priority**        | P2                                                                               |
| **Status**          | To confirm                                                                       |
| **Found on**        | 2026-09-26 (staging, station DYY1), in the daily test run; seen until 2026-09-28 |
| **Automated tests** | the write-up and acknowledgement journeys (they failed on these days)            |

**Summary:** on 26, 27 and 28 September, in the daily test run, the server could not find a write-up
that it had saved about one second earlier. Opening the driver's link answered "Form not found", and
Refuse (by the driver or by the manager) answered "This form does not exist". Later, the same write-ups
worked. On 29 September the problem did not happen.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Jordan Whitaker.

**Steps to replicate**

1. Send a write-up to Jordan Whitaker: Driver page → **E-Signature** → **Add Report** → Write-Up →
   **Send**.
2. Straight away (within a second or two), open the driver's link of this write-up, or click **Refuse**
   on the link page.
3. Read the answer.

The easiest way is the automated journeys, which do exactly this:
`npx playwright test tests/api/e-signature/write-up-journeys.spec.js`. The problem does not happen
every time: it happened in the daily runs of 26, 27 and 28 September, and not on 29 September.

**Expected result:** the driver's link and Refuse work as soon as the write-up is sent. The SMS reaches
the driver within seconds.

**Actual result:** the link page answers "Form not found" and Refuse answers "This form does not
exist", for a write-up that was saved a second earlier. A few seconds or days later the same write-up
works.

**Question for the developers:** please check the server logs for the times in Technical details. Is a
new write-up saved in one place and read from another place that is updated later?

**Business impact:** a driver who opens the link as soon as the SMS arrives sees an error and may not
try again, so the write-up stays unsigned. A manager who marks a write-up refused right after sending
it gets an error. For 3 days the daily test run failed for these journeys, and nobody noticed, because
the daily run always shows the known bugs as failures.

**How to check the fix:** after the developers' answer, QA watches the daily test runs: the write-up
journeys (TC-01 to TC-03) and the acknowledgement journey (TC-01) must pass every day.

<details>
<summary>Technical details (for developers)</summary>

- Daily test runs (GitHub Actions → Tests): 26 Sep (run 36228155221) and 27 Sep (run 36306127232):
  write-up journeys TC-01 (sign), TC-02 (the driver refuses) and TC-03 (the manager marks it refused)
  failed on both tries. 28 Sep (run 36399764217): TC-02 and TC-03 failed, and the acknowledgement journey
  TC-01 failed on the first try and passed on the second.
- The write-up was saved with `POST /lmd/prfsrv/e-signature/v2/create` → 200 `"Success"`. About one
  second later:
  - `GET /lmd/prfsrv/e-signature/v1/sign_form?data_id=<id>` → 400 `{"success": true, "message": "Form not found"}`
    (a 400 status with `"success": true`)
  - `PATCH /lmd/prfsrv/e-signature/v1/refuse_form_driver` → 404 `"This form does not exist"`
  - `PATCH /lmd/prfsrv/e-signature/v1/refuse_form` → 404 `"This form does not exist"`
- Times (UTC) when the affected write-ups were created: 26 Sep 07:56:21 to 07:56:27, 27 Sep 08:27:29 to
  08:27:34, 28 Sep 08:52:53 to 08:53:02 (and one write-up on 25 Sep 05:25:19).
- Example: the acknowledgement `6aba2ae54aa9387cfdc8f3c7`, created 2026-09-28T08:52:53Z, answered "Form
  not found" right after it was created, and 200 `"Success"` on 29 Sep.
- The 18 test records that these failures left unsigned on the test driver were deleted on 29 Sep.

</details>

---

## BUG-API-026: Sign in: the password also works with spaces before or after it

|                     |                              |
| ------------------- | ---------------------------- |
| **Screen**          | Sign In (email and password) |
| **Severity**        | Medium                       |
| **Priority**        | P2                           |
| **Status**          | To confirm                   |
| **Found on**        | 2026-11-02 (staging)         |
| **Automated tests** | `login/login.spec.js` TC-21  |

**Summary:** the server removes spaces (and tabs) at the start and the end of the password before it
checks it. So `Test@123 ` and ` Test@123` log in like `Test@123`. The login test sheet
(TC_LOGIN_036) says a password must be checked exactly as typed.

**Before you start:** the test login (any account works).

**Steps to replicate**

1. Open the Performance login page.
2. Type the email and the correct password, and add one space at the end of the password.
3. Click **Sign In**.

**Expected result:** "Invalid Credentials". A password is checked exactly as typed.

**Actual result:** the login works. The same with a space before the password, three spaces, or a tab.

**Question for the product owner:** is this on purpose (for example because people copy passwords
with a space)? If yes, close this bug and change TC-21 to expect a login. If not, the server must
stop trimming the password. Note that a password that really starts or ends with a space can then never
be used as typed.

**Business impact:** small for security (the right characters are still needed), but a password is
not checked as the user typed it, which differs from what the test sheet and most products do.

**How to check the fix:** run `npx playwright test --grep "BUG-API-026"`. The test passes when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-026)` from it.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/usrsrv/users/v1/user/perf_login` with `{ "email": "<test user>", "password": "<password> " }`
  → 200 and a token. The same with `" <password>"`, `"<password>   "` and `"<password>\t"`.
- The email is also trimmed (`login/login.spec.js` TC-04), which is expected for an email.

</details>

---

## BUG-API-027: Forgot Password: an unregistered email answers "not found" and "success" at the same time

|                     |                                       |
| ------------------- | ------------------------------------- |
| **Screen**          | Sign In → Forgot Password? → Send OTP |
| **Severity**        | Low                                   |
| **Priority**        | P3                                    |
| **Status**          | Open                                  |
| **Found on**        | 2026-11-02 (staging)                  |
| **Automated tests** | `login/forgot-password.spec.js` TC-02 |

**Summary:** when Forgot Password is asked for an email that has no account, the server answers
"user not found" with the status 404, but also says `"success": true`.

**Before you start:** nothing special.

**Steps to replicate**

In the web app (correct):

1. Open the login page and click **Forgot Password?**.
2. Type `xyz_unreg_perf@yopmail.com` and click **Send OTP**. The screen shows "User Not Found".

Through the server (the bug):

3. Send the same request (see Technical details) and read the answer.

**Expected result:** `"success": false`, as in every other refused request.

**Actual result:** `"success": true` together with the status 404 and the message "user not found".

**Business impact:** the web app reads the status, so the screen is right today. Another app, an
integration or a future screen that reads `success` would think the OTP was sent.

**How to check the fix:** run `npx playwright test --grep "BUG-API-027"`. The test passes when the
bug is fixed. Then QA removes `@knownbug` and `(BUG-API-027)` from it.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/usrsrv/users/v1/user/credentials/request` with `{ "identifier": "xyz_unreg_perf@yopmail.com" }`
  → 404 `{ "success": true, "message": "user not found", "action": "forgot_password" }`.
- The same kind of mismatch (an error status with `"success": true`) is noted in BUG-API-025 for the
  driver's signing link.

</details>

---

## BUG-API-028: Control Tower: the logout works without a login (security)

|                     |                                                        |
| ------------------- | ------------------------------------------------------ |
| **Screen**          | Control Tower sign-in (login.lmdmax.com → Performance) |
| **Severity**        | High                                                   |
| **Priority**        | P2                                                     |
| **Status**          | To confirm                                             |
| **Found on**        | 2026-11-02 (staging)                                   |
| **Automated tests** | `login/control-tower.spec.js` TC-04                    |

**Summary:** a user who comes from the Control Tower (login.lmdmax.com) is logged in to the Performance
app with a `login_id`. Its logout address accepts a request **without any login** and changes the
sessions of that `login_id`. Whoever knows or guesses a `login_id` could end another person's session.

**Before you start:** nothing special. The test sends a made-up `login_id`, so no real session is touched.

**Steps to replicate**

Through the server (the bug):

1. Send the Control Tower logout request **without** the headers `x-access-token` and `x-access-user`
   (see Technical details).
2. Read the answer.

**Expected result:** 401 "not logged in", like the normal logout (`login/session.spec.js` TC-04).

**Actual result:** 200 `"success": true`, and the answer shows a database update (`matchedCount: 0` for the
made-up `login_id`).

**Question for the developers:** is a `login_id` long and random enough that it cannot be guessed? Even
then, a logout should need the session's own token.

**Business impact:** a person could log other users out of the Performance app (and maybe the Control
Tower) again and again, without any password.

**How to check the fix:** run `npx playwright test --grep "BUG-API-028"`. The test passes when the
logout needs a login. Then QA removes `@knownbug` and `(BUG-API-028)` from it.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/usrsrv/control_tower/v1/control_tower_logout` with `{ "login_id": "invalid-login-id" }` and
  no login headers → 200 `{ "success": true, "data": [null, { "acknowledged": true, "modifiedCount": 0,
"matchedCount": 0, ... }] }`.
- The web app sends this request with the login headers (`logotToControlTower` in the web app's code),
  but the server does not require them.
- The normal logout `POST /lmd/usrsrv/users/v1/user/logout` without headers → 401.

</details>

---

## BUG-API-029: Chat: deleting an unknown message, or through another conversation, gives a server error (500)

|                     |                                                               |
| ------------------- | ------------------------------------------------------------- |
| **Screen**          | Chat → Paya Chat / Individual Chat → hover a message → Delete |
| **Severity**        | Low                                                           |
| **Priority**        | P3                                                            |
| **Status**          | Open                                                          |
| **Found on**        | 2026-11-03 (staging, station DYY1)                            |
| **Automated tests** | `chat/deleted-message-preview.spec.js` TC-12, TC-13           |

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

**How to check the fix:** run `npx playwright test --grep "BUG-API-029"`. The tests pass when the bug is
fixed. Then QA removes `@knownbug` and `(BUG-API-029)` from them.

<details>
<summary>Technical details (for developers)</summary>

- `PATCH https://staging-messaging.fleet.lmdmax.com/lmd/twms/chat/v1/delete_message` with
  `{ "chat_room_id": "5191", "id": "999999999" }` → 500 `{ "success": false, "message": "Error in Message updation" }`.
- The same with a real message id and `"chat_room_id": "1"`.
- Without `id` → 400 `"params missing"` (correct). Without login → 401 (correct).
- Deleting an already deleted message again → 200 `"Message updated successfully"` (could be 404 or 409).

</details>

---

## BUG-API-030: Chat: a deleted image or file can still be opened with its link (privacy)

|                     |                                                                  |
| ------------------- | ---------------------------------------------------------------- |
| **Screen**          | Chat → Paya Chat / Individual Chat → an image or a file → Delete |
| **Severity**        | High                                                             |
| **Priority**        | P2                                                               |
| **Status**          | To confirm                                                       |
| **Found on**        | 2026-11-03 (staging, station DYY1)                               |
| **Automated tests** | `chat/deleted-message-preview.spec.js` TC-11                     |

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

**How to check the fix:** run `npx playwright test --grep "BUG-API-030"`. The test passes when the link no
longer opens the file. Then QA removes `@knownbug` and `(BUG-API-030)` from it.

<details>
<summary>Technical details (for developers)</summary>

- Upload: `PUT /lmd/twms/chatroom/v3/file` → `url: https://d2jilumhwuwrmw.cloudfront.net/chat/files/raw/<id>/source.jpg`.
- After `PATCH /lmd/twms/chat/v1/delete_message` (200), `GET` of that `url` → 200 `image/jpeg` (no login).
- The delete answer itself also still contains the original `content` of the message (only the admin
  who deleted gets this answer).

</details>

---

## BUG-API-032: Announcements: the server accepts a title longer than 100 characters

|                     |                                                         |
| ------------------- | ------------------------------------------------------- |
| **Screen**          | Announcements → Create announcement / Edit announcement |
| **Severity**        | Low                                                     |
| **Priority**        | P3                                                      |
| **Status**          | Open                                                    |
| **Found on**        | 2026-11-04 (staging, station DYY6)                      |
| **Automated tests** | `announcements/announcements.spec.js` ANN-041, ANN-169  |

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

**How to check the fix:** run `npx playwright test --grep "BUG-API-032"`. Then QA removes `@knownbug` and
`(BUG-API-032)` from the tests.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/prfsrv/announcements/v1/create` with `{ "title": "<101 characters>", "description": "QA",
"audience_type": "selected", "user_ids": ["13848"], "comment_mode": "everyone",
"acknowledgement_enabled": false, "attachment_ids": [], "request_id": "<uuid>" }` → 200.
- A description of 10,001 characters → 400 "Description can not exceed 10000 characters" (correct).
- The web app's rule: `title.length > 100` → "Title cannot exceed 100 characters." (create page).

</details>

---

## BUG-API-033: Announcements: the server accepts attachments larger than 10 MB

**Update (2026-11-10):** the automated test passed on staging: the server now refuses the file. Perhaps fixed; to confirm with the developers, then remove `@knownbug` from the test.

|                     |                                                       |
| ------------------- | ----------------------------------------------------- |
| **Screen**          | Announcements → Create announcement → Attachments     |
| **Severity**        | Medium                                                |
| **Priority**        | P3                                                    |
| **Status**          | Open                                                  |
| **Found on**        | 2026-11-04 (staging, station DYY6)                    |
| **Automated tests** | `announcements/announcements.spec.js` ANN-054 (10 MB) |

**Summary:** the create page says "PDF, DOCX, XLSX, PNG, JPG up to 10 MB" and refuses bigger files, but the
upload address accepts an 11 MB PDF.

**Steps to replicate:** upload an 11 MB PDF to `POST /lmd/prfsrv/announcements/v1/attachments`.

**Expected result:** 400 "File is larger than 10 MB."

**Actual result:** 200 "Attachments uploaded", size 11534923.

**Business impact:** large files cost storage and are slow to download on the drivers' phones (mobile data).

**How to check the fix:** run `npx playwright test --grep "BUG-API-033"`.

---

## BUG-API-034: Announcements: a broken (corrupt) PDF is accepted as an attachment

**Update (2026-11-10):** the automated test passed on staging: the server now refuses the file. Perhaps fixed; to confirm with the developers, then remove `@knownbug` from the test.

|                     |                                                   |
| ------------------- | ------------------------------------------------- |
| **Screen**          | Announcements → Create announcement → Attachments |
| **Severity**        | Low                                               |
| **Priority**        | P3                                                |
| **Status**          | Open                                              |
| **Found on**        | 2026-11-04 (staging, station DYY6)                |
| **Automated tests** | `announcements/announcements.spec.js` ANN-056     |

**Summary:** the server checks the start of a file (an `.exe` renamed to `.pdf` is refused, correct), but a
PDF whose content is broken after the first bytes is accepted. Sheet case ANN-056 expects it to be refused.

**Steps to replicate:** upload `test-files/announcements/qa-corrupt.pdf` (a real PDF header, then random
bytes) to `POST /lmd/prfsrv/announcements/v1/attachments`.

**Expected result:** 400, the file is refused with a clear message.

**Actual result:** 200 "Attachments uploaded". Drivers get a file that does not open.

**Question for the developers:** is checking the whole file planned? If not, the sheet case should be
changed.

**How to check the fix:** run `npx playwright test --grep "BUG-API-034"`.

---

## BUG-API-035: Announcements: attachments can be downloaded by anyone with the link, without login

|                     |                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Screen**          | Announcements → an announcement → Attachments → Download                            |
| **Severity**        | High                                                                                |
| **Priority**        | P2                                                                                  |
| **Status**          | Open                                                                                |
| **Found on**        | 2026-11-04 (staging, station DYY6)                                                  |
| **Automated tests** | `announcements/announcements.spec.js` ANN-117, `announcements.spec.js` (UI) ANN-117 |

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

**How to check the fix:** run `npx playwright test --grep "BUG-API-035"`.

<details>
<summary>Technical details (for developers)</summary>

- `GET /announcements/v1/<id>/overview` → `attachments[].url` = public CloudFront address → `GET` without
  headers → 200.
- `GET /announcements/v1/<id>/attachments/<att>/download` without login → 401; as a user of another
  station → 404 (correct).
- Suggested fix: serve files only through the download address, or use signed URLs that expire.

</details>

---

## BUG-API-036: Add Driver: an owner's email and phone are not checked: they can be used for a driver

|                     |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| **Screen**          | Leaderboard → Add Driver                                                     |
| **Severity**        | High                                                                         |
| **Priority**        | P2                                                                           |
| **Status**          | Open                                                                         |
| **Found on**        | 2026-11-04 / 05 (staging, Brothers ABC 588 and earthhh TTT 700)              |
| **Automated tests** | `rehire/rehire-conflicts.spec.js` TC_022/023, TC_029, TC_030, TC_031, TC_033 |

**Summary:** Add Driver checks a new driver's email and phone against the other **drivers** only. The email
and phone of an **owner** are not checked (an **admin's** are: 409 "This user is already an admin in
Station … share them as a driver …?", checked 2026-11-05): a driver with the owner's own email
and phone was saved in the owner's company, and in another company. Sheet REQ-03/REQ-04: "Email ID already
exists for {Owner – …} in the same company" / "… in another company", and the driver is not created.

**Steps to replicate**

1. Log in as the owner of Brothers (brothers@yopmail.com), station ABC.
2. Leaderboard → Add Driver: a new name and transporter ID, the owner's own email and phone → Save.

**Expected result:** refused with the same-company message naming the Owner (TC_022/023).

**Actual result:** 200, the driver is saved (2026-11-04: driver 38793; and in earthhh: driver 38794, both
made inactive). Since then the answer is a conflict with these inactive drivers, never with the owner.

**Business impact:** one person can have an owner account and a driver account with the same login details
("one active identity" is broken); the rehire / Super Admin process never sees these cases.

---

## BUG-API-037: Add Driver: a conflict with another company sends that company's driver details to the admin

|                     |                                                        |
| ------------------- | ------------------------------------------------------ |
| **Screen**          | Leaderboard → Add Driver                               |
| **Severity**        | High                                                   |
| **Priority**        | P2                                                     |
| **Status**          | Open                                                   |
| **Found on**        | 2026-11-05 (staging, earthhh adding a Brothers driver) |
| **Automated tests** | `rehire/rehire-conflicts.spec.js` TC_042               |

**Summary:** when an admin adds a driver whose email or phone belongs to a driver of **another DSP**, the
screen shows only "<name> added with access issue". But the server's answer to the admin's browser contains
the other DSP's driver: name, phone, email, transporter ID, status, the other company's name ("Brothers"),
DSP code and ids. Sheet TC_042 (Critical): "Other company's name, user details are not exposed in UI or API
response."

**Steps to replicate**

1. Brothers has a driver with email X.
2. Log in as earthhh's owner → Leaderboard → Add Driver with email X → Save, with the browser's developer
   tools open (Network → the `driver` request → Response).

**Expected result:** only a generic conflict (no data of the other company).

**Actual result:** `data.conflicts[].conflicted[]` holds the other driver's `name`, `phone`, `email`,
`transporter_id`, `status`, `company_name`, `dsp_short_code`, `company_id`, `id`.

**Business impact:** any admin can find out who works for another DSP (name, phone) by trying emails or phone
numbers in Add Driver (privacy, competitors).

---

## BUG-API-038: Add Driver: the same phone with "+1" in front is a new number

|                     |                                               |
| ------------------- | --------------------------------------------- |
| **Screen**          | Leaderboard → Add Driver                      |
| **Severity**        | Medium                                        |
| **Priority**        | P3                                            |
| **Status**          | To confirm (sheet open question OQ-13)        |
| **Found on**        | 2026-11-05 (staging, Brothers)                |
| **Automated tests** | `rehire/rehire-conflicts.spec.js` TC_139 (+1) |

**Summary:** a phone that already exists, written with "+1" in front (`+15551234567` for `5551234567`), is
saved as a new driver without a conflict. With dashes or spaces it is refused (correct).

**Expected result (TC_139):** the same number is detected.

**Actual result:** 200, a second driver with the same phone (and "+1").

**Question for the developers / BA (OQ-13):** are phone numbers normalised (country code, spaces, dashes)?

---

## BUG-API-039: Super Admin: Update & Resolve accepts a wrong phone number and resolves the request

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Screen**          | Super Admin site → Conflict Requests → a request → UPDATE & RESOLVE |
| **Severity**        | Medium                                                              |
| **Priority**        | P2                                                                  |
| **Status**          | Open                                                                |
| **Found on**        | 2026-11-05 (staging, a QA request raised by the tests)              |
| **Automated tests** | `rehire/super-admin-actions.spec.js` TC_094                         |

**Update (2026-11-05, later run):** the phone 12345 was refused; perhaps fixed during the day. To confirm
with the developers.

**Summary:** in Update & Resolve the Super Admin changes the existing driver's phone/email to end the
conflict. A wrong email (`abc@`) is refused, but the phone **12345** is accepted: the request becomes
RESOLVED and the driver now has the phone "12345".

**Expected result (TC_094):** "Format validation error; not saved."

**Actual result:** 200 "Conflict resolved successfully"; the driver's phone is 12345.

**Business impact:** the driver cannot get SMS or sign in with the phone; the conflict is "resolved" with
wrong data.

<details>
<summary>Technical details (for developers)</summary>

- `PATCH /lmd/usrsrv/users/v1/super-admin/resolve-conflict` with `{ data: { email, phone: "12345", status },
conflicted_entities, request_type, conflicted_request_id, resolution_type: "manual" }` → 200.

</details>

---

## BUG-API-040: Promotion: a driver whose details are used in another company is promoted without the Super Admin

|                     |                                                        |
| ------------------- | ------------------------------------------------------ |
| **Screen**          | Leaderboard → a driver's menu → Promote As An Admin    |
| **Severity**        | High                                                   |
| **Priority**        | P2                                                     |
| **Status**          | Open                                                   |
| **Found on**        | 2026-11-05 (staging, Brothers and earthhh, QA drivers) |
| **Automated tests** | `rehire/roles-and-access.spec.js` TC_060               |

**Summary:** sheet REQ-06 / TC_060: promoting a Driver to Admin is blocked until the Super Admin approves when
the same email/phone is used in another company. A Brothers driver whose email and phone also belong to an
earthhh driver was promoted at once: "User shared as admin successfully". (Adding the same person as an
admin through Add Admin is blocked correctly: "Same OR Cross-company conflict must be resolved by Super
Admin.")

**Steps to replicate**

1. Brothers has driver X; earthhh adds a driver with X's email and phone (saved "with access issue").
2. Brothers → Leaderboard → X's menu → Promote As An Admin → set a password → Confirm.

**Expected result:** blocked with the cross-company message and Send Request (TC_060).

**Actual result:** 200 "User shared as admin successfully"; X is an admin of Brothers.

**Business impact:** the "one active identity" rule is bypassed through promotion: the same person is an admin
in one DSP and a driver in another.

<details>
<summary>Technical details (for developers)</summary>

- `POST /lmd/usrsrv/users/v1/user_promotion` `{ action: "promoted", user, id, password, station_code,
share_existing_user: true }` → 200, although `POST /lmd/usrsrv/users/v2/admin` with the same email/phone
  answers 409 (cross_company_driver).

</details>

---

## BUG-API-041: Add Driver: a driver of earthhh added in Brothers is not reported as a conflict

|                     |                                                            |
| ------------------- | ---------------------------------------------------------- |
| **Screen**          | Leaderboard → Add Driver                                   |
| **Severity**        | High                                                       |
| **Priority**        | P2                                                         |
| **Status**          | Open                                                       |
| **Found on**        | 2026-11-05 (staging, QA drivers; seen 3 times in a row)    |
| **Automated tests** | `rehire/roles-and-access.spec.js` TC_035 (other direction) |

**Summary:** the cross-company check works in one direction only. When **earthhh** adds a driver with the email
and phone of a **Brothers** driver, the driver is saved "with access issue" and the conflict is listed
(correct). When **Brothers** adds a driver with the email and phone of an **earthhh** driver, the driver is
saved with **no conflict at all**, like a new person.

**Steps to replicate**

1. earthhh → Add Driver: a new driver Y.
2. Brothers → Add Driver: another name, Y's email and phone → Save.

**Expected result:** "<name> added with access issue." and a cross-company conflict with Y (as in the other
direction).

**Actual result:** 200, no popup, `conflicts` empty.

**Question for the developers:** is the other company found through the DSP ownership (Brothers owns several
stations: ABC, BRO1, …)? The check seems to look only at some stations.

---

## BUG-API-042: Activation: a driver is activated although the same person is active in another company

|                     |                                                          |
| ------------------- | -------------------------------------------------------- |
| **Screen**          | Leaderboard → status switch; Driver page → Edit → Status |
| **Severity**        | High                                                     |
| **Priority**        | P2                                                       |
| **Status**          | Open                                                     |
| **Found on**        | 2026-11-05 (staging, QA drivers)                         |
| **Automated tests** | `rehire/roles-and-access.spec.js` TC_106                 |

**Summary:** sheet REQ-12 / TC_106: activating a driver who is active in another company shows "This driver is
already active in another company." and Send Request. On staging an inactive earthhh driver whose email and
phone belong to an active Brothers driver is activated at once, through the status switch (200) and through
Edit Driver (201). (Granting sign-in to the same driver is refused correctly: "Cross-company conflict must be
resolved by Super Admin before enabling sign-in or activating this driver.")

**Steps to replicate**

1. Brothers has an active driver X; earthhh adds a driver with X's email and phone (saved with access issue).
2. earthhh makes that driver inactive, then active again (status switch, or Edit → Status Active).

**Expected result:** refused with the cross-company message and Send Request.

**Actual result:** the driver is active again; two active identities with the same email and phone.

---

## BUG-API-044: Add Driver: an admin can add a driver to a station of another company

|                     |                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Screen**          | Leaderboard → Add Driver (the server; the screen offers only the admin's own stations) |
| **Severity**        | High                                                                                   |
| **Priority**        | P1                                                                                     |
| **Status**          | Open                                                                                   |
| **Found on**        | 2026-11-06 (staging, the suite run as earth@yopmail.com)                               |
| **Automated tests** | — (seen in `drivers/add-driver.spec.js`, run as another company)                       |

**Summary:** Add Driver does not check that the station in `station_code` belongs to the admin's company.
Logged in as earthhh's owner (station TTT 700), Add Driver with `station_code: ["541"]` (DYY1, a station of
another DSP, PAPAYA LMD) answered **200** and saved the driver on station 541: driver 39784 "Avery Collins"
appears in earthhh's driver list with `stations: [{ station_id: 541 }]`. Five such drivers were created by one
test run (made inactive afterwards).

**Steps to replicate**

1. Log in as earth@yopmail.com, select TTT.
2. `POST /lmd/usrsrv/drivers/v1/driver` with a new name, email, phone, transporter ID and
   `"station_code": ["541"]`.

**Expected result:** 403 (or 400): the station is not one of the admin's stations.

**Actual result:** 200, the driver is saved with station 541.

**Business impact:** any admin can put drivers on another company's station (and may see or change that
station's data through them); the data of two DSPs gets mixed. Probably the same for other station-based
calls (to check: Edit Driver, call-outs, rescues).

---

## BUG-API-045: Announcements: a promoted admin cannot send an announcement

|                     |                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Screen**          | Announcements → Create announcement → Review & send → Send announcement                  |
| **Severity**        | High                                                                                     |
| **Priority**        | P2                                                                                       |
| **Status**          | Fixed (retested 2026-11-12)                                                              |
| **Found on**        | 2026-11-11 (staging, DYY6, promoted admin koala11)                                       |
| **Automated tests** | `announcements/admin-roles.spec.js` ROLE-11, `ui/announcements/roles.spec.js` ROLE-UI-06 |

**Summary:** story AC1/AC2: Owners/Admins create announcements. A driver promoted to admin ("Promote As An
Admin") gets the Create button, the create page and the review, but Send fails with the server's raw message
"announcements_staging validation failed: created_by: Only owner or admin can create an announcement". The
server checks the user's `role`, which stays "driver" for a promoted admin (`api_role_key: "admin"`,
`has_promoted_station: true`).

**Steps to replicate**

1. Log in as koala11@yopmail.com (promoted admin of DYY6), select DYY6.
2. Announcements → Create announcement → title, description, Selected drivers → one driver → Review & send →
   Send announcement.

**Expected result:** the announcement is sent ("Announcement sent to 1 driver."). If promoted admins must not
create, the Create button must be hidden and the story updated.

**Actual result:** 400, red toast with the raw validation message; nothing is sent.
`POST /lmd/prfsrv/announcements/v1/create` with the promoted admin's token → 400.

**Business impact:** promoted admins cannot use the module the story gives them; the error is a technical
message.

---

## BUG-API-046: Announcements: a promoted admin is treated as a driver in comments

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Screen**          | Announcement details → Comments (the server; the screen is correct) |
| **Severity**        | Medium                                                              |
| **Priority**        | P3                                                                  |
| **Status**          | Fixed (retested 2026-11-12)                                         |
| **Found on**        | 2026-11-11 (staging, DYY6, promoted admin koala11)                  |
| **Automated tests** | `announcements/admin-roles.spec.js` ROLE-12, ROLE-13                |

**Summary:** story AC5: in "Drivers comment, admins reply" admins can only reply and cannot start a new
comment. The owner and admins get 403 "Drivers start the comments on this announcement, you can only reply";
a promoted admin gets 200 "Comment posted". The screen hides the comment box for the promoted admin, but the
server accepts the call. Every comment of a promoted admin is also saved with `author.role: "driver"`.

**Steps to replicate**

1. As the owner, send an announcement with comments "Drivers comment, admins reply".
2. As koala11: `POST /lmd/prfsrv/announcements/v1/<id>/comments` `{ "text": "..." }`.

**Expected result:** 403, as for every admin; the comment's author role is the admin role.

**Actual result:** 200 "Comment posted"; `author.role` is "driver".

**Business impact:** in a private ("admins reply") announcement, a promoted admin can start a thread that
drivers were meant to start; the comment is shown as a driver's.

---

## BUG-API-047: Announcements: a newly added driver does not receive the earlier "All drivers" announcements

|                     |                                                                     |
| ------------------- | ------------------------------------------------------------------- |
| **Screen**          | Announcements (All drivers) after Leaderboard → Add Driver          |
| **Severity**        | High                                                                |
| **Priority**        | P2                                                                  |
| **Status**          | Open (to confirm: added at creation or at first driver-app login?)  |
| **Found on**        | 2026-11-11 (staging, DYY6)                                          |
| **Automated tests** | — (needs an "All drivers" announcement: manual, ANN-200 to ANN-203) |

**Summary:** story AC4/AC13: drivers added later receive the earlier "All drivers" announcements. "vbgfb"
(All drivers, sent 01:06 UTC, `includes_new_drivers: true`) still has 64 recipients; the driver joennn
(driver 40057, user 36129), added afterwards, is not in its Activity. "safety policy", sent at 06:30 UTC, has
65 recipients including joennn. Jira text in `docs/announcements-jira-drafts.md`.

**Expected result:** "vbgfb" lists joennn (Not seen) and shows 65 recipients.

**Actual result:** 64 recipients; joennn missing.

---

## Suggestions (not bugs)

These are ideas to make the server better. Nothing is wrong today, so they have no known-bug tests.

| ID          | Suggestion                                                                                                                                                                                                                                                                                                                                                                                                                       | Where                                                                                                           |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| SUG-API-001 | When an address is called the wrong way (for example POST instead of GET), answer **405 Method Not Allowed** instead of 404 "API Not Found". Today the answer says the address does not exist, which is confusing. (The POST test in each file checks today's 404.)                                                                                                                                                              | All dashboard, graph and Leaderboard addresses; the users part (for example Add Driver) answers 404 "Not Found" |
| SUG-API-002 | Leaderboard → Smart Insights shows "Huge Rank Drop" for a drop of only 1 place (#2 → #3). Use a clearer label, or show it only for bigger drops.                                                                                                                                                                                                                                                                                 | `/compare/v3/insights`                                                                                          |
| SUG-API-003 | The date error says "Expected format: YYYY-MM-DD", but American dates (month-day-year, for example 09-01-2025) are also accepted and read correctly. Accept one format only, or change the message.                                                                                                                                                                                                                              | `dashboard_data` (probably also `dashboard_drivers` and `daily_insights`)                                       |
| SUG-API-004 | The Driver page → Weekly graph sends the name of the metric (`field`) between the weeks, so an app must skip it when it reads the weeks. The Your Scorecard graph sends it next to the weeks. Use the same place in both.                                                                                                                                                                                                        | `/graph/v2/driver_compare_scorecard_graph`                                                                      |
| SUG-API-005 | 9 of the 11 graph addresses are not used by any LMDmax web app (checked on 2026-09-24 in the performance, fleet and payroll web apps). Ask if another app (for example a mobile app) uses them. If not, remove them: less code to maintain and to protect.                                                                                                                                                                       | `driver_current_scorecard_graph` and the 8 dashboards (`*_dashboard`, `attendance_extras`)                      |
| SUG-API-006 | Graph labels mix readable text ("Unexcused", "Total") and code names ("unexcused_callout", "Fico\_<\_800"). Use readable labels everywhere.                                                                                                                                                                                                                                                                                      | `/graph/v2/attendance_extras`, `/graph/v2/e_mentor_dashboard`                                                   |
| SUG-API-007 | Without a login, the users part of the server (for example Add Driver) answers in another form than the rest: `{"error": "Access token required in Authorization header."}`, and it names a header these addresses do not use. Use the same form and message everywhere.                                                                                                                                                         | `/lmd/usrsrv/...`, for example Add Driver                                                                       |
| SUG-API-008 | The dashboard counts write-ups as "total" and "unsigned" only. A write-up the driver refused is counted as neither, so a manager cannot see refusals on the dashboard. Add a "refused" count.                                                                                                                                                                                                                                    | Dashboard → Daily Highlights (`dashboard_data`, `team.writeup`)                                                 |
| SUG-API-009 | Suspend and Resume answer with unclear messages, for example "Driver profile processing windows finalized successfully across all database channels." and "Targeted block status released and synchronized successfully.". Use plain messages: "Driver suspended", "Driver resumed", "start and end are required", "driver_id is required". (Then QA updates the message in `drivers/driver-lifecycle.spec.js` TC-06 and TC-07.) | `/lmd/prfsrv/suspended/v3/suspend_driver` and `/suspend_driver/update`                                          |
| SUG-API-010 | The ratings report sends the total rating with a long number, for example 26.369999999999997 instead of 26.37 (probably the weekly ratings added up without rounding). The average is rounded ("8.79"). Round the total to 2 decimals too, so a screen or an export never shows the long number.                                                                                                                                 | `/lmd/prfsrv/driver_rating/v2/get_ratings_report`                                                               |
| SUG-API-011 | Control Tower sign-in without its details (`login_id`) answers **409** "params missing". 409 means "already exists"; a missing detail is a **400**, as in the rest of the server. (`login/control-tower.spec.js` TC-02 accepts any 4xx.)                                                                                                                                                                                         |

## Test environment requests

Requests to the people who run staging. They are not bugs in LMDmax.

| ID      | Request                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ENV-001 | **Staging login limit.** Staging allows 200 logins per 10 minutes, then refuses more (429). Since 2026-09-24 the tests log in once per run (`global-setup.js`), so a full run uses about 20 logins. The limit can still be reached when several people and CI run the tests within 10 minutes. Please raise or remove the limit for the QA test account on staging (the limit is fine in production). Until then: wait 10 minutes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ENV-002 | **An account only for automation.** The test account can open 5 stations (DYY6, DYY1, WAQA, AAA, SDSD), and a login opens the station the account used last. On 2026-09-24 that station changed twice, so the tests got other data (for example 64 drivers instead of 103). The tests now choose station DYY1 after login (`TEST_STATION_ID`), which also makes DYY1 the last station for the next person who logs in with this account. Please create an account for automation only, which nobody uses in the web app, with access to station DYY1 only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ENV-003 | **Test data for 4 graph dashboards.** Station DYY1 has no delivery, quality, EOC or e-Mentor reports on staging (checked from 2020-01-01 to 2026-09-24), so these 4 graph dashboards return no drivers and 0 for every value. Their tests can only check the structure. Please load a few days of these reports for DYY1 (for example in August 2026); then QA adds tests for real values. The driver page's Weekly tab has no PPS, WHC, DA Weekly Overview or customer feedback report for DYY1 either (week 34), so `scorecard/driver-scorecard.spec.js` TC-28 can only check that the answer is a list.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ENV-004 | **A way to remove test drivers and write-ups.** Drivers can only be deactivated, not deleted. The daily write-up journeys (`e-signature/write-up-journeys.spec.js`, `tests/ui/write-up-journey.spec.js`) leave about 4 signed or refused write-ups per run on the test driver Jordan Whitaker, which the web app cannot delete. The acknowledgement journey (`e-signature/acknowledgement-journeys.spec.js` TC-01) leaves one signed acknowledgement per run. The daily Add Driver test (`drivers/add-driver.spec.js` TC-01) adds one realistic driver per run (a yopmail email with a run number, a phone with area code 555) and deactivates it with the reason "QA automation test driver". The driver lifecycle tests use Riley Thompson (38308, API tests) and Morgan Ellis (38309, UI test), added on 2026-09-25: a daily run adds up to 6 suspensions to the suspended drivers report of DYY1 (they cannot be deleted) and entries to their timelines. The rescue tests use Casey Brooks (38315, added on 2026-09-25) as the rescuer and delete every rescue they save. Please add a delete option for QA, or clean these records up on staging from time to time. |
| ENV-005 | **Staging went down while call-out tests ran.** On 2026-09-25 the staging server answered 502 Bad Gateway for about a minute, twice, while call-out tests ran: at about 09:06 and 09:37 UTC. Sending the same requests again later did not cause an outage, so the cause is unknown. Please check the server logs for these times. Until then the suite has no tests for the call-out rows of BUG-API-015.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ENV-006 | **Test accounts for the login test sheet.** 63 of the 138 Performance login cases (see `docs/login-test-coverage.md`) need accounts that staging does not have: a driver, a dispatcher/manager, a member, a demoted admin, a promoted admin, a deactivated, a deleted, an invited (not accepted), an unverified and a removed-from-company user, a user whose email has + . _ -, an admin of a company with an expired subscription and of a company without Performance, a user in 2 companies, and a user who is admin in one company and driver in another. The OTP, Forgot Password and role-change cases also need a mailbox the tests can read (for example a yopmail address only for automation), and the Google/Apple cases a linked test Google account and Apple ID. Please create them on staging, with passwords the QA team keeps in the CI secrets.                                                                                                                                                                                                                                                                                                        |

## History

### Closed: not bugs

| Old ID      | Report                                          | Why it is not a bug                                                                                                                                                |
| ----------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| BUG-API-003 | `dashboard_data`: end before start not rejected | Tested with Swagger's `start_date` / `end_date` (ignored). With `start` / `end` the server correctly returns 400. Checked by dashboard data TC-20.                 |
| BUG-API-004 | Swagger: `x-access-user` header not documented  | It is documented: **Authorize** → `userAuth` ("Enter your user account id"). The first Swagger curl lacked it because that field was empty.                        |
| BUG-API-002 | `dashboard_data`: `01-12-2025` accepted         | The server reads American dates (`MM-DD-YYYY`) correctly: `01-12-2025` is 12 January. Real `DD-MM-YYYY` dates are refused (dashboard data TC-17). See SUG-API-003. |

### Old ID → new ID

On 2026-09-24 repeated bugs were merged into general ones. Old IDs (used in pull requests #1 to #4)
map to:

| Old | New                 | Old | New              | Old | New                   |
| --- | ------------------- | --- | ---------------- | --- | --------------------- |
| 001 | BUG-API-001         | 013 | BUG-API-003      | 025 | BUG-API-010           |
| 002 | closed, SUG-API-003 | 014 | BUG-API-005      | 026 | BUG-API-011, 012, 013 |
| 003 | closed              | 015 | BUG-API-001      | 027 | BUG-API-001           |
| 004 | closed              | 016 | BUG-API-011, 013 | 028 | BUG-API-001           |
| 005 | BUG-API-005         | 017 | BUG-API-001      | 029 | BUG-API-001, 003      |
| 006 | BUG-API-003         | 018 | BUG-API-005      | 030 | BUG-API-001           |
| 007 | SUG-API-001         | 019 | BUG-API-013      | 031 | BUG-API-006           |
| 008 | BUG-API-011         | 020 | BUG-API-011, 013 | 032 | BUG-API-008           |
| 009 | BUG-API-013         | 021 | BUG-API-004      | 033 | BUG-API-007           |
| 010 | BUG-API-003         | 022 | BUG-API-003      | 034 | SUG-API-002           |
| 011 | BUG-API-002         | 023 | BUG-API-002      | 035 | BUG-API-012, 013      |
| 012 | ENV-001             | 024 | BUG-API-009      |     |                       |

---

## Adding a new bug

1. **Check that it is a real bug.** Compare with what the web app sends (F12 → Network), and with
   Swagger. Use the same details as the web app.
2. **Is it the same problem as a bug in this file?** (For example another internal error message.)
   Then add a row to that bug's "Where it happens" table instead of a new bug.
3. **Otherwise** copy the template below, give it the next ID, and add it to the [Summary](#summary)
   and to [Bugs by screen](#bugs-by-screen).
4. **Write a test** for the correct behaviour: add `@knownbug` to its tags and the bug ID to the end
   of its title, for example `'TC-04: Verify that ... (BUG-API-022)'`.
5. **Use simple words.** Write for a reader who does not know the code: say what the manager does on
   the screen and what the server does. Put addresses, requests and answers under Technical details.

```markdown
## BUG-API-0XX: <Screen>: <what is wrong, in simple words>

|                     |                                                     |
| ------------------- | --------------------------------------------------- |
| **Screen**          | <menu → page>, for example Data Management → Rescue |
| **Severity**        | High / Medium / Low                                 |
| **Priority**        | P1 / P2 / P3 / P4                                   |
| **Status**          | Open                                                |
| **Found on**        | YYYY-MM-DD (staging, station DYY1)                  |
| **Automated tests** | `<folder>/<file>.spec.js` TC-XX                     |

**Summary:** what is wrong, in one or two short sentences.

**Before you start:** the login, the station and the test data (for example a test driver).

**Steps to replicate**

In the web app (correct):

1. Open **<menu> → <page>**.
2. ...

Through the server (the bug):

3. ... (see Technical details)

**After the test:** how to put the data back.

**Expected result:** what should happen.

**Actual result:** what happens.

**Business impact:** why it matters: for the manager, the drivers, the numbers, money, the law or
security.

**How to check the fix:** run `npx playwright test --grep "BUG-API-0XX"`. The tests pass when the bug
is fixed. Then QA removes `@knownbug` and `(BUG-API-0XX)` from them.

<details>
<summary>Technical details (for developers)</summary>

- `METHOD /path` with `{ the body }` → status and answer.
- The web app's rule (where it is in the web app's code, if known).

</details>
```
