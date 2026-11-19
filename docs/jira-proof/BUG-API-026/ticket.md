# Sign in: the password also works with spaces before or after it

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Medium |
| Screen | Sign In (email and password) |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-API-026 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** the server removes spaces (and tabs) at the start and the end of the password before it
checks it. So `Test@123 ` and ` Test@123` log in like `Test@123`. The login test sheet
(TC_LOGIN_036) says a password must be checked exactly as typed.

**Before you start:** the test login (any account works).

**Steps to replicate**

1. Open the Performance login page.
2. Type the email and the correct password, and add one space at the end of the password.
3. Click **Sign In**.

**Expected result:** "Invalid Credentials". A password is checked exactly as typed.

**Actual result:** the login works. The same with a space before the password, three spaces, or a tab.

**Question for the product owner:** is this on purpose (for example because people copy passwords
with a space)? If yes, close this bug and change TC-21 to expect a login. If not, the server must
stop trimming the password. Note that a password that really starts or ends with a space can then never
be used as typed.

**Business impact:** small for security (the right characters are still needed), but a password is
not checked as the user typed it, which differs from what the test sheet and most products do.

**Technical details (for developers)**

- `POST /lmd/usrsrv/users/v1/user/perf_login` with `{ "email": "<test user>", "password": "<password> " }`
  → 200 and a token. The same with `" <password>"`, `"<password>   "` and `"<password>\t"`.
- The email is also trimmed (`login/login.spec.js` TC-04), which is expected for an email.
