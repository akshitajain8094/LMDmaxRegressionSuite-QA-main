// The manager's E-Signature screens: send a write-up to a driver, and view one write-up
class ESignaturePage {
  constructor(page) {
    this.page = page;
    // Step 1 "Add Details"
    this.titleInput = page.getByPlaceholder('Enter Title');
    this.typeSelect = page.getByText('Select type of incident here');
    this.notesEditor = page.locator('.ql-editor').first();
    this.nextButton = page.getByRole('button', { name: 'Next' });
    // Step 3 "Preview": Send sends at once (since 2026-11-13 there is no "Send E-Signature" window any more).
    // The arrow next to it lists the channels: In-App Chat, SMS Chat (ticked by default), Email.
    this.sendButton = page.getByRole('button', { name: 'Send', exact: true });
  }

  // Driver profile -> E-Signature -> Add Report
  async openNewReport(driverId) {
    await this.page.goto('/e-signature/single/driver-profile/' + driverId);
  }

  // Fills the 3 steps (details, the default message, preview) and sends by SMS.
  // Returns the web app's "Send" answer: its status shows whether sending worked.
  async sendWriteUp(title, type, notes) {
    await this.titleInput.fill(title);
    await this.typeSelect.click();
    await this.page.getByRole('option', { name: type, exact: true }).click();
    await this.page.keyboard.press('Escape');
    await this.notesEditor.fill(notes);
    await this.nextButton.click();
    await this.nextButton.click();
    const sendAnswer = this.page.waitForResponse((response) =>
      response.url().includes('/e-signature/v2/create'),
    );
    await this.sendButton.click();
    return sendAnswer;
  }

  // The "View" window of one write-up, as after clicking View in the driver's E-Signature list
  async openWriteUp(driverId, writeUpId) {
    await this.page.goto(
      '/driver/e-signature/' +
        driverId +
        '?view_id=' +
        writeUpId +
        '&source=e-signature',
    );
  }
}

module.exports = ESignaturePage;
