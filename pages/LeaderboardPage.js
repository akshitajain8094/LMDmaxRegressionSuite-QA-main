// The Leaderboard tab (Dashboard -> Leaderboard): the driver lists, the row menu, Suspend and Resume Driver
class LeaderboardPage {
  constructor(page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Search Drivers');
    // The "Suspend, <driver>" window
    this.detailsBox = page.getByPlaceholder('Add Details');
    this.suspendButton = page.getByRole('button', {
      name: 'Suspend',
      exact: true,
    });
    // The "Suspension Details" window (Resume Driver in the row menu)
    this.resumeButton = page
      .getByRole('button', { name: 'Resume Driver' })
      .last();
  }

  async open() {
    await this.page.goto('/v2/dashboard/leaderboard');
  }

  async search(driverName) {
    await this.searchBox.fill(driverName);
  }

  // The row of one driver in the table
  row(driverName) {
    return this.page.locator('tr', { hasText: driverName }).first();
  }

  // The list switch above the table, e.g. from "Active drivers (108)" to "Suspended Drivers (01)".
  // "^" = the label starts with the name ("Active drivers" must not match "Inactive drivers").
  async showList(currentList, newList) {
    await this.page
      .getByText(new RegExp('^' + currentList + ' \\(', 'i'))
      .click();
    await this.page.getByText(new RegExp('^' + newList + ' \\(', 'i')).click();
  }

  // The ⋮ button at the end of the row: Suspend Driver, Resume Driver, Go To Profile, ...
  async openRowMenu(driverName) {
    await this.row(driverName).locator('button').last().click();
  }

  // The calendar icon of "From" or "To" -> today. Clicking the day fills the box and closes the calendar
  // (no OK needed: the calendar is already gone when OK would be clicked).
  async chooseToday(dateBox) {
    await this.page
      .getByPlaceholder(dateBox)
      .locator('..')
      .getByRole('button')
      .click();
    const calendar = this.page.locator('.MuiPopover-paper').last();
    const today = String(new Date().getDate());
    await calendar.getByRole('gridcell', { name: today, exact: true }).click();
    await calendar.waitFor({ state: 'hidden' });
  }
}

module.exports = LeaderboardPage;
