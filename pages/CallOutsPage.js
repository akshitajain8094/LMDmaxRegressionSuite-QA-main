// The manager's Callouts screen (Data Management -> Callouts): add, edit and delete the call-outs of a day
class CallOutsPage {
  constructor(page) {
    this.page = page;
    // The icon buttons above the list (their names are the tooltips)
    this.addButton = page.getByRole('button', { name: 'Add New CallOut' });
    this.editButton = page.getByRole('button', { name: 'Start Editing' });
    this.saveButton = page.getByRole('button', { name: 'Save Changes' });
    // The "Add Driver" window that opens after "Add New CallOut"
    this.driverWindow = page.getByRole('dialog');
  }

  // Data Management -> Callouts: today's call-outs. Waits for the day's list: when the list arrives it
  // replaces the rows, so a driver added before that would disappear.
  async open() {
    const dayList = this.page.waitForResponse((response) =>
      response.url().includes('/call_out/v2/call_out?date='),
    );
    await this.page.goto('/management/callouts');
    await dayList;
  }

  // The row of one driver: the parent of the driver's name
  row(driverName) {
    return this.page.getByText(driverName, { exact: true }).locator('..');
  }

  // "Add New CallOut" -> search the driver -> click the driver -> close the window
  async addDriver(driverName) {
    await this.addButton.click();
    await this.driverWindow.getByPlaceholder('Search Driver').fill(driverName);
    await this.driverWindow.getByText(driverName, { exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  // The row has two drop-downs: first "Callout Type", then "Excused?"
  typeSelect(driverName) {
    return this.row(driverName).getByRole('combobox').nth(0);
  }

  excusedSelect(driverName) {
    return this.row(driverName).getByRole('combobox').nth(1);
  }

  async chooseType(driverName, type) {
    await this.typeSelect(driverName).click();
    await this.page.getByRole('option', { name: type, exact: true }).click();
  }

  async fillReason(driverName, reason) {
    await this.row(driverName).getByRole('textbox').fill(reason);
  }

  // The bin icon of the row
  async deleteRow(driverName) {
    await this.row(driverName).getByRole('button', { name: 'Delete' }).click();
  }
}

module.exports = CallOutsPage;
