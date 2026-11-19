// The Weekly tab of a driver's page (Driver page -> Weekly): the week's rating, the ScoreCard of the week, the week
// picker and the "View all week's ratings" window
class DriverWeeklyPage {
  constructor(page) {
    this.page = page;
    // The button at the top right, for example "Week: 34". It opens a calendar to choose another week.
    this.weekButton = page.getByRole('button', { name: /^Week: \d+$/ });
    // "Rating: Week 34" and its value, for example 8.89
    this.ratingBox = page.getByText(/^Rating: Week \d+$/).locator('..');
    this.allRatingsButton = page.getByRole('button', {
      name: /View all week/i,
    });
    // The "View all week's ratings" window
    this.ratingsWindow = page.getByRole('presentation');
  }

  // Opens the Weekly tab of a driver. Waits for the week's rating: the page shows it last.
  async open(driverId) {
    const rating = this.page.waitForResponse((response) =>
      response.url().includes('/driver_rating/v2/get_driver_rating?'),
    );
    await this.page.goto('/driver/weekly/' + driverId);
    await rating;
  }

  // A row of the ScoreCard table, for example scoreRow('Delivered') -> "Delivered 1134"
  scoreRow(metric) {
    return this.page.getByRole('row').filter({
      has: this.page.getByRole('cell', { name: metric, exact: true }),
    });
  }

  // Chooses another week: opens the calendar and clicks a day of that week (for example 5 = 5 August 2026, week 32)
  async chooseWeekByDay(day) {
    await this.weekButton.click();
    await this.page
      .getByRole('gridcell', { name: String(day), exact: true })
      .click();
  }

  // A row of the "View all week's ratings" window, for example ratingRow('Week 34') -> "Week 34 8.89"
  ratingRow(week) {
    return this.ratingsWindow.getByText(week, { exact: true }).locator('..');
  }
}

module.exports = DriverWeeklyPage;
