# Control Tower: the logout works without a login (security)

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **High** |
| Severity | High |
| Screen | Control Tower sign-in (login.lmdmax.com → Performance) |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-API-028 |
| Attach | request-proof.png (exact request: no login headers sent), request-proof.txt, api-proof.png, api-proof.txt |

**Summary:** a user who comes from the Control Tower (login.lmdmax.com) is logged in to the Performance
app with a `login_id`. Its logout address accepts a request **without any login** and changes the
sessions of that `login_id`. Whoever knows or guesses a `login_id` could end another person's session.

**Before you start:** nothing special. The test sends a made-up `login_id`, so no real session is touched.

**Steps to replicate**

Through the server (the bug):

1. Send the Control Tower logout request **without** the headers `x-access-token` and `x-access-user`
   (see Technical details).
2. Read the answer.

**Expected result:** 401 "not logged in", like the normal logout (`login/session.spec.js` TC-04).

**Actual result:** 200 `"success": true`, and the answer shows a database update (`matchedCount: 0` for the
made-up `login_id`).

**Question for the developers:** is a `login_id` long and random enough that it cannot be guessed? Even
then, a logout should need the session's own token.

**Business impact:** a person could log other users out of the Performance app (and maybe the Control
Tower) again and again, without any password.

**Technical details (for developers)**

- `POST /lmd/usrsrv/control_tower/v1/control_tower_logout` with `{ "login_id": "invalid-login-id" }` and
  no login headers → 200 `{ "success": true, "data": [null, { "acknowledged": true, "modifiedCount": 0,
"matchedCount": 0, ... }] }`.
- The web app sends this request with the login headers (`logotToControlTower` in the web app's code),
  but the server does not require them.
- The normal logout `POST /lmd/usrsrv/users/v1/user/logout` without headers → 401.
