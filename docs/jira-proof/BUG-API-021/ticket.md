# Driver status: the server does not follow the Leaderboard rules for suspended and inactive drivers

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | Medium |
| Screen | Dashboard → Leaderboard (status switch, row menu) |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-25 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-021 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** the Leaderboard has three rules: the status of a suspended driver cannot be changed, a
suspended driver can only be resumed (not suspended again), and only an active driver can be
suspended. The server accepts all three.

**Before you start:** log in to the web app as a manager and choose station DYY1. Use the test driver
Riley Thompson (38308).

**Steps to replicate**

In the web app (correct):

1. Open **Dashboard → Leaderboard** and find Riley Thompson in the list (use the search box of the
   Leaderboard).
2. Open the row menu of Riley Thompson → **Suspend Driver**. Choose From = today and To = tomorrow,
   write the details and confirm. Riley Thompson is now in the list of suspended drivers.
3. Click the status switch of Riley Thompson. The screen shows "You have selected suspended driver
   remove the suspended driver" and does not change the status.
4. Open the row menu again: it shows **Resume Driver** instead of Suspend Driver.

Through the server (the bug):

5. Deactivate Riley Thompson (see Technical details).
6. Resume Riley Thompson (row menu → **Resume Driver**) and look at the status.

**After the test:** switch Riley Thompson back to active.

**Expected result:** the server refuses to change the status of a suspended driver, refuses a second
suspension, and refuses to suspend an inactive driver.

**Actual result:** the server accepts all of them:

- Deactivate a suspended driver: accepted. The driver still shows as suspended, and after Resume the
  driver is inactive.
- Suspend a suspended driver again: accepted. The driver now has two suspensions for the same days.
- Suspend an inactive driver: accepted. The inactive driver becomes suspended.

**Business impact:** a driver can end up in a status that the web app never shows (inactive under a
suspension), and Resume then gives the driver a status the manager did not choose.

**Technical details (for developers)**

- Suspend: `POST /lmd/prfsrv/suspended/v3/suspend_driver` with
  `{"suspend_data": {"driver_id": "38308", "start": "<today>", "end": "<tomorrow>", "notes": "..."}}`.
- Deactivate while suspended: `PATCH /lmd/usrsrv/drivers/v1/statusUpdate` with
  `{"status": "inactive", "id": ["38308"], "type": "single"}` → 200 `"ok"`.
- Suspend again (the same body) → 200: a second suspension for the same days.
- Inactive driver: `POST /lmd/prfsrv/inactive_drivers/v2/save_inactive_driver?driver_id=38308` (the
  reason), then `statusUpdate` with `"inactive"`, then `suspend_driver` → 200: suspended.
- Resume: `POST /lmd/prfsrv/suspended/v3/suspend_driver/update` with `{"driver_id": "38308"}`.
