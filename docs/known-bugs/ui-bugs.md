# Known bugs — UI (screens)

This document lists the bugs that our automated tests found on the LMDmax **screens** (the web app at
<https://staging.performance.lmdmax.com>). It is written for everybody: QA, developers, BAs and
managers. Bugs in the server (the API) are in [api-bugs.md](api-bugs.md), which also explains the
[words used](api-bugs.md#words-used).

## Summary

| ID         | Title                                                                                                    | Screen                                           | Severity | Priority | Status     | Automated tests                               |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------- | -------- | ---------- | --------------------------------------------- |
| BUG-UI-001 | Login page: the page takes more than 3 seconds to be ready                                               | Sign In                                          | Low      | P3       | To confirm | `login.spec.js` TC-04                         |
| BUG-UI-002 | Sign In With OTP: an unregistered email or mobile number shows "Something went wrong"                    | Sign In With OTP                                 | Medium   | P2       | Open       | `sign-in-options.spec.js` TC-04, TC-05        |
| BUG-UI-003 | Login page: without internet the message is "Something Went Wrong"                                       | Sign In                                          | Low      | P3       | Open       | `login.spec.js` TC-28                         |
| BUG-UI-004 | Login page: "Forgot Password?" cannot be reached with the Tab key                                        | Sign In                                          | Low      | P3       | Open       | `login.spec.js` TC-10                         |
| BUG-UI-005 | After login, the user does not land on the page they opened before                                       | Sign In                                          | Low      | P4       | Open       | `session.spec.js` TC-07                       |
| BUG-UI-006 | Login page: with both boxes empty, only one "Field cannot be empty" message is shown                     | Sign In                                          | Low      | P4       | Open       | `login.spec.js` TC-18                         |
| BUG-UI-007 | Login page: the Enter key does not log in                                                                | Sign In                                          | Medium   | P2       | Open       | `login.spec.js` TC-24                         |
| BUG-UI-008 | Chat: another admin sees "You deleted this message" in the conversation, although they did not delete it | Chat → Paya Chat                                 | High     | P1       | Open       | `chat-deleted-message.spec.js` TC-06          |
| BUG-UI-009 | Announcements: the title and description take more characters than their limit                           | Announcements                                    | Low      | P3       | To confirm | `announcements.spec.js` ANN-041, ANN-045      |
| BUG-UI-012 | Super Admin: a pending conflict request has no "Send Back for Update"                                    | Super Admin site → Conflict Requests → a request | Medium   | P3       | To confirm | `rehire/super-admin-conflicts.spec.js` TC_096 |
| BUG-UI-013 | Super Admin: no Quick-Accept on a Driver → Admin request                                                 | Super Admin site → Conflict Requests → a request | Medium   | P2       | To confirm | `rehire/super-admin-conflicts.spec.js` TC_076 |

The login bugs were found on 2026-11-02 with the cases of the sheet "LMDmax Login – Test Cases" (see
[login-test-coverage.md](../login-test-coverage.md)), BUG-UI-008 on 2026-11-03 with the sheet "Deleted
Message Preview – Test Cases" (see [chat-deleted-message-coverage.md](../chat-deleted-message-coverage.md)), BUG-UI-009 on 2026-11-04, BUG-UI-012 and BUG-UI-013 on 2026-11-05 with the sheet
"Announcements_Module_Test_Cases" (see [announcements-coverage.md](../announcements-coverage.md)).
The other UI tests (dashboard, and the write-up, call-out, driver suspension and rescue journeys) all
behave as expected.

**Severity** (how bad it is for the business): **High** = wrong data is saved or shown, or a feature
does not work · **Medium** = something works wrong, but there is a way around it · **Low** = a small
problem, for example a spelling mistake.
**Priority** (how soon to fix it): **P1** = fix next · **P2** = fix soon · **P3** = fix later · **P4**
= fix when there is time.
**Status:** **Open** → **In progress** → **Fixed** (checked with the tests) → **Closed**. **To confirm**
= we need an answer from the developers first.

All the bugs below are on the login screen of the Performance app (<https://staging.performance.lmdmax.com/signIn>).
They need no login and no test data, unless written otherwise. Run all of them with
`npx playwright test tests/ui --grep "BUG-UI"`.

---

## BUG-UI-001: Login page: the page takes more than 3 seconds to be ready

|                     |                                |
| ------------------- | ------------------------------ |
| **Screen**          | Sign In                        |
| **Severity**        | Low                            |
| **Priority**        | P3                             |
| **Status**          | To confirm                     |
| **Found on**        | 2026-11-02 (staging)           |
| **Browser**         | Chrome                         |
| **Automated tests** | `tests/ui/login.spec.js` TC-04 |

**Summary:** the login test sheet (TC_LOGIN_001) asks for the login page within 3 seconds. On staging
the page was ready after 5.3 to 7.6 seconds when it was opened alone, and after up to 43 seconds when
4 tests opened it at the same time.

**Steps to replicate**

1. Open DevTools (**F12**) → **Network**, and tick **Disable cache**.
2. Open <https://staging.performance.lmdmax.com/signIn>.
3. Read **DOMContentLoaded** at the bottom of the Network tab.

**Expected result:** less than 3 seconds.

**Actual result:** 5 to 8 seconds (measured from India). The page loads about 4 MB of scripts
(`hooks-….js` is 2.9 MB, `index-….js` 0.9 MB).

**To confirm:** staging may be slower than production, and the time depends on the network. Please
check the time on production and agree on the target.

**Business impact:** a slow first page makes the product feel slow, especially on mobile networks.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-001"`.

---

## BUG-UI-002: Sign In With OTP: an unregistered email or mobile number shows "Something went wrong"

|                     |                                                 |
| ------------------- | ----------------------------------------------- |
| **Screen**          | Sign In → Sign In With OTP                      |
| **Severity**        | Medium                                          |
| **Priority**        | P2                                              |
| **Status**          | Open                                            |
| **Found on**        | 2026-11-02 (staging)                            |
| **Browser**         | Chrome                                          |
| **Automated tests** | `tests/ui/sign-in-options.spec.js` TC-04, TC-05 |

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

**How to check the fix:** run `npx playwright test --grep "BUG-UI-002"`.

**Technical details:** the server answers 404 `"user not found"`. The web app looks up its own message
by `data.status_code`, which this answer does not have, so it shows its fallback "Something went wrong".
Forgot Password shows "User Not Found" for the same case.

---

## BUG-UI-003: Login page: without internet the message is "Something Went Wrong"

|                     |                                |
| ------------------- | ------------------------------ |
| **Screen**          | Sign In                        |
| **Severity**        | Low                            |
| **Priority**        | P3                             |
| **Status**          | Open                           |
| **Found on**        | 2026-11-02 (staging)           |
| **Browser**         | Chrome                         |
| **Automated tests** | `tests/ui/login.spec.js` TC-28 |

**Summary:** when there is no internet, Sign In shows "Something Went Wrong". The login sheet
(TC_LOGIN_128) asks for a "No internet connection" message.

**Steps to replicate**

1. Open the login page and type an email and a password.
2. Switch off the internet (or DevTools → **Network** → **Offline**).
3. Click **Sign In**.

**Expected result:** "No internet connection" (or similar), and Sign In works again.

**Actual result:** "Something Went Wrong". Sign In works again (correct).

**Business impact:** the user does not know that the problem is their own connection.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-003"`.

---

## BUG-UI-004: Login page: "Forgot Password?" cannot be reached with the Tab key

|                     |                                |
| ------------------- | ------------------------------ |
| **Screen**          | Sign In                        |
| **Severity**        | Low                            |
| **Priority**        | P3                             |
| **Status**          | Open                           |
| **Found on**        | 2026-11-02 (staging)           |
| **Browser**         | Chrome                         |
| **Automated tests** | `tests/ui/login.spec.js` TC-10 |

**Summary:** with the keyboard (Tab key), the focus goes Email → Password → eye icon → **Sign In**. It
skips "Forgot Password?", so a keyboard user cannot open it.

**Steps to replicate**

1. Open the login page and click in the email box.
2. Press **Tab** 3 times.

**Expected result:** Email → Password → eye icon → Forgot Password? → Sign In (TC_LOGIN_013).

**Actual result:** Email → Password → eye icon → Sign In. "Forgot Password?" is plain text, not a link
or a button.

**Business impact:** accessibility: users who cannot use a mouse cannot reset their password.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-004"`.

---

## BUG-UI-005: After login, the user does not land on the page they opened before

|                     |                                  |
| ------------------- | -------------------------------- |
| **Screen**          | Sign In                          |
| **Severity**        | Low                              |
| **Priority**        | P4                               |
| **Status**          | Open                             |
| **Found on**        | 2026-11-02 (staging)             |
| **Browser**         | Chrome                           |
| **Automated tests** | `tests/ui/session.spec.js` TC-07 |

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

**How to check the fix:** run `npx playwright test --grep "BUG-UI-005"`.

---

## BUG-UI-006: Login page: with both boxes empty, only one "Field cannot be empty" message is shown

|                     |                                |
| ------------------- | ------------------------------ |
| **Screen**          | Sign In                        |
| **Severity**        | Low                            |
| **Priority**        | P4                             |
| **Status**          | Open                           |
| **Found on**        | 2026-11-02 (staging)           |
| **Browser**         | Chrome                         |
| **Automated tests** | `tests/ui/login.spec.js` TC-18 |

**Summary:** with the email and the password empty, Sign In shows one "Field cannot be empty". The login
sheet (TC_LOGIN_030) asks for a message at each box.

**Steps to replicate**

1. Open the login page and leave both boxes empty.
2. Click **Sign In**.

**Expected result:** a message at the email box and at the password box.

**Actual result:** one message. After the email is filled in, the same message is shown for the password.

**Business impact:** small: the user fixes one box, clicks again, and only then learns about the second.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-006"`.

---

## BUG-UI-007: Login page: the Enter key does not log in

|                     |                                |
| ------------------- | ------------------------------ |
| **Screen**          | Sign In                        |
| **Severity**        | Medium                         |
| **Priority**        | P2                             |
| **Status**          | Open                           |
| **Found on**        | 2026-11-02 (staging)           |
| **Browser**         | Chrome                         |
| **Automated tests** | `tests/ui/login.spec.js` TC-24 |

**Summary:** pressing **Enter** in the email or the password box does nothing. The user must click
**Sign In**.

**Before you start:** the test login.

**Steps to replicate**

1. Open the login page and type the email and the password.
2. Press **Enter**.

**Expected result:** the login starts, as with the Sign In button (TC_LOGIN_014).

**Actual result:** nothing happens. No login request is sent.

**Business impact:** almost every login form works with Enter, so users think the app is stuck. It is
also an accessibility problem.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-007"`.

**Technical details:** the boxes are not inside a `<form>`, and Sign In is a `type="button"`, so the
browser has nothing to submit. A `<form onSubmit>` with a `type="submit"` button fixes it.

---

## BUG-UI-008: Chat: another admin sees "You deleted this message" in the conversation, although they did not delete it

|                     |                                                                  |
| ------------------- | ---------------------------------------------------------------- |
| **Screen**          | Chat → Paya Chat → a conversation whose last message was deleted |
| **Severity**        | High                                                             |
| **Priority**        | P1                                                               |
| **Status**          | Open                                                             |
| **Found on**        | 2026-11-03 (staging, station AQWA)                               |
| **Browser**         | Chrome                                                           |
| **Automated tests** | `tests/ui/chat-deleted-message.spec.js` TC-06                    |

**Summary:** when Admin A deletes the latest message in the Paya Chat, every **other** admin must see
"This message was deleted" in the chat list **and** in the conversation (requirement REQ-02, REQ-03). The
chat list is right. But the conversation shows **"You deleted this message"** to every admin, also to
those who did not delete it. So for Admin B the preview and the conversation say different things, and the
conversation says Admin B did something they did not do.

**Before you start:** two admins of the same station, for example on AQWA: Arth (who deleted) and gyani
(`gyani@yopmail.com`, who did not).

**Steps to replicate**

1. As Admin A: **Chat → Paya Chat** → a driver → hover the latest message → trash icon → **Delete**.
2. Log in as Admin B on the same station and open **Chat → Paya Chat**.
3. Read the driver's row in the chat list, then open the conversation and read the last message.

**Expected result:** "This message was deleted" in the row **and** in the conversation (sheet cases TC_03,
TC_07, TC_17).

**Actual result:** the row says "This message was deleted" (correct), the conversation says "You deleted
this message". Seen on AQWA, Abraham Osher's conversation, as gyani; the message was deleted by Arth. Confirmed by UI
TC-06 on 2026-11-03 (Aksh's conversation): the conversation showed "You deleted this message 3:27 PM" to gyani.

**Business impact:** admins are told they deleted messages they never touched, and the two places of the
screen disagree. This is the main rule of the requirement ("You deleted" only for the admin who deleted).

**How to check the fix:** run `npx playwright test --grep "BUG-UI-008"` (needs `CHAT_*` and `ADMIN_B_*`
in `.env.staging`, see docs/chat-deleted-message-coverage.md).

**Technical details:** the server sends the right text for each viewer (`content: "This message was
deleted"` for Admin B), and the preview uses it. The conversation ignores it and chooses its own text by
the bubble side: `authority === "mine"` → "You deleted this message", otherwise "This message **has been**
deleted". In the Paya Chat every admin message is sent as the station, so `authority` is `"mine"` for
every admin. Fix: show the server's `content` for a deleted message, or compare `deleted_by` with the
viewer's own id (`my_id`). The second text ("has been deleted") also differs from the requirement and from
the preview ("was deleted").

---

## BUG-UI-009: Announcements: the title and description take more characters than their limit

|                     |                                                           |
| ------------------- | --------------------------------------------------------- |
| **Screen**          | Announcements → Create announcement / Edit announcement   |
| **Severity**        | Low                                                       |
| **Priority**        | P3                                                        |
| **Status**          | To confirm                                                |
| **Found on**        | 2026-11-04 (staging, station DYY6)                        |
| **Browser**         | Chrome                                                    |
| **Automated tests** | `tests/ui/announcements.spec.js` ANN-041/042, ANN-045/046 |

**Summary:** the sheet says the 101st character of the title (and the 10,001st of the description) is not
accepted, typed or pasted, and the counter stays at 100 / 100. The app takes the extra characters, turns
the title red with "Title cannot exceed 100 characters. 101 / 100" (description: "10,001 / 10,000
characters"), and blocks **Review & send** until the text is shorter.

**Steps to replicate**

1. Open **Announcements → Create announcement**.
2. Type or paste 101 characters into **Title**.

**Expected result (sheet ANN-041, ANN-042, ANN-045, ANN-046):** the box stops at 100 characters; the
counter shows 100 / 100.

**Actual result:** the box holds 101 characters; "Title cannot exceed 100 characters. 101 / 100".

**Question for the product owner:** both ways stop a too-long announcement. Which one is wanted? If the
app is right, change the 4 sheet cases and QA turns these tests into normal tests.

---

## BUG-UI-012: Super Admin: a pending conflict request has no "Send Back for Update"

|                     |                                                             |
| ------------------- | ----------------------------------------------------------- |
| **Screen**          | Super Admin site → Conflict Requests → a request (See More) |
| **Severity**        | Medium                                                      |
| **Priority**        | P3                                                          |
| **Status**          | To confirm (BA)                                             |
| **Found on**        | 2026-11-04 / 05 (staging)                                   |
| **Browser**         | Chrome                                                      |
| **Automated tests** | `tests/ui/rehire/super-admin-conflicts.spec.js` TC_096      |

**Summary:** sheet REQ-10 / TC_096 says the Super Admin can **Send Back for Update** (the requester is told to
change the details). A pending request shows only Quick-Accept (when allowed), UPDATE & RESOLVE and Cancel
Request; there is no Send Back for Update on any pending request we opened.

**Steps to replicate:** Super Admin site → Conflict Requests → See More on a PENDING request.

**Expected result (TC_096):** a "Send Back for Update" action; the requester is notified.

**Actual result:** no such button.

**Question for the BA:** is Send Back for Update still planned (and OQ-10: which status after it)?

Also seen on the same page (2026-11-05, to discuss with the BA):

- **Cancel Request** declines the request at once, without an "are you sure?" step.
- **UPDATE & RESOLVE** with details that still conflict (only the phone changed while the email also
  conflicts): the button does nothing and no message says why.

---

## BUG-UI-013: Super Admin: no Quick-Accept on a Driver → Admin request

|                     |                                                             |
| ------------------- | ----------------------------------------------------------- |
| **Screen**          | Super Admin site → Conflict Requests → a request (See More) |
| **Severity**        | Medium                                                      |
| **Priority**        | P2                                                          |
| **Status**          | To confirm (BA / developers)                                |
| **Found on**        | 2026-11-05 (staging)                                        |
| **Browser**         | Chrome                                                      |
| **Automated tests** | `tests/ui/rehire/super-admin-conflicts.spec.js` TC_076      |

**Summary:** sheet REQ-09 (TC_076, TC_081): when a person who is a **driver** is requested as an **admin**,
the Super Admin gets **Quick-Accept** (the driver is made inactive, the admin is added). On a pending
Driver → Admin request (WWE → Bird, "Same Phone Number", existing account an active driver) the page shows
only UPDATE & RESOLVE and Cancel Request. (For a Driver → Driver request of another company Quick-Accept is
shown, correct.)

**Steps to replicate:** Super Admin site → Conflict Requests → See More on a PENDING request with Requested
Role "Admin" whose existing account has Role "Driver".

**Expected result:** Quick-Accept and its confirmation "This user is already added as a Driver …" (TC_077).

**Actual result:** no Quick-Accept.

**Question:** is Quick-Accept only offered when both email and phone match? The request seen had a phone
conflict only.

---

## Adding a new bug

1. **Check that it is a real bug.** Try it again, on staging, with station DYY1. Note exactly what you
   clicked.
2. **Copy the template below**, give it the next ID (BUG-UI-001, BUG-UI-002, ...), and add a row to
   the summary table.
3. **Write a test** for the correct behaviour: add `@knownbug` to its tags and the bug ID to the end of
   its title, for example `'TC-02: Verify that ... (BUG-UI-001)'`.
4. **Use simple words.** Write for a reader who does not know the code: which menu, which page, which
   button, what you saw, and what you expected to see.

```markdown
## BUG-UI-00X: <Screen>: <what is wrong, in simple words>

|                     |                                                     |
| ------------------- | --------------------------------------------------- |
| **Screen**          | <menu → page>, for example Data Management → Rescue |
| **Severity**        | High / Medium / Low                                 |
| **Priority**        | P1 / P2 / P3 / P4                                   |
| **Status**          | Open                                                |
| **Found on**        | YYYY-MM-DD (staging, station DYY1)                  |
| **Browser**         | Chrome                                              |
| **Automated tests** | `tests/ui/<file>.spec.js` TC-XX                     |

**Summary:** what is wrong, in one or two short sentences.

**Before you start:** the login, the station and the test data (for example a test driver).

**Steps to replicate**

1. Open **<menu> → <page>**.
2. Click **<button>** ...
3. ...

**After the test:** how to put the data back.

**Expected result:** what should happen.

**Actual result:** what happens.

**Screenshot / trace:** attach the screenshot or the trace from the Playwright or Allure report.

**Business impact:** why it matters: for the manager, the drivers, the numbers, money, the law or
security.

**How to check the fix:** run `npx playwright test --grep "BUG-UI-00X"`. The test passes when the bug
is fixed. Then QA removes `@knownbug` and `(BUG-UI-00X)` from it.
```
