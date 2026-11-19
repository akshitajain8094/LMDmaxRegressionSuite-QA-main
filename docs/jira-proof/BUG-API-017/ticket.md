# Write-ups and rescues: the "last changed" time does not change after an edit

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-25 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-017 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

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
