# Rehire & Super Admin conflicts — test coverage

This page shows how the 143 cases of the sheet **"Rehire & Super Admin Conflict Handling – Test Cases"**
(TC_001 to TC_143) are covered. It is written for QA. **73 cases are automated**; the others need screens or
APIs we do not have yet (see the end).

**Last run (2026-11-05, staging):** 67 passed, 9 failed on known bugs, 1 placeholder (TC_043, waiting for
OQ-15).

## Setup

| Sheet       | Here                                                                                   |
| ----------- | -------------------------------------------------------------------------------------- |
| Company A   | **Brothers** (DSP 518), owner `REHIRE_A_EMAIL` (brothers@yopmail.com), station ABC 588 |
| Company B   | **earthhh** (DSP 562), owner `REHIRE_B_EMAIL` (earth@yopmail.com), station TTT 700     |
| Super Admin | `SUPER_ADMIN_EMAIL` on `SUPER_ADMIN_URL` (staging.performance-super-admin.lmdmax.com)  |

"Company" in the sheet is a DSP. Every test adds its own new drivers (a random name, a
`qa.rehire.…@yopmail.com` email, a random 555 phone, so no real person gets an email or SMS) and makes them
inactive at the end; drivers cannot be deleted.

**Super Admin rules (agreed 2026-11-05):** the tests raise their **own** requests (a Brothers QA driver added
again in earthhh → Send Request To Super Admin) and act only on those: Quick-Accept, Update & Resolve,
Cancel Request. A request still pending after a test is cancelled. Requests raised by other people are only
looked at (the page object blocks every change for them). **Clear Data is never used.**

Run: `npx playwright test --project=api-rehire --project=ui-rehire`. The tests are tagged `@rehire`
(`@adds-data` when they add drivers), so `npm test` and the daily regression skip them.

## How the app works (seen on staging, 2026-11-05)

| Situation (Add Driver)                     | Server answer                                    | Popup                                                                                                       |
| ------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Same details as an **active** driver       | 409, `conflicted[]`                              | "This driver already exists … No changes needed" → Close                                                    |
| Same details as an **inactive** driver     | 409, `conflicted[]` with status inactive         | "This driver already exists … reactivate them" → **Reactivate & Resolve** / Cancel                          |
| A **similar name** (same company)          | 409 "Similar drivers found", `fuzzy_matches[]`   | "Drivers with similar names detected" → Cancel / **Skip & Add Driver As New** / pick → **Update & Resolve** |
| Email/phone of a driver of **another DSP** | **200, saved without app access**, `conflicts[]` | "<name> added with access issue." → Cancel / **Send Request To Super Admin**                                |

| Super Admin            | Call (`/lmd/usrsrv/users/v1/…`)                                            | Result                                       |
| ---------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| Quick-Accept → Confirm | `PATCH super-admin/resolve-conflict` (`resolution_type: quick`)            | B's driver gets sign-in, A's driver inactive |
| UPDATE & RESOLVE       | `PATCH super-admin/resolve-conflict` (`resolution_type: manual`)           | A's driver gets the new email/phone/status   |
| Cancel Request         | `PATCH super-admin/resolve-conflict` (`action: declined`), no confirmation | DECLINED ("REQUEST CANCELLED")               |

## Automated

| File                                            | Cases                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| `tests/api/rehire/rehire-conflicts.spec.js`     | 001, 002, 004, 006–016, 019, 021–023, 028–033, 035, 038–042, 110, 111, 135–140 |
| `tests/api/rehire/super-admin-actions.spec.js`  | 036, 074, 084, 088, 090–095, 097, 100, 112, 113, 141, 142                      |
| `tests/api/rehire/super-admin-view.spec.js`     | 069–074, 127                                                                   |
| `tests/ui/rehire/add-driver-conflicts.spec.js`  | 001, 002, 005, 009, 011, 012, 013, 015, 035, 036, 037                          |
| `tests/ui/rehire/super-admin-conflicts.spec.js` | 069–072, 074, 076, 080, 083, 089, 095, 096, 097 (view only)                    |
| `tests/ui/rehire/super-admin-actions.spec.js`   | 077, 081, 082, 084, 090, 091, 095, 099, 100, 101, 115                          |

Helpers: `api/rehire.js`, `pages/AddDriverPage.js`, `pages/SuperAdminConflictsPage.js`.

## Bugs found

| Bug         | What                                                                                                   | Cases                        |
| ----------- | ------------------------------------------------------------------------------------------------------ | ---------------------------- |
| BUG-API-036 | An owner's email and phone are not checked: they can be used for a driver (same and other company)     | 022, 023, 029, 030, 031, 033 |
| BUG-API-037 | A conflict with another DSP sends that DSP's driver (name, phone, TID, company) to the admin's browser | 042                          |
| BUG-API-038 | The same phone with "+1" in front is a new number (to confirm, OQ-13)                                  | 139                          |
| BUG-API-039 | Super Admin Update & Resolve accepts the phone "12345" and resolves the request                        | 094                          |
| BUG-UI-012  | No "Send Back for Update" on a pending request (to confirm)                                            | 096                          |
| BUG-UI-013  | No Quick-Accept on a Driver → Admin request (to confirm)                                               | 076                          |

## Questions for the BA

- **TC_035/036:** the sheet says a driver of another company is "not added"; the app adds them **without app
  access** and offers Send Request. The tests check the app's design.
- **TC_073/095:** the status is DECLINED (list) / "REQUEST CANCELLED" (page); the sheet says "Cancelled".
- **TC_095:** Cancel Request has no "are you sure?" step.
- **TC_093/115:** Update & Resolve with details that still conflict does nothing on the screen, with no message.
- The similar-names popup is not marked as a dialog and its choices are not radio buttons (accessibility).
- OQ-01 to OQ-15 of the sheet are still open.

## Not automated

| Why                                                                    | Cases                 |
| ---------------------------------------------------------------------- | --------------------- |
| Same-company conflict with a different role needs an Admin to be added | 003, 024–027, 034     |
| Bulk upload (API not known yet)                                        | 044–056               |
| Sign-in control, promotion, registration (APIs not known yet)          | 057–068               |
| Driver/Admin requests across companies need an admin we may add        | 078, 079, 085–087     |
| LMD Drive App (driver app login and sessions)                          | 098, 102–105, 122–126 |
| Activation conflicts across companies                                  | 106–109               |
| Admin-only View More, notifications to the requester                   | 114, 116–121          |
| Boundary names agreed with dev (50% / 49%), short names                | 017, 018, 020         |
| Other modules (RTS, Scheduler, RTS Checkout mobile)                    | 128–132               |
| Database checks; network failures                                      | 133, 134, 143         |
| Inactive driver in another company (OQ-15)                             | 043                   |
| Empty Super Admin list (the list is never empty on staging)            | 075                   |
