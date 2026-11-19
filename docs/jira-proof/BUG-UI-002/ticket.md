# Sign In With OTP: an unregistered email or mobile number shows "Something went wrong"

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Medium |
| Screen | Sign In → Sign In With OTP |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-UI-002 |
| Attach | screenshot-1.png, video-1.webm, screenshot-2.png, video-2.webm |

**Summary:** Reported Issue #1 of the login sheet (an unregistered user logs in with OTP) is **fixed in
the server**: no OTP is sent (`tests/api/login/otp-login.spec.js` passes). But the screen then shows
"Something went wrong", which sounds like a breakdown, instead of saying that the account does not exist.

**Steps to replicate**

1. Open the login page and click **Sign In With OTP**.
2. Type `unreg_perf01@yopmail.com` (or the mobile number `5550001234`) and click **Send OTP**.

**Expected result:** a clear message, for example "Account not found / not registered" (TC_LOGIN_133,
TC_LOGIN_110), and no OTP boxes.

**Actual result:** no OTP boxes (correct), but the message "Something went wrong".

**Business impact:** a user with a typo in the email thinks the app is broken and contacts support, or
tries again and again.

**Technical details:** the server answers 404 `"user not found"`. The web app looks up its own message
by `data.status_code`, which this answer does not have, so it shows its fallback "Something went wrong".
Forgot Password shows "User Not Found" for the same case.
