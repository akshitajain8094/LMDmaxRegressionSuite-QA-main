# A date range that ends before it starts is accepted

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Medium |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-23 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (13 of 13 automated checks fail) |
| QA reference | BUG-API-002 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

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
