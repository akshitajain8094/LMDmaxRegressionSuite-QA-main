# Jira tickets to log (PWA project)

Retested on staging 2026-11-16. One folder per bug: `ticket.md` is the text to paste, the other files are the proof to attach.
API bugs: `api-proof.png` (server call, answer and the failed check) + `api-proof.txt` (full text). UI bugs: `video-N.webm` + `screenshot-N.png`.

| # | Priority | QA ref | Summary (Jira title) | Still failing | Folder |
|---|---|---|---|---|---|
| 1 | High | BUG-API-016 | E-Signature: a signed or refused write-up can still be deleted | 1/1 | [BUG-API-016](BUG-API-016/ticket.md) |
| 2 | High | BUG-API-020 | Edit driver: another driver's phone number or transporter ID is saved without a warning | 3/3 | [BUG-API-020](BUG-API-020/ticket.md) |
| 3 | High | BUG-API-021 | Driver status: the server does not follow the Leaderboard rules for suspended and inactive drivers | 2/2 | [BUG-API-021](BUG-API-021/ticket.md) |
| 4 | High | BUG-API-028 | Control Tower: the logout works without a login (security) | 1/1 | [BUG-API-028](BUG-API-028/ticket.md) |
| 5 | High | BUG-API-030 | Chat: a deleted image or file can still be opened with its link (privacy) | 1/1 | [BUG-API-030](BUG-API-030/ticket.md) |
| 6 | High | BUG-API-035 | Announcements: attachments can be downloaded by anyone with the link, without login | 2/2 | [BUG-API-035](BUG-API-035/ticket.md) |
| 7 | Medium | BUG-API-001 | Wrong or missing details in a request give empty or wrong data instead of an error | 31/31 | [BUG-API-001](BUG-API-001/ticket.md) |
| 8 | Medium | BUG-API-002 | A date range that ends before it starts is accepted | 13/13 | [BUG-API-002](BUG-API-002/ticket.md) |
| 9 | Medium | BUG-API-004 | Your Scorecard: the weekly insights of a week without data give a program error | 2/2 | [BUG-API-004](BUG-API-004/ticket.md) |
| 10 | Medium | BUG-API-015 | The server saves wrong data that the screens do not allow | 7/8 | [BUG-API-015](BUG-API-015/ticket.md) |
| 11 | Medium | BUG-API-022 | Rescue: a driver can be their own rescuer, and an inactive driver can be a rescuer | 1/2 | [BUG-API-022](BUG-API-022/ticket.md) |
| 12 | Medium | BUG-API-026 | Sign in: the password also works with spaces before or after it | 1/1 | [BUG-API-026](BUG-API-026/ticket.md) |
| 13 | Medium | BUG-API-029 | Chat: deleting an unknown message, or through another conversation, gives a server error (500) | 2/2 | [BUG-API-029](BUG-API-029/ticket.md) |
| 14 | Medium | BUG-API-032 | Announcements: the server accepts a title longer than 100 characters | 2/2 | [BUG-API-032](BUG-API-032/ticket.md) |
| 15 | Medium | BUG-UI-002 | Sign In With OTP: an unregistered email or mobile number shows "Something went wrong" | 2/2 | [BUG-UI-002](BUG-UI-002/ticket.md) |
| 16 | Medium | BUG-UI-005 | After login, the user does not land on the page they opened before | 1/1 | [BUG-UI-005](BUG-UI-005/ticket.md) |
| 17 | Low | BUG-UI-008 | Chat: another admin sees "This message has been deleted" in the conversation but "This message was deleted" in the chat list (partly fixed) | 1/1 | [BUG-UI-008](BUG-UI-008/ticket.md) |
| 18 | Medium | BUG-UI-009 | Announcements: the title and description take more characters than their limit | 2/2 | [BUG-UI-009](BUG-UI-009/ticket.md) |
| 19 | Low | BUG-API-003 | Error messages show internal technical text instead of a clear message | 30/33 | [BUG-API-003](BUG-API-003/ticket.md) |
| 20 | Low | BUG-API-005 | The same information comes in two different forms | 2/2 | [BUG-API-005](BUG-API-005/ticket.md) |
| 21 | Low | BUG-API-014 | Spelling mistakes in texts from the server | 2/2 | [BUG-API-014](BUG-API-014/ticket.md) |
| 22 | Low | BUG-API-017 | Write-ups and rescues: the "last changed" time does not change after an edit | 2/2 | [BUG-API-017](BUG-API-017/ticket.md) |
| 23 | Low | BUG-API-027 | Forgot Password: an unregistered email answers "not found" and "success" at the same time | 1/1 | [BUG-API-027](BUG-API-027/ticket.md) |
| 24 | Low | BUG-UI-001 | Login page: the page takes more than 3 seconds to be ready | 1/1 | [BUG-UI-001](BUG-UI-001/ticket.md) |
| 25 | Low | BUG-UI-003 | Login page: without internet the message is "Something Went Wrong" | 1/1 | [BUG-UI-003](BUG-UI-003/ticket.md) |
| 26 | Low | BUG-UI-004 | Login page: "Forgot Password?" cannot be reached with the Tab key | 1/1 | [BUG-UI-004](BUG-UI-004/ticket.md) |
| 27 | Low | BUG-UI-006 | Login page: with both boxes empty, only one "Field cannot be empty" message is shown | 1/1 | [BUG-UI-006](BUG-UI-006/ticket.md) |
