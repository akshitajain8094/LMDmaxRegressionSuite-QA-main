# Error messages show internal technical text instead of a clear message

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Medium |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-23 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (30 of 33 automated checks fail) |
| QA reference | BUG-API-003 |
| Attach | api-proof.png, api-proof.txt |

> Partly fixed on 2026-11-16: deleting a call-out / rescue that does not exist and a rescue with a wrong date format now give clear messages. The other cases in the proof still show technical text.

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

**Technical details (for developers)**

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
