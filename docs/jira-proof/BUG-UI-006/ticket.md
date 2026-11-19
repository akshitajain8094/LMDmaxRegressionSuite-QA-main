# Login page: with both boxes empty, only one "Field cannot be empty" message is shown

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Sign In |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-UI-006 |
| Attach | screenshot-1.png, video-1.webm |

**Summary:** with the email and the password empty, Sign In shows one "Field cannot be empty". The login
sheet (TC_LOGIN_030) asks for a message at each box.

**Steps to replicate**

1. Open the login page and leave both boxes empty.
2. Click **Sign In**.

**Expected result:** a message at the email box and at the password box.

**Actual result:** one message. After the email is filled in, the same message is shown for the password.

**Business impact:** small: the user fixes one box, clicks again, and only then learns about the second.
