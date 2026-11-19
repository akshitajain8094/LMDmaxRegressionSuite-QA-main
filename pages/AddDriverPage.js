const LoginPage = require('./LoginPage');

// Leaderboard → Add Driver (the side panel) and the conflict popups that can follow Save:
// - "This driver already exists" (same details as an active driver: Close only, or as an inactive driver:
//   Reactivate & Resolve / Cancel)
// - "Drivers with similar names detected" (Cancel / Skip & Add Driver As New / pick one → Update & Resolve)
// - "<name> added with access issue." (a driver of another company: Cancel / Send Request To Super Admin)
// The popups are not marked as dialogs, so they are found by their texts.
class AddDriverPage {
  constructor(page) {
    this.page = page;
    this.addDriverButton = page.getByRole('button', { name: /add driver/i });
    this.panel = page.getByRole('dialog').filter({ hasText: 'Add Driver' });
    this.name = this.panel.getByRole('textbox', { name: 'Name' });
    this.transporterId = this.panel.getByRole('textbox', {
      name: 'Transporter ID',
    });
    this.email = this.panel.getByRole('textbox', { name: 'Email ID' });
    this.phone = this.panel.getByRole('textbox', { name: 'Phone Number' });
    this.save = this.panel.getByRole('button', { name: 'Save' });

    // The popups
    this.alreadyExists = page.getByText('This driver already exists');
    this.similarNames = page.getByText('Drivers with similar names detected');
    this.accessIssue = page.getByText(/added with access issue\./);
    this.close = page.getByRole('button', { name: 'Close', exact: true });
    this.cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    this.reactivate = page.getByRole('button', {
      name: 'Reactivate & Resolve',
    });
    this.skipAndAdd = page.getByRole('button', {
      name: /skip & add driver as new/i,
    });
    this.updateAndResolve = page.getByRole('button', {
      name: 'Update & Resolve',
    });
    this.sendRequest = page.getByRole('button', {
      name: 'Send Request To Super Admin',
    });
  }

  // Logs in as the owner of company 'A' or 'B' (REHIRE_* in .env) and opens the Leaderboard
  async open(company) {
    const loginPage = new LoginPage(this.page);
    await loginPage.open();
    await loginPage.login(
      process.env['REHIRE_' + company + '_EMAIL'],
      process.env['REHIRE_' + company + '_PASSWORD'],
    );
    await this.page.waitForURL(/dashboard/, { timeout: 30000 });
    await this.page.goto('/v2/dashboard/leaderboard');
    await this.addDriverButton.first().waitFor();
  }

  // Add Driver → name, transporter ID, email, phone → Save. Returns the Add Driver answer (POST).
  async addDriver(details) {
    await this.addDriverButton.first().click();
    await this.name.fill(details.name);
    await this.transporterId.fill(details.transporter_id);
    await this.email.fill(details.email);
    await this.phone.fill(details.phone);
    const answer = this.page.waitForResponse(
      (res) =>
        res.url().includes('/drivers/v1/driver') &&
        res.request().method() === 'POST',
    );
    await this.save.click();
    return answer;
  }

  // In the similar-names popup: the card of an existing driver (click it to pick it)
  similarDriver(name) {
    return this.page.getByText(name, { exact: true }).last();
  }
}

module.exports = AddDriverPage;
