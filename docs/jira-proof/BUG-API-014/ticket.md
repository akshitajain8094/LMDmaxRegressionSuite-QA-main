# Spelling mistakes in texts from the server

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen |  |
| Environment | Staging API https://staging-api.fleet.lmdmax.com |
| Found on | 2026-09-24 (staging, station DYY1) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-API-014 |
| Attach | api-proof.png, api-proof.txt |

**Summary:** some texts that the server sends have spelling mistakes. Any screen, report or export
that shows these texts shows the mistake.

**Before you start:** nothing special (see the table below).

**Steps to replicate**

1. Run the automated test (see How to check the fix), or read the answers in Technical details.
2. Compare each text with the correct text:

| Where the text comes from                                      | Text from the server                       | Correct text                 |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------- |
| The quality graph (no screen uses it today)                    | "Total Delievered Packages"                | "Total Delivered Packages"   |
| The driver signs a write-up (the driver's link)                | "File sucessfully uploaded"                | "File successfully uploaded" |
| Driver page → Timeline (the name of a part of the answer)      | `upadated_by_name`                         | `updated_by_name`            |
| Driver page → Weekly ("Rating: Week 34", a part of the answer) | `"action": "dirver_rating"`                | `"driver_rating"`            |
| An address of the web app for driver ratings                   | `driver_rating/v2/update_rating_permisson` | `update_rating_permission`   |
| Forgot Password → a wrong OTP (found 2026-11-02)               | "Invalid OTP" (two spaces)                 | "Invalid OTP"                |

**Expected result:** the texts are spelled correctly.

**Actual result:** the texts have the spelling mistakes shown in the table.

**Business impact:** small, but users notice spelling mistakes, and they make the product look less
careful. A part of an answer with a wrong name must keep the wrong name in every app that reads it.

**Technical details (for developers)**

- `GET /lmd/prfsrv/graph/v2/quality_dashboard` → the graph label `"Total Delievered Packages"`.
- `POST /lmd/prfsrv/e-signature/v1/sign_form` (the driver signs) → the message
  `"File sucessfully uploaded"`.
- `GET /lmd/prfsrv/driver_timeline/v3/get_timeline` → the field name `upadated_by_name` (noted in
  `schemas/driver-timeline.schema.js`).
- `GET /lmd/prfsrv/driver_rating/v2/get_driver_rating` → `"action": "dirver_rating"`.
- The web app calls `driver_rating/v2/update_rating_permisson` (found in the web app's code; the tests do not
  call it, because it changes a setting).
- `POST /lmd/usrsrv/users/v1/user/credentials/verify` and `.../credentials/reset` with a wrong OTP → 401
  `"Invalid  OTP"` (two spaces).
