// The write-up page a driver opens from the SMS link (no login): sign it or refuse it
class SignWriteUpPage {
  constructor(page) {
    this.page = page;
    this.clickToSign = page.getByText('Click to sign');
    this.signaturePad = page.locator('canvas').first();
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.refuseButton = page.getByText('Refuse to sign');
    this.reasonInput = page.getByPlaceholder('Specify reason here');
    this.doneMessage = page.getByText('Your Response Has Been Submitted', {
      exact: true,
    });
  }

  async open(link) {
    await this.page.goto(link);
  }

  // Draws a signature on the pad with the mouse (like a finger), then submits the pad and the write-up
  async sign() {
    await this.clickToSign.click();
    const pad = await this.signaturePad.boundingBox();
    await this.page.mouse.move(pad.x + 60, pad.y + 300);
    await this.page.mouse.down();
    await this.page.mouse.move(pad.x + 160, pad.y + 250, { steps: 10 });
    await this.page.mouse.move(pad.x + 260, pad.y + 330, { steps: 10 });
    await this.page.mouse.up();
    await this.submitButton.last().click(); // the pad's Submit
    await this.submitButton.first().click(); // the write-up's Submit
  }

  async refuse(reason) {
    await this.refuseButton.click();
    await this.reasonInput.fill(reason);
    await this.submitButton.last().click();
  }
}

module.exports = SignWriteUpPage;
