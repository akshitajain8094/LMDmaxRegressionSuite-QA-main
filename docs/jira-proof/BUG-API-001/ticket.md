# Wrong or missing details in a request give empty or wrong data instead of an error

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | High for the dashboard, Medium for the rest |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-23 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (31 of 31 automated checks fail) |
| QA reference | BUG-API-001 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

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
