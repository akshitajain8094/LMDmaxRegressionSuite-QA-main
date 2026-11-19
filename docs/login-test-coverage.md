# Login test coverage — Performance app

This page shows how the 157 cases of the sheet **"LMDmax Login – Test Cases"** (TC_LOGIN_001 to
TC_LOGIN_157) are covered by this project. It is written for QA: for each case it says which automated
test checks it, or why it is not automated yet.

- **In scope: 138 cases**: the ones for "All" products, for "RTS Checkout, Performance" and for
  "Performance" only. The other 19 cases are only for the Scheduler or RTS Checkout (see
  [Out of scope](#out-of-scope-scheduler-and-rts-checkout-only)).
- The Performance app also has a **Control Tower** sign-in: login.lmdmax.com opens the app with a
  `login_id`. The sheet has no case for it, so this project adds its own (`tests/api/login/control-tower.spec.js`).
- Every automated test has the sheet ID at the end of its title, for example
  `TC-15: Verify that ... (TC_LOGIN_021)`. Run all tests of one case with
  `npx playwright test --grep "TC_LOGIN_021"`.

## Summary

| Status        | Cases | Meaning                                                                                               |
| ------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| **Automated** | 60    | An automated test checks the case (API, UI or both)                                                   |
| **Partly**    | 4     | A test checks the part that can be checked today. The rest needs test data (see the Notes column)     |
| **Blocked**   | 63    | Needs test accounts, a mailbox the tests can read, or a linked Google/Apple account: ENV-006          |
| **Manual**    | 11    | Must be checked by a person (other browsers, zoom, autofill, long waits), or would change shared data |
| **Total**     | 138   |                                                                                                       |

Of the 64 automated or partly automated cases, **11 find a bug** today. Their tests have the
`@knownbug` tag and fail on purpose until the bug is fixed:

| Bug                                                                                       | Sheet cases                              |
| ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| [BUG-API-026](known-bugs/api-bugs.md) — the password works with spaces before or after it | TC_LOGIN_036                             |
| [BUG-API-027](known-bugs/api-bugs.md) — Forgot Password: "not found" with `success: true` | TC_LOGIN_077                             |
| [BUG-UI-001](known-bugs/ui-bugs.md) — the login page needs more than 3 seconds            | TC_LOGIN_001                             |
| [BUG-UI-002](known-bugs/ui-bugs.md) — OTP: unregistered user sees "Something went wrong"  | TC_LOGIN_110, TC_LOGIN_133, TC_LOGIN_134 |
| [BUG-UI-003](known-bugs/ui-bugs.md) — no "No internet connection" message                 | TC_LOGIN_128                             |
| [BUG-UI-004](known-bugs/ui-bugs.md) — "Forgot Password?" is skipped by the Tab key        | TC_LOGIN_013                             |
| [BUG-UI-005](known-bugs/ui-bugs.md) — after login, the requested page is lost             | TC_LOGIN_121                             |
| [BUG-UI-006](known-bugs/ui-bugs.md) — one message for two empty boxes                     | TC_LOGIN_030                             |
| [BUG-UI-007](known-bugs/ui-bugs.md) — the Enter key does not log in                       | TC_LOGIN_014                             |

**Reported Issue #1 (unregistered user OTP login) is fixed in the server:** no OTP is sent to an
unregistered email or mobile number, and Verify gives no login (`otp-login.spec.js` TC-01 to TC-05
pass). Only the message on the screen is wrong (BUG-UI-002).
**Reported Issue #2 (old password after a role change) cannot be tested yet:** it needs a driver whose
emails the tests can read, and it promotes and demotes that driver (ENV-006).

Other tests added for the login that the sheet does not have: NoSQL injection and a script tag in the
email (`login.spec.js` TC-19, TC-20), logging out twice and without a token (`session.spec.js` TC-03,
TC-04), the OTP and Forgot Password checks of missing details, and the Control Tower sign-in
(`control-tower.spec.js`, which found BUG-API-028: its logout works without a login).

## Where the tests are

| File                                      | What it checks                                                        |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `tests/api/login/login.spec.js`           | The login API: credentials, email and password rules, injection       |
| `tests/api/login/session.spec.js`         | Logout and sessions (each test logs in on its own)                    |
| `tests/api/login/otp-login.spec.js`       | Sign In With OTP, and Reported Issue #1                               |
| `tests/api/login/forgot-password.spec.js` | Forgot Password: Send OTP, Verify, Change Password                    |
| `tests/api/login/control-tower.spec.js`   | Control Tower sign-in and logout                                      |
| `tests/ui/login.spec.js`                  | The login screen: how it looks, the boxes, logging in, network errors |
| `tests/ui/sign-in-options.spec.js`        | The OTP, Forgot Password, Sign Up, Google and Apple buttons           |
| `tests/ui/session.spec.js`                | After login: Back, Log Out, two tabs, cleared storage, direct links   |

The tests never send an OTP or a reset email to a real person: they only use addresses that reach
nobody (for example `unreg_perf01@yopmail.com`).

## Cases by module

Test names: **API** `login` = `tests/api/login/login.spec.js`, `session`, `otp`, `forgot` = the other
files in `tests/api/login/`; **UI** `login` = `tests/ui/login.spec.js`, `options` =
`tests/ui/sign-in-options.spec.js`, `session` = `tests/ui/session.spec.js`.

### UI / UX

| Case         | Scenario                    | Status    | Tests                 | Notes                                                                                                               |
| ------------ | --------------------------- | --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| TC_LOGIN_001 | Page load                   | Automated | UI login TC-03, TC-04 | HTTPS and no console errors pass. The 3-second limit fails: BUG-UI-001                                              |
| TC_LOGIN_002 | Branding                    | Automated | UI login TC-05        | "LMDmax PERFORMANCE"                                                                                                |
| TC_LOGIN_003 | Tab title and favicon       | Automated | UI login TC-05        | "Performance App"                                                                                                   |
| TC_LOGIN_004 | Heading                     | Automated | UI login TC-06        |                                                                                                                     |
| TC_LOGIN_005 | Field presence              | Automated | UI login TC-07        |                                                                                                                     |
| TC_LOGIN_006 | Placeholders                | Automated | UI login TC-07        | "E-mail ID", "Password"                                                                                             |
| TC_LOGIN_007 | Buttons                     | Automated | UI login TC-08        |                                                                                                                     |
| TC_LOGIN_010 | Forgot / OR / OTP / Sign up | Automated | UI login TC-08        |                                                                                                                     |
| TC_LOGIN_012 | No Terms / Privacy links    | Automated | UI login TC-09        | As the sheet says, the links are absent. They are on the Sign Up page: a consistency question for the product owner |
| TC_LOGIN_013 | Tab order                   | Automated | UI login TC-10        | BUG-UI-004                                                                                                          |
| TC_LOGIN_014 | Enter key                   | Automated | UI login TC-24        | BUG-UI-007                                                                                                          |
| TC_LOGIN_015 | Screen widths               | Automated | UI login TC-11        | 1920, 1366, 1280, 768 and 375 pixels                                                                                |
| TC_LOGIN_016 | Zoom 50 % to 200 %          | Manual    | —                     | Browser zoom cannot be set by Playwright in Chrome                                                                  |
| TC_LOGIN_017 | Other browsers              | Manual    | —                     | The project runs Chrome only. Firefox and Safari (WebKit) could be added as Playwright projects later               |
| TC_LOGIN_018 | Hand cursor                 | Automated | UI login TC-12        |                                                                                                                     |
| TC_LOGIN_019 | Loader while logging in     | Automated | UI login TC-26        | Sign In is disabled while the login runs                                                                            |

### Email field

| Case         | Scenario                | Status    | Tests                                   | Notes                                          |
| ------------ | ----------------------- | --------- | --------------------------------------- | ---------------------------------------------- |
| TC_LOGIN_020 | Blank email             | Automated | UI login TC-13 · API login TC-08        | "Field cannot be empty"                        |
| TC_LOGIN_021 | Invalid formats         | Automated | UI login TC-14 · API login TC-13, TC-15 | All 7 formats of the sheet                     |
| TC_LOGIN_022 | Spaces around the email | Automated | API login TC-04                         | The spaces are removed and the login works     |
| TC_LOGIN_023 | Upper case              | Automated | API login TC-03                         |                                                |
| TC_LOGIN_024 | Unregistered email      | Automated | UI login TC-15 · API login TC-06, TC-18 | Same "Invalid Credentials" as a wrong password |
| TC_LOGIN_025 | 255+ characters         | Automated | UI login TC-16 · API login TC-16        |                                                |
| TC_LOGIN_026 | + . \_ - in the email   | Blocked   | —                                       | Needs a user with such an email (ENV-006)      |
| TC_LOGIN_027 | Paste the email         | Automated | UI login TC-25                          |                                                |
| TC_LOGIN_028 | Browser autofill        | Manual    | —                                       | A test browser has no saved passwords          |

### Password field

| Case         | Scenario                | Status    | Tests                            | Notes                    |
| ------------ | ----------------------- | --------- | -------------------------------- | ------------------------ |
| TC_LOGIN_029 | Blank password          | Automated | UI login TC-17 · API login TC-09 |                          |
| TC_LOGIN_030 | Both blank              | Automated | UI login TC-18 · API login TC-12 | BUG-UI-006               |
| TC_LOGIN_031 | Wrong password          | Automated | UI login TC-02 · API login TC-05 |                          |
| TC_LOGIN_032 | Case-sensitive password | Automated | API login TC-07                  |                          |
| TC_LOGIN_033 | Masked by default       | Automated | UI login TC-19                   |                          |
| TC_LOGIN_034 | Eye icon shows          | Automated | UI login TC-20                   |                          |
| TC_LOGIN_035 | Eye icon hides          | Automated | UI login TC-20                   |                          |
| TC_LOGIN_036 | Spaces not trimmed      | Automated | API login TC-21                  | BUG-API-026 (to confirm) |
| TC_LOGIN_037 | Copy is blocked         | Automated | UI login TC-21                   |                          |
| TC_LOGIN_038 | Paste the password      | Automated | UI login TC-25                   |                          |
| TC_LOGIN_039 | 200+ characters         | Automated | UI login TC-22 · API login TC-17 |                          |

### Role-based login (allowed and restricted)

The test user of this project is the **owner** of its stations. All other roles need their own
accounts (ENV-006).

| Case         | Scenario                         | Status    | Tests                                | Notes                                                                                              |
| ------------ | -------------------------------- | --------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| TC_LOGIN_046 | Admin login                      | Blocked   | —                                    | Needs an admin account                                                                             |
| TC_LOGIN_047 | Promoted Admin login             | Blocked   | —                                    | Needs a promoted admin account                                                                     |
| TC_LOGIN_048 | Owner login                      | Automated | UI login TC-01 · API login TC-01     | The test user is an owner (`role: "owner"`)                                                        |
| TC_LOGIN_049 | Promoted Admin gets admin access | Blocked   | —                                    | Needs a driver to promote and a readable mailbox                                                   |
| TC_LOGIN_050 | Promotion while logging in       | Blocked   | —                                    | Same                                                                                               |
| TC_LOGIN_051 | Ownership transfer               | Blocked   | —                                    | Needs 2 owner accounts; changes the owner of a company                                             |
| TC_LOGIN_052 | Driver denied                    | Blocked   | —                                    | Needs a driver with a web password                                                                 |
| TC_LOGIN_053 | Dispatcher / Manager denied      | Blocked   | —                                    | Needs the account                                                                                  |
| TC_LOGIN_054 | Member denied                    | Blocked   | —                                    | Needs the account                                                                                  |
| TC_LOGIN_055 | Demoted admin denied             | Blocked   | —                                    | Needs the account                                                                                  |
| TC_LOGIN_056 | Restricted role via Google       | Blocked   | —                                    | Needs a linked Google account; Google blocks automated sign-in                                     |
| TC_LOGIN_057 | Restricted role via Apple        | Blocked   | —                                    | Needs a linked Apple ID with 2FA                                                                   |
| TC_LOGIN_058 | Restricted role via OTP          | Blocked   | —                                    | Needs a driver account and its mailbox                                                             |
| TC_LOGIN_059 | Demoted while logged in          | Blocked   | —                                    | Needs an admin account that can be demoted                                                         |
| TC_LOGIN_060 | Inner page by direct address     | Partly    | UI session TC-01 · API session TC-06 | Without login and with a made-up token: checked. With a restricted user's token: needs the account |

### Account status

| Case         | Scenario                                | Status  | Tests | Notes                                                                                                                         |
| ------------ | --------------------------------------- | ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| TC_LOGIN_061 | Deactivated user                        | Blocked | —     | Needs the account                                                                                                             |
| TC_LOGIN_062 | Deleted user                            | Blocked | —     | Needs the account                                                                                                             |
| TC_LOGIN_063 | Invite not accepted                     | Blocked | —     | Needs the account                                                                                                             |
| TC_LOGIN_064 | Email not verified                      | Blocked | —     | Needs the account                                                                                                             |
| TC_LOGIN_065 | Removed from the company                | Blocked | —     | Needs the account                                                                                                             |
| TC_LOGIN_066 | Subscription expired                    | Blocked | —     | Needs the company                                                                                                             |
| TC_LOGIN_067 | No Performance access                   | Blocked | —     | Needs the company                                                                                                             |
| TC_LOGIN_068 | User in several companies               | Manual  | —     | The test user can open 5 stations, and a login opens the one used last (ENV-002). The expected behaviour must be agreed first |
| TC_LOGIN_069 | Admin in one company, driver in another | Blocked | —     | Needs the account                                                                                                             |

### Forgot Password

| Case         | Scenario                   | Status    | Tests                                      | Notes                                                                       |
| ------------ | -------------------------- | --------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| TC_LOGIN_075 | Open the screen            | Automated | UI options TC-07                           |                                                                             |
| TC_LOGIN_076 | Reset OTP is sent          | Blocked   | —                                          | Needs a mailbox the tests can read                                          |
| TC_LOGIN_077 | Unregistered email         | Automated | UI options TC-09 · API forgot TC-01, TC-02 | "User Not Found" on the screen. BUG-API-027 (`success: true`)               |
| TC_LOGIN_078 | Blank or invalid email     | Automated | UI options TC-08 · API forgot TC-03, TC-04 |                                                                             |
| TC_LOGIN_079 | Driver resets the password | Blocked   | —                                          | Needs a driver account and its mailbox                                      |
| TC_LOGIN_080 | New password works         | Blocked   | —                                          | Needs a readable mailbox; changes the password of that account              |
| TC_LOGIN_081 | Password rules             | Blocked   | —                                          | The Change Password screen opens only after a real OTP                      |
| TC_LOGIN_082 | Passwords do not match     | Blocked   | —                                          | Same                                                                        |
| TC_LOGIN_083 | Old or expired link        | Partly    | API forgot TC-06, TC-07                    | A wrong OTP or token is refused. Reusing a real, used OTP needs the mailbox |
| TC_LOGIN_084 | Back to Sign In            | Automated | UI options TC-10                           |                                                                             |

### Google and Apple sign-in

| Case         | Scenario                           | Status    | Tests            | Notes                                                          |
| ------------ | ---------------------------------- | --------- | ---------------- | -------------------------------------------------------------- |
| TC_LOGIN_085 | Google opens the account chooser   | Automated | UI options TC-12 | Opens accounts.google.com                                      |
| TC_LOGIN_086 | Admin via Google                   | Blocked   | —                | Needs a linked Google account; Google blocks automated sign-in |
| TC_LOGIN_087 | Promoted Admin via Google          | Blocked   | —                | Same                                                           |
| TC_LOGIN_088 | Owner via Google                   | Blocked   | —                | Same                                                           |
| TC_LOGIN_089 | Unregistered Google account        | Blocked   | —                | Same                                                           |
| TC_LOGIN_090 | Close the Google window            | Manual    | —                | Can be automated later (close the window, check Sign In)       |
| TC_LOGIN_091 | Pop-ups blocked                    | Manual    | —                | Needs a browser with pop-ups blocked by the user               |
| TC_LOGIN_092 | Same email as the password account | Blocked   | —                | Needs a linked Google account                                  |
| TC_LOGIN_093 | Apple opens its sign-in page       | Automated | UI options TC-13 | Opens appleid.apple.com                                        |
| TC_LOGIN_094 | Admin via Apple                    | Blocked   | —                | Needs a linked Apple ID; Apple asks for 2FA on a phone         |
| TC_LOGIN_095 | Promoted Admin via Apple           | Blocked   | —                | Same                                                           |
| TC_LOGIN_096 | Owner via Apple                    | Blocked   | —                | Same                                                           |
| TC_LOGIN_097 | Hide My Email                      | Blocked   | —                | Same                                                           |
| TC_LOGIN_098 | Unregistered Apple ID              | Blocked   | —                | Same                                                           |
| TC_LOGIN_099 | Cancel on Apple                    | Manual    | —                | Can be automated later, like TC_LOGIN_090                      |

### OTP login

| Case         | Scenario                         | Status    | Tests                                          | Notes                                                                         |
| ------------ | -------------------------------- | --------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| TC_LOGIN_100 | Open the OTP screen              | Automated | UI options TC-01                               |                                                                               |
| TC_LOGIN_101 | OTP is sent                      | Blocked   | —                                              | Needs a readable mailbox (the test user's emails go to a real person)         |
| TC_LOGIN_102 | Admin via OTP                    | Blocked   | —                                              | Needs the account and its mailbox                                             |
| TC_LOGIN_103 | Promoted Admin via OTP           | Blocked   | —                                              | Same                                                                          |
| TC_LOGIN_104 | Owner via OTP                    | Blocked   | —                                              | Needs a readable mailbox                                                      |
| TC_LOGIN_105 | Wrong OTP                        | Blocked   | —                                              | Needs a real OTP request (API otp TC-04 checks a made-up token only)          |
| TC_LOGIN_106 | Expired OTP                      | Blocked   | —                                              | Same                                                                          |
| TC_LOGIN_107 | Resend makes the old OTP invalid | Blocked   | —                                              | Needs a readable mailbox                                                      |
| TC_LOGIN_108 | Lock after 5 wrong OTPs          | Blocked   | —                                              | Needs its own account: the lock would stop the shared test user               |
| TC_LOGIN_109 | OTP box takes digits only        | Partly    | UI options TC-03                               | The email/mobile box is checked. The 6 OTP boxes appear only after a real OTP |
| TC_LOGIN_110 | Unregistered email or phone      | Automated | UI options TC-04, TC-05 · API otp TC-01, TC-02 | No OTP is sent (correct). Message: BUG-UI-002                                 |
| TC_LOGIN_111 | Used OTP cannot be reused        | Blocked   | —                                              | Needs a readable mailbox                                                      |
| TC_LOGIN_112 | Back to email login              | Automated | UI options TC-06                               |                                                                               |

### Sign Up link

| Case         | Scenario                       | Status    | Tests            | Notes                                                                                     |
| ------------ | ------------------------------ | --------- | ---------------- | ----------------------------------------------------------------------------------------- |
| TC_LOGIN_113 | Open the Sign Up page          | Automated | UI options TC-11 |                                                                                           |
| TC_LOGIN_114 | Sign up with an existing email | Manual    | —                | If the server's check were missing, the test would create an account. Check by hand first |

### Session management, network errors and logout

| Case         | Scenario                    | Status    | Tests                                       | Notes                                                           |
| ------------ | --------------------------- | --------- | ------------------------------------------- | --------------------------------------------------------------- |
| TC_LOGIN_117 | Lands on the dashboard      | Automated | UI login TC-01                              | Daily Highlights                                                |
| TC_LOGIN_118 | Login page when logged in   | Automated | UI session TC-02                            |                                                                 |
| TC_LOGIN_119 | Back after login            | Automated | UI session TC-03                            |                                                                 |
| TC_LOGIN_120 | Back after logout           | Automated | UI session TC-04 · API session TC-02        | The old token is refused too                                    |
| TC_LOGIN_121 | Requested page after login  | Automated | UI session TC-07                            | BUG-UI-005                                                      |
| TC_LOGIN_122 | Session timeout             | Manual    | —                                           | The timeout is not known; ask the developers, then test by hand |
| TC_LOGIN_123 | Logout in another tab       | Automated | UI session TC-05                            |                                                                 |
| TC_LOGIN_124 | Two browsers at once        | Automated | API session TC-05                           | Both logins work; logout ends only its own session              |
| TC_LOGIN_125 | Password changed elsewhere  | Manual    | —                                           | Would change the password of the shared test user               |
| TC_LOGIN_126 | Login across products       | Manual    | —                                           | Needs the Scheduler and RTS Checkout                            |
| TC_LOGIN_127 | Cookies and storage cleared | Automated | UI session TC-06                            |                                                                 |
| TC_LOGIN_128 | No internet                 | Automated | UI login TC-28                              | BUG-UI-003                                                      |
| TC_LOGIN_129 | Server error                | Automated | UI login TC-27                              | The server's message is shown; Sign In works again              |
| TC_LOGIN_130 | Double click                | Automated | UI login TC-26                              | One login request                                               |
| TC_LOGIN_131 | Message goes away           | Automated | UI login TC-23                              |                                                                 |
| TC_LOGIN_132 | Logout                      | Automated | UI session TC-04 · API session TC-01, TC-03 | Tested with the owner. Admin and Promoted Admin: ENV-006        |

### Reported Issue #1 — unregistered user OTP login

| Case         | Scenario                        | Status    | Tests                                   | Notes                                                                          |
| ------------ | ------------------------------- | --------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| TC_LOGIN_133 | Unregistered email (the bug)    | Automated | API otp TC-01, TC-04 · UI options TC-04 | **Fixed in the server**: no OTP, no login. Message: BUG-UI-002                 |
| TC_LOGIN_134 | Unregistered phone              | Automated | API otp TC-02 · UI options TC-05        | Fixed in the server. Message: BUG-UI-002                                       |
| TC_LOGIN_135 | No account is created           | Partly    | API otp TC-01                           | No OTP and no token are given, so the flow stops. Check the admin list by hand |
| TC_LOGIN_136 | Verify-OTP API                  | Automated | API otp TC-04                           | 404, no token                                                                  |
| TC_LOGIN_137 | OTP of user A for another email | Blocked   | —                                       | Needs a real OTP of a registered user                                          |
| TC_LOGIN_138 | Deleted user                    | Blocked   | —                                       | Needs the account                                                              |
| TC_LOGIN_139 | Deactivated user                | Blocked   | —                                       | Needs the account                                                              |
| TC_LOGIN_140 | Removed from the company        | Blocked   | —                                       | Needs the account                                                              |
| TC_LOGIN_141 | Invite not accepted             | Blocked   | —                                       | Needs the account                                                              |
| TC_LOGIN_142 | Upper case and spaces           | Automated | API otp TC-03                           |                                                                                |

### Reported Issue #2 — old password after a role change

All 12 Performance cases need a driver that the tests may promote and demote, and a mailbox the tests
can read for the passwords that each promotion sends (ENV-006).

| Case         | Scenario                                                    | Status  |
| ------------ | ----------------------------------------------------------- | ------- |
| TC_LOGIN_144 | Driver → Promoted Admin → Driver → Promoted Admin (the bug) | Blocked |
| TC_LOGIN_145 | First promotion: login works                                | Blocked |
| TC_LOGIN_146 | Demoted to driver: login denied                             | Blocked |
| TC_LOGIN_147 | Demotion ends the session                                   | Blocked |
| TC_LOGIN_148 | New email on re-promotion                                   | Blocked |
| TC_LOGIN_149 | Old set-password link                                       | Blocked |
| TC_LOGIN_150 | Driver app password vs web password                         | Blocked |
| TC_LOGIN_151 | 3 promote/demote cycles                                     | Blocked |
| TC_LOGIN_152 | User changed the password, then role cycle                  | Blocked |
| TC_LOGIN_153 | Forgot Password after re-promotion                          | Blocked |
| TC_LOGIN_154 | Google / Apple / OTP after demotion                         | Blocked |
| TC_LOGIN_155 | Promoted Admin → Admin → Driver                             | Blocked |

## Out of scope (Scheduler and RTS Checkout only)

These 19 cases are not for the Performance app, so this project does not test them: TC_LOGIN_008,
009, 011, 040 to 045, 070 to 074 (Keep Me Logged In), 115, 116, 143, 156 and 157.

## When the test accounts exist

1. Add each account to `.env.staging` and to the CI secrets, for example `DRIVER_EMAIL` and
   `DRIVER_PASSWORD`.
2. Write the blocked cases as API tests first (`tests/api/login/`): a restricted role must get no token.
   Then add one UI test per role for the message on the screen.
3. Change the status in this page from **Blocked** to **Automated**, with the test names.
