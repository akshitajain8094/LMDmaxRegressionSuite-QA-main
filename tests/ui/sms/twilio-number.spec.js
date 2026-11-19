// SCENARIO: the Twilio number of a company (Super Admin → All Clients → DSP → Twilio Number) and how it shows in
// the web app. TC-001 … TC-011 of SMS_Twilio_Chat_Test_Cases.pdf. Most cases are done in Super Admin, which these
// tests do not use (decided with QA): they stay fixme.
const { test, expect, tags } = require('./sms-setup');

test(
  'TC-009: Verify that the chat number under the user name reads "LMDmax Chat #: XXX-XXX-XXXX" (no +1, with hyphens)',
  tags(),
  async ({ smsPage }) => {
    await expect(smsPage.welcomeChatNumber).toBeVisible();
    const text = (await smsPage.welcomeChatNumber.locator('xpath=..').innerText()).replace(/\s+/g, ' ').trim();
    expect(text).toMatch(/LMDmax Chat #: ?\d{3}-\d{3}-\d{4}$/);
    expect(text).not.toContain('+1');
  },
);

test.fixme('TC-001: Verify that a valid 10-digit primary Twilio number saves and enables chat (Super Admin)', () => {});
test.fixme('TC-002: Verify that a blank Twilio number is refused (Super Admin)', () => {});
test.fixme('TC-003: Verify that letters and special characters are refused in the Twilio number (Super Admin)', () => {});
test.fixme('TC-004: Verify that only exactly 10 digits are accepted for the primary number (Super Admin)', () => {});
test.fixme('TC-005: Verify that a pasted number is not covered by the placeholder (Super Admin)', () => {});
test.fixme('TC-006: Verify that deleting the primary number asks for confirmation (Super Admin)', () => {});
test.fixme('TC-007: Verify that a changed Twilio number shows everywhere without a profile visit (Super Admin edits the number)', () => {});
test.fixme('TC-008: Verify that chat is blocked until a Twilio number is assigned (needs a station without a Twilio number)', () => {});
test.fixme('TC-009 (Spanish): Verify that the chat number reads "Chat de LMDmax #" in Spanish (language switch to be checked first)', () => {});
test.fixme('TC-010: Verify that the Account SID is never shown in a chat error (needs a change in the Twilio console)', () => {});
test.fixme('TC-011: Verify that an invalid company Twilio number gives a clear error (needs a company set up with a wrong number: Super Admin)', () => {});
