# Edit driver: another driver's phone number or transporter ID is saved without a warning

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Driver page → Profile → Edit |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-25 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (3 of 3 automated checks fail) |
| QA reference | BUG-API-020 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

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
