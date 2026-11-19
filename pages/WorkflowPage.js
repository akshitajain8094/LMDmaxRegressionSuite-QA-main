// Workflow (the upload icon at the top): upload the weekly and daily reports, see the Missing Reports.
// Weekly → Scorecard Report: "Select a Week" (arrows), Drag & Drop / Choose File (PDF only), Upload File.
// Before sending, the web app checks the file NAME and shows one warning per problem, each with
// "Choose Different File" / "Continue Anyway ?": not a weekly scorecard (no "DSPScorecard" in the name), wrong week,
// DSP short code does not match, station code does not match. If the week already has data: "Data of this week
// already Exist … Do you want to update it?" → Yes. Success: "File Uploaded Successfully".
class WorkflowPage {
  constructor(page) {
    this.page = page;
    this.weekPicker = page.getByRole('button', { name: /^Week \d+$/ });
    this.fileInput = page.locator('input[type=file]');
    this.uploadButton = page.getByRole('button', { name: 'Upload File' });
    this.dialog = page.getByRole('dialog');
    this.successMessage = page.getByText('File Uploaded Successfully');
  }

  async open() {
    await this.page.goto('/workflow');
  }

  // Weekly → a report, e.g. 'Scorecard Report'
  async openReport(name) {
    await this.page.getByText(name, { exact: true }).first().click();
    await this.weekPicker.waitFor();
  }

  // "Select a Week": the arrows until the picker shows the week (e.g. 42)
  async selectWeek(week) {
    for (let i = 0; i < 60; i++) {
      const shown = Number((await this.weekPicker.innerText()).replace(/\D/g, ''));
      if (shown === week) return;
      const arrow = this.weekPicker.getByRole('button').nth(shown > week ? 0 : 1);
      await arrow.click();
      await this.page.waitForTimeout(300);
    }
    throw new Error('Week ' + week + ' cannot be selected');
  }

  async chooseFile(file) {
    await this.fileInput.setInputFiles(file);
  }

  // Answers the file-name warnings with "Continue Anyway" and returns their texts
  async continueAnyway() {
    const warnings = [];
    for (let i = 0; i < 4; i++) {
      const button = this.dialog.getByRole('button', { name: /Continue Anyway/ });
      try {
        await button.waitFor({ timeout: 4000 });
      } catch {
        break;
      }
      warnings.push((await this.dialog.innerText()).replace(/\s+/g, ' ').trim());
      await button.click();
      await button.waitFor({ state: 'detached' }).catch(() => {});
    }
    return warnings;
  }
}

module.exports = WorkflowPage;
