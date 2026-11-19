# The server saves wrong data that the screens do not allow

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | High |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-24 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (7 of 8 automated checks fail) |
| QA reference | BUG-API-015 |
| Attach | api-proof.png, api-proof.txt |

> Partly fixed on 2026-11-16: an empty threshold value is now rejected. The other cases in the proof are still saved.

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

**Technical details (for developers)**

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
