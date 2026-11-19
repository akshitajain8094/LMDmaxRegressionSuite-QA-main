# Login page: "Forgot Password?" cannot be reached with the Tab key

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Sign In |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-02 (staging) |
| Retested | 2026-11-16: still reproduces (1 of 1 automated checks fail) |
| QA reference | BUG-UI-004 |
| Attach | screenshot-1.png, video-1.webm |

**Summary:** with the keyboard (Tab key), the focus goes Email → Password → eye icon → **Sign In**. It
skips "Forgot Password?", so a keyboard user cannot open it.

**Steps to replicate**

1. Open the login page and click in the email box.
2. Press **Tab** 3 times.

**Expected result:** Email → Password → eye icon → Forgot Password? → Sign In (TC_LOGIN_013).

**Actual result:** Email → Password → eye icon → Sign In. "Forgot Password?" is plain text, not a link
or a button.

**Business impact:** accessibility: users who cannot use a mouse cannot reset their password.
