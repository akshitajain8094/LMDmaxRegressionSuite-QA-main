# Your Scorecard: the weekly insights of a week without data give a program error

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Medium |
| Screen | Dashboard → Your Scorecard (Smart Insights) |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-23 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-004 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

- `GET /dashboard/v1/weekly_insights?start=202601&end=202601&type=dsp` (a valid week without a
  scorecard) → 400 `"Cannot read properties of undefined (reading 'metrics')"`.
- `GET /dashboard/v1/weekly_insights?start=203001&end=203001&type=dsp` (a future week) → the same.
- `dashboard_data_weekly` answers `"No data found for the specified week"` in this case.
