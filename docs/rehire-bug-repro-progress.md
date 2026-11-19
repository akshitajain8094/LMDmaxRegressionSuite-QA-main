# Rehire — manual bug check (progress)

QA is checking by hand, one at a time, the bugs the Rehire tests found (see
[rehire-coverage.md](rehire-coverage.md)). This page says where the check stopped.

**Stopped at:** Bug 4 (BUG-API-040), 2026-11-05 / 06. **Resume:** 2026-11-06 afternoon.

**Logins:** Brothers brothers@yopmail.com (ABC), earthhh earth@yopmail.com (TTT), Super Admin
superadmin@staging.com on https://staging.performance-super-admin.lmdmax.com. Use only yopmail emails and
555 phones; make every test driver inactive afterwards.

## Where each bug stands

| #   | Bug         | What                                                        | Result of the check                                                                                                                                                                                                          |
| --- | ----------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | BUG-API-036 | An owner's own email/phone can be used for a driver         | **Not a bug: business rule** (QA). To do: remove the bug, change TC_023 / TC_089 (owner) to expect "saved", note the sheet difference                                                                                        |
| 2   | BUG-API-041 | Brothers does not see a conflict with an earthhh driver     | **Not a bug** (QA): the cross-company conflict is checked when **sign-in access** is given, not on Add. earthhh gives sign-in on add, Brothers does not. To do: withdraw; check the conflict when Brothers turns sign-in on  |
| 3   | BUG-API-042 | A conflicted driver can be activated again                  | **Probably not a bug** (same design: activation gives no access; sign-in stays refused, TC_059). To do: withdraw unless QA disagrees                                                                                         |
| 4   | BUG-API-040 | Promotion to admin skips the Super Admin                    | **In progress.** QA checked Add Admin in B with A's driver → Super Admin request (correct, that is TC_034). Still to check: **Promote As An Admin** inside Brothers for a driver whose email/phone is also an earthhh driver |
| 5   | BUG-API-037 | The other DSP's driver details are in the Add Driver answer | Not yet (needs F12 → Network)                                                                                                                                                                                                |
| 6   | BUG-UI-013  | No Quick-Accept on a Driver → Admin request                 | Not yet                                                                                                                                                                                                                      |
| 7   | BUG-UI-012  | No "Send Back for Update"                                   | Not yet                                                                                                                                                                                                                      |
| 8   | BUG-UI-014  | No error when Send Request loses the connection             | Not yet (not written in ui-bugs.md yet)                                                                                                                                                                                      |
| 9   | BUG-API-043 | Bulk upload accepts an 8-digit phone                        | Not yet (not written in api-bugs.md yet; Postman)                                                                                                                                                                            |
| 10  | BUG-API-038 | The same phone with "+1" is a new number                    | Not yet                                                                                                                                                                                                                      |
| 11  | BUG-API-039 | Super Admin accepts the phone "12345"                       | Not yet (passed on a later run: maybe fixed)                                                                                                                                                                                 |

## Bug 4 steps (to resume)

1. Brothers → Leaderboard → Add Driver: `QA Promote One`, TID `AQRMANUAL0010`,
   `qa.manual.promo1@yopmail.com`, `5550000110`.
2. earthhh → Add Driver: `QA Promote Two`, TID `AQRMANUAL0011`, the same email and phone → popup → Cancel.
3. Brothers → Leaderboard → ⋮ on QA Promote One → **Promote As An Admin** → password `QaManual@123` twice →
   Confirm.
4. Expected: blocked / Super Admin request. Seen by the tests: "User shared as admin successfully".
5. Clean-up: Settings → Admins → Remove from admin role; make both drivers inactive.

## Also open (automation, not manual)

- TC_053 (UI bulk): after Submit with a wrong email the expected message does not appear: check the screen.
- Write BUG-API-043 and BUG-UI-014 in the bug files; update rehire-coverage.md with the 2026-11-05 tests.
- Not automated yet but possible: 003, 017, 018, 020, 026, 027, 047, 048, 057, 058, 062, 087, 107–109, 114.
- Registration (064–068) needs QA's OK: it creates a real company.
