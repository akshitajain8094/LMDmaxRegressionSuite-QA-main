# Forgot Password: an unregistered email answers "not found" and "success" at the same time

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Sign In → Forgot Password? → Send OTP |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-API-027 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** when Forgot Password is asked for an email that has no account, the server answers
"user not found" with the status 404, but also says `"success": true`.

**Before you start:** nothing special.

**Steps to replicate**

In the web app (correct):

1. Open the login page and click **Forgot Password?**.
2. Type `xyz_unreg_perf@yopmail.com` and click **Send OTP**. The screen shows "User Not Found".

Through the server (the bug):

3. Send the same request (see Technical details) and read the answer.

**Expected result:** `"success": false`, as in every other refused request.

**Actual result:** `"success": true` together with the status 404 and the message "user not found".

**Business impact:** the web app reads the status, so the screen is right today. Another app, an
integration or a future screen that reads `success` would think the OTP was sent.

**Technical details (for developers)**

- `POST /lmd/usrsrv/users/v1/user/credentials/request` with `{ "identifier": "xyz_unreg_perf@yopmail.com" }`
  → 404 `{ "success": true, "message": "user not found", "action": "forgot_password" }`.
- The same kind of mismatch (an error status with `"success": true`) is noted in BUG-API-025 for the
  driver's signing link.
