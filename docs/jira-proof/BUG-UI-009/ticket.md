# Announcements: the title and description take more characters than their limit

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Medium** |
| Severity | Low |
| Screen | Announcements → Create announcement / Edit announcement |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-04 (staging, station DYY6) |
| Retested | 2026-11-16: still reproduces (2 of 2 automated checks fail) |
| QA reference | BUG-UI-009 |
| Attach | screenshot-1.png, video-1.webm, screenshot-2.png, video-2.webm |

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
