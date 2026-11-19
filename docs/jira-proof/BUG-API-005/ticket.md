# The same information comes in two different forms

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-23 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-005 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

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
