// The manager's Rescue screen (Data Management -> Rescue): add, edit and delete the rescues of a day
class RescuePage {
  constructor(page) {
    this.page = page;
    // The icon buttons above the list (their names are the tooltips)
    this.addButton = page.getByRole('button', { name: 'Add New Rescue' });
    this.editButton = page.getByRole('button', { name: 'Start Editing' });
    this.saveButton = page.getByRole('button', { name: 'Save Changes' });
    // The boxes of the row that is being added or edited
    this.rescuerBox = page.locator('#rescuer_name');
    this.receiverBox = page.locator('#caller_name');
    this.statusSelect = page.locator('#rescue_type').locator('..');
    this.packagesBox = page.locator('#rescue_number_of_packages');
    this.stopsBox = page.locator('#rescue_number_of_stops');
    this.reasonBox = page.locator('#rescue_reason');
  }

  // Data Management -> Rescue: today's rescues. Waits for the day's list: when the list arrives it replaces the
  // rows, so a rescue added before that would disappear.
  async open() {
    const dayList = this.page.waitForResponse((response) =>
      response.url().includes('/rescue/v2/rescue?date='),
    );
    await this.page.goto('/management/rescue');
    await dayList;
  }

  // The row of a saved rescue: the parent of the receiver's name
  row(receiverName) {
    return this.page.getByText(receiverName, { exact: true }).locator('..');
  }

  // Types the driver's name in a box (Rescuer or Receiver), then picks the driver from the list that opens
  async pickDriver(box, driverName) {
    await box.click();
    await box.fill(driverName);
    await this.page.getByRole('option', { name: driverName }).click();
  }

  async chooseStatus(status) {
    await this.statusSelect.click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
  }

  // The bin icon of the row
  async deleteRow(receiverName) {
    await this.row(receiverName)
      .getByRole('button', { name: 'Delete' })
      .click();
  }
}

module.exports = RescuePage;
