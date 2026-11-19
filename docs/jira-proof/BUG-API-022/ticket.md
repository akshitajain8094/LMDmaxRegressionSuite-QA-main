# Rescue: a driver can be their own rescuer, and an inactive driver can be a rescuer

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Medium |
| Screen | Data Management → Rescue |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-25 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (1 of 2 automated checks fail) |
| QA reference | BUG-API-022 |
| Attach | api-proof.png, api-proof.txt |

> Partly fixed on 2026-11-16: a driver can no longer be their own rescuer. An inactive driver can still be a rescuer (this ticket).

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

**Technical details (for developers)**

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
