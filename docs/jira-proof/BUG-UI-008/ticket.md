# Chat: another admin sees "This message has been deleted" in the conversation but "This message was deleted" in the chat list

| Field | Value |
|---|---|
| Issue type | Bug |
| Priority | **Low** |
| Severity | Low |
| Screen | Chat → Paya Chat → a conversation whose last message was deleted |
| Environment | Staging web app https://staging.performance.lmdmax.com, Chrome (desktop) |
| Found on | 2026-11-03 (staging, station AQWA) |
| Retested | 2026-11-16: partly fixed, the wording still differs (1 of 1 automated checks fail) |
| QA reference | BUG-UI-008 |
| Attach | screenshot-adminB.png, video-adminB.webm |

> Partly fixed on 2026-11-16: another admin no longer sees "You deleted this message". What is left is the
> wording: the conversation and the chat list use two different texts.

**Summary:** when Admin A deletes the latest message in the Paya Chat, every **other** admin must see
"This message was deleted" in the chat list **and** in the conversation (requirement REQ-02, REQ-03). The
chat list shows "This message was deleted" (correct). The conversation shows "This message **has been**
deleted", so the two places on the same screen use different texts.

**Before you start:** two admins of the same station, on AQWA: Arth (who deletes) and gyani (who does not).

**Steps to replicate**

1. As Admin A: **Chat → Paya Chat** → a driver → hover the latest message → trash icon → **Delete**.
2. Log in as Admin B on the same station and open **Chat → Paya Chat**.
3. Read the driver's row in the chat list, then open the conversation and read the last message.

**Expected result:** "This message was deleted" in the row **and** in the conversation (sheet cases TC_03,
TC_07, TC_17).

**Actual result:** the row says "This message was deleted"; the conversation says "This message has been
deleted 3:32 PM". Seen on 2026-11-16 as gyani in Aksh's conversation on AQWA.

**Business impact:** small: two different texts for the same thing on one screen, and the conversation
text differs from the requirement.

**Technical details:** the server sends `content: "This message was deleted"` for Admin B, and the preview
uses it. The conversation chooses its own text ("This message has been deleted") instead of showing the
server's `content`.
