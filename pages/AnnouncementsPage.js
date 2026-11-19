const LoginPage = require('./LoginPage');

// The Announcements screens (menu → Announcements): the listing, the create and edit pages with their
// dialogs (driver picker, review, save changes, delete), and the details page with Overview, Activity, History
class AnnouncementsPage {
  constructor(page) {
    this.page = page;
    this.stationButton = page.getByRole('button', {
      name: /^(DYY1|DYY6|AAA|WAQA|SDSD|AQWA|Tuv6|WSWS)$/i, // staging codes, then production (722 = Tuv6, 2196 = WSWS)
    });

    // Listing
    this.heading = page.getByRole('heading', {
      name: 'Announcements',
      level: 1,
    });
    this.total = page.getByText(/^\d+ announcements?$/);
    this.aboutButton = page.getByRole('button', {
      name: 'About announcements',
    });
    this.search = page.getByRole('textbox', { name: 'Search announcements' });
    this.sort = page.getByRole('combobox', { name: 'Sort announcements' });
    this.createButton = page
      .getByRole('button', { name: 'Create announcement' })
      .first();

    // Create and edit pages
    this.title = page.getByRole('textbox', { name: 'Title *' });
    this.description = page.getByRole('textbox', { name: 'Description *' });
    this.titleCounter = page.getByText(/^[\d,]+ \/ 100 characters$/);
    this.descriptionCounter = page.getByText(/^[\d,]+ \/ 10,000 characters$/);
    this.fileInput = page.locator('input[type="file"]');
    this.allDrivers = page.getByRole('radio', { name: /^All drivers/ });
    this.selectedDrivers = page.getByRole('radio', {
      name: /^Selected drivers/,
    });
    this.editSelection = page.getByRole('button', { name: 'Edit selection' });
    this.acknowledgement = page.getByRole('checkbox', {
      name: 'Require acknowledgement',
    });
    this.status = page
      .getByRole('status')
      .filter({ hasNotText: /sent to|deleted|saved/i });
    this.cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    this.reviewAndSend = page.getByRole('button', { name: 'Review & send' });
    this.reviewChanges = page.getByRole('button', { name: 'Review changes' });
    this.dialog = page.getByRole('dialog').last();
    this.backToEditing = page.getByRole('button', { name: 'Back to editing' });
    this.send = page.getByRole('button', { name: 'Send announcement' });
    this.saveChanges = page.getByRole('button', { name: 'Save changes' });

    // Details page
    this.edit = page.getByRole('button', { name: 'Edit', exact: true });
    this.delete = page.getByRole('button', { name: 'Delete', exact: true });
    this.commentBox = page.getByRole('textbox', { name: 'Write a comment' });
    this.post = page.getByRole('button', { name: 'Post' });
    this.toast = page
      .getByRole('status')
      .filter({ hasText: /sent to|deleted|saved|failed|error/i });
  }

  // Logs in (the announcement owner unless given), selects the announcement station and opens the listing
  async open(
    email = process.env.ANN_OWNER_EMAIL,
    password = process.env.ANN_OWNER_PASSWORD,
  ) {
    const loginPage = new LoginPage(this.page);
    await loginPage.open();
    await loginPage.login(email, password);
    await this.page.waitForURL(/dashboard|chat/, { timeout: 30000 });
    await this.selectStation(process.env.ANN_STATION_CODE);
    await this.openListing();
  }

  async selectStation(code) {
    await this.stationButton.waitFor();
    const same = (text) => text.trim().toLowerCase() === code.toLowerCase();
    if (same(await this.stationButton.innerText())) return;
    await this.stationButton.click();
    // Owners of several stations get a menu of buttons ("D DYY6"), other users a list of station codes.
    // Case-insensitive and not anchored: on production the codes are mixed case ("Tuv6").
    await this.page
      .getByRole('menu')
      .getByRole('button', { name: new RegExp('\\b' + code + '\\b', 'i') })
      .or(
        this.page.locator('.MuiPopover-paper').getByText(code, { exact: true }),
      )
      .first()
      .click();
    await this.stationButton
      .filter({ hasText: new RegExp('^' + code + '$', 'i') })
      .waitFor();
  }

  async openListing() {
    await this.page.goto('/announcements');
    await this.total.waitFor();
  }

  async openDetails(id) {
    await this.page.goto('/announcements/' + id);
  }

  async openEdit(id) {
    await this.page.goto('/announcements/' + id + '/edit');
  }

  // The card of an announcement in the listing (its title is a heading)
  card(title) {
    return this.page
      .getByRole('heading', { name: title, level: 3 })
      .locator(
        'xpath=ancestor::*[.//button[normalize-space()="View details"]][1]',
      );
  }

  // Opens the "Actions for <title>" menu of a card and returns the names of its items
  async cardActions(title) {
    await this.page
      .getByRole('button', { name: 'Actions for ' + title })
      .click();
    const items = await this.page.getByRole('menuitem').allInnerTexts();
    return items.map((t) => t.trim());
  }

  // Types into the description (a rich-text box). A line typed as "- " starts a bulleted list; Enter in a list
  // continues the list. The first two characters of a line are typed, the rest is inserted (faster).
  async typeDescription(text) {
    await this.description.click();
    for (const [i, line] of text.split('\n').entries()) {
      if (i > 0) await this.page.keyboard.press('Enter');
      await this.page.keyboard.type(line.slice(0, 2));
      if (line.length > 2) await this.page.keyboard.insertText(line.slice(2));
    }
  }

  // Opens the driver picker: choose Selected drivers, or (already chosen) Edit selection or the
  // button of the "No drivers selected yet" message
  async openPicker() {
    if (await this.selectedDrivers.isChecked()) {
      await this.editSelection
        .or(this.page.getByRole('alert').getByRole('button'))
        .first()
        .click();
    } else {
      await this.selectedDrivers.check();
    }
    await this.dialog
      .getByRole('heading', { name: 'Select drivers' })
      .waitFor();
    return this.dialog;
  }

  // The driver picker → search → tick each driver → Save selection
  async pickDrivers(names) {
    const picker = await this.openPicker();
    for (const name of names) {
      await picker.getByRole('textbox', { name: 'Search drivers' }).fill(name);
      await picker.getByRole('checkbox', { name, exact: true }).check();
    }
    await picker.getByRole('button', { name: /^Save selection/ }).click();
  }

  // Fills title, description and the test driver, ready for "Review & send"
  async fillAnnouncement(
    title,
    description = 'QA automation announcement. Please ignore.',
  ) {
    await this.title.fill(title);
    await this.typeDescription(description);
    await this.pickDrivers([process.env.ANN_DRIVER_NAME]);
  }
}

module.exports = AnnouncementsPage;
