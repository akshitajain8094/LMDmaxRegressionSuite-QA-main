# Login page: without internet the message is "Something Went Wrong"

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Sign In |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-UI-003 |
| Attach | video-1.webm (the message shows only for a moment, so there is no screenshot) |

**Summary:** when there is no internet, Sign In shows "Something Went Wrong". The login sheet
(TC_LOGIN_128) asks for a "No internet connection" message.

**Steps to replicate**

1. Open the login page and type an email and a password.
2. Switch off the internet (or DevTools → **Network** → **Offline**).
3. Click **Sign In**.

**Expected result:** "No internet connection" (or similar), and Sign In works again.

**Actual result:** "Something Went Wrong". Sign In works again (correct).

**Business impact:** the user does not know that the problem is their own connection.
