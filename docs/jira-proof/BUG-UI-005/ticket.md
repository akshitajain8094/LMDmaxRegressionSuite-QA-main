# After login, the user does not land on the page they opened before

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Low |
| Screen | Sign In |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-UI-005 |
| Attach | screenshot-1.png, video-1.webm |

**Summary:** a user who opens a page of the app while logged out (for example a link in an email) is
sent to the login page. After the login, they land on Daily Highlights, not on the page they opened.

**Before you start:** the test login.

**Steps to replicate**

1. Log out, then open <https://staging.performance.lmdmax.com/v2/dashboard/your-scorecard>. The login
   page opens (correct).
2. Log in.

**Expected result:** Your Scorecard opens (TC_LOGIN_121).

**Actual result:** Daily Highlights opens.

**Business impact:** links shared by email or chat (for example to a driver page) lose their target,
so the user must find the page again.
