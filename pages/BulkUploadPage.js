const LoginPage = require('./LoginPage');
const { xlsxBuffer } = require('../api/xlsx');

// Other Actions → Bulk Upload → Drivers (/workflow/bulk_upload/drivers): choose an xlsx file, check the rows
// in the preview, Submit; rows with a conflict come back in a conflict step ("N driver couldn't be added").
class BulkUploadPage {
  constructor(page) {
    this.page = page;
    this.fileInput = page.locator('input[type="file"]').first();
    this.submit = page.getByRole('button', { name: 'Submit' });
    this.cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    this.cancelBulkAdd = page.getByRole('button', { name: 'Cancel Bulk Add' });
    this.markAsResolve = page.getByRole('button', { name: 'Mark As Resolve' });
    this.alert = page.getByRole('alert');
  }

  // Logs in as the owner of company 'A' or 'B' and opens the page
  async open(company) {
    const loginPage = new LoginPage(this.page);
    await loginPage.open();
    await loginPage.login(
      process.env['REHIRE_' + company + '_EMAIL'],
      process.env['REHIRE_' + company + '_PASSWORD'],
    );
    await this.page.waitForURL(/dashboard/, { timeout: 30000 });
    await this.page.goto('/workflow/bulk_upload/drivers');
    await this.page.getByText('Bulk Upload:Drivers').waitFor();
  }

  // Chooses an xlsx made from drivers (newDriverDetails objects) with the template's columns. Brothers has the
  // station columns ABC and BRO1: the driver's station gets "Yes".
  async chooseDrivers(drivers, stationColumns = ['ABC', 'BRO1']) {
    const header = [
      'Name',
      'Email',
      'Phone Number',
      'Address',
      'Transporter ID',
      'Hire Date',
      'Status',
      'Birth Date',
      'Work Anniversary',
      ...stationColumns,
    ];
    const usDate = (iso) =>
      iso.slice(5, 7) + '/' + iso.slice(8, 10) + '/' + iso.slice(0, 4);
    const rows = drivers.map((d) => [
      d.name,
      d.email,
      d.phone,
      '',
      d.transporter_id,
      usDate(d.hire_date),
      'Active',
      '',
      '',
      ...stationColumns.map((s, i) => (i === 0 ? 'Yes' : 'No')),
    ]);
    await this.chooseFile({
      name: 'QA drivers.xlsx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: xlsxBuffer([header, ...rows]),
    });
    await this.submit.waitFor();
  }

  // Choose File → the browser's file chooser (a path or { name, mimeType, buffer })
  async chooseFile(file) {
    const chooser = this.page.waitForEvent('filechooser');
    await this.page.getByRole('button', { name: 'Choose File' }).click();
    await (await chooser).setFiles(file);
  }

  // The preview row of a driver (by email)
  row(email) {
    return this.page.getByRole('row').filter({ hasText: email.slice(0, 20) });
  }
}

module.exports = BulkUploadPage;
