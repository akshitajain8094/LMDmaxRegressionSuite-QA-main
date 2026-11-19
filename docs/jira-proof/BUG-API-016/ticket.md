# E-Signature: a signed or refused write-up can still be deleted

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Driver page → E-Signature |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-25 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-API-016 |
| Attach | api-proof.png, api-proof.txt |

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

**Technical details (for developers)**

- `DELETE /lmd/prfsrv/e-signature/v1/<write-up id>` for a write-up with `status: "signed"` (with the
  driver's signature) or a refused one → 200 `"Report deleted successfully."`.
- The web app's rule (driver page → E-Signature): Delete is shown only for the statuses "sent" and
  "draft".
