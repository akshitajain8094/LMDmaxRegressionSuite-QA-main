const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const path = require('path');
const ann = require('../../api/announcements');
const AnnouncementsPage = require('../../pages/AnnouncementsPage');

// Announcements module, web app (sheet "Announcements_Module_Test_Cases", ANN-xxx, see docs/announcements-coverage.md).
// Station ANN_STATION_ID / ANN_STATION_CODE (DYY6 on staging), logged in as ANN_OWNER (Arth, "Admin A").
// Every announcement goes only to ANN_DRIVER_NAME (Chad Elnahal): @adds-data. Announcements a test needs are
// made through the API (api/announcements.js) and deleted after the test.
base.skip(!process.env.ANN_STATION_ID, 'ANN_* not set in .env');

// api: a request context for the API server (the UI project's baseURL is the web app)
const test = base.extend({
  api: async ({}, use) => {
    const context = await playwrightRequest.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: { 'app-type': '2', Origin: process.env.UI_BASE_URL },
    });
    await use(context);
    await context.dispose();
  },
});

const tags = { tag: ['@regression', '@adds-data'] };
const bugTags = { tag: ['@regression', '@adds-data', '@knownbug'] };
const file = (name) =>
  path.join(__dirname, '../../test-files/announcements', name);
const driverName = () => process.env.ANN_DRIVER_NAME;
const unique = (word = 'QA UI') => word + ' ' + Date.now();

let created = [];
test.afterEach(async ({ api }) => {
  for (const id of created) await ann.cleanUp(api, id);
  created = [];
});

async function sendByApi(api, fields) {
  const announcement = await ann.create(api, await ann.login(), fields);
  created.push(announcement.id);
  return announcement;
}

// The announcements with this title (to find what the screen sent, and to clean it up)
async function sentWithTitle(api, title) {
  const data = await ann.dataOf(
    await ann.api.list(api, await ann.login(), { search: title, limit: 50 }),
    'Listing',
  );
  const found = data.announcements.filter((a) => a.title === title);
  created.push(...found.map((a) => a.announcement_id));
  return found;
}

// The text of a card as it reads on the screen, one space between the parts, without "View details"
async function cardText(announcements, title) {
  const card = announcements.card(title);
  await card.waitFor();
  return (await card.innerText())
    .replace(/\s+/g, ' ')
    .replace(/ ?View details$/, '')
    .trim();
}

// In the driver picker: the first driver in the list who is not the test driver
const otherDriver = (picker) =>
  picker
    .getByRole('checkbox', {
      name: new RegExp('^(?!Select all|' + driverName() + '$)'),
    })
    .first();

async function openCreate(page) {
  const announcements = new AnnouncementsPage(page);
  await announcements.open();
  await announcements.createButton.click();
  await expect(announcements.title).toBeVisible();
  return announcements;
}

// ---------- AC1: listing ----------

test.describe('AC1 Listing', () => {
  test(
    'ANN-008: Verify the information tooltip of the listing',
    tags,
    async ({ page }) => {
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.aboutButton.hover();
      // The sheet expects "announcement go to drivers only new drivers automatically receive every announcement
      // when they join": the app has the same words with capitals and full stops (sheet typo, to confirm with the BA)
      await expect(page.getByRole('tooltip')).toHaveText(
        'Announcements go to drivers only. New drivers automatically receive every announcement when they join.',
      );
    },
  );

  test(
    'ANN-009 to ANN-015, ANN-017: Verify the card: title, description preview, creator, date, audience, attachments, seen, acknowledged and comment counts',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const ids = [];
      for (const name of ['qa-sample.pdf', 'qa-sample.png', 'qa-sample.docx']) {
        const f = require('fs').readFileSync(file(name));
        ids.push(
          (
            await ann.upload(api, owner, {
              name,
              mimeType: name.endsWith('pdf')
                ? 'application/pdf'
                : name.endsWith('png')
                  ? 'image/png'
                  : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              buffer: f,
            })
          ).attachment_id,
        );
      }
      const { id, body } = await sendByApi(api, {
        title: unique('QA card'),
        attachment_ids: ids,
        acknowledgement_enabled: true,
      });
      await ann.addComment(api, owner, id, 'QA comment');
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      // The card as it reads on the screen, e.g. "QA card … 1 driver … By Arth • Nov 4, 2026 · 12:38 PM • 3 attachments 0/1 seen 0/1 acknowledged 1"
      const text = await cardText(announcements, body.title);
      expect(text).toContain(body.description);
      expect(text).toMatch(
        /By Arth • \w{3} \d{1,2}, \d{4} · \d{1,2}:\d{2} [AP]M • 3 attachments 0\/1 seen 0\/1 acknowledged 1$/,
      );
      expect(text).toContain('1 driver');
    },
  );

  test(
    'ANN-013, ANN-016, ANN-018: Verify that a card without attachments, acknowledgement or comments shows none of these counts',
    tags,
    async ({ page, api }) => {
      const { body } = await sendByApi(api, {
        title: unique('QA plain card'),
        comment_mode: 'off',
        acknowledgement_enabled: false,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      const text = await cardText(announcements, body.title);
      expect(text).toMatch(/[AP]M 0\/1 seen/); // no attachment count between the date and the seen count
      expect(text).not.toContain('attachment');
      expect(text).not.toContain('acknowledged');
      expect(text).toMatch(/0\/1 seen Comments off$/); // "Comments off" instead of a comment count
    },
  );

  test(
    'ANN-050: Verify that the card preview keeps the line breaks and bullets of the description',
    tags,
    async ({ page, api }) => {
      const description =
        'First paragraph\nsecond line\n\n- bullet one\n- bullet two\n\n1. first\n2. second';
      const { body } = await sendByApi(api, {
        title: unique('QA preview'),
        description,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      const preview = announcements
        .card(body.title)
        .locator('p')
        .filter({ hasText: 'First paragraph' });
      // The text keeps its lines, and the screen shows them as lines (the card shows the first lines only)
      await expect(preview).toHaveJSProperty('textContent', description);
      expect(
        await preview.evaluate((e) => getComputedStyle(e).whiteSpace),
      ).toMatch(/^pre(-line|-wrap)?$/);
      const lineHeight = await preview.evaluate((e) =>
        parseFloat(getComputedStyle(e).lineHeight),
      );
      expect((await preview.boundingBox()).height).toBeGreaterThan(
        lineHeight * 1.5,
      );
    },
  );

  test(
    'ANN-022: Verify that the creating admin has View details, Edit and Delete on their card',
    tags,
    async ({ page, api }) => {
      const { body } = await sendByApi(api, { title: unique('QA actions') });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await expect(
        announcements
          .card(body.title)
          .getByRole('button', { name: 'View details' }),
      ).toBeVisible();
      expect(await announcements.cardActions(body.title)).toEqual(
        expect.arrayContaining(['Edit', 'Delete']),
      );
    },
  );

  test(
    'ANN-023: Verify that an admin who did not create the announcement has only View details on its card (no Edit, no Delete)',
    tags,
    async ({ page, api }) => {
      const { body } = await sendByApi(api, { title: unique('QA actions B') });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(
        process.env.ADMIN_B_EMAIL,
        process.env.ADMIN_B_PASSWORD,
      );
      await expect(
        announcements
          .card(body.title)
          .getByRole('button', { name: 'View details' }),
      ).toBeVisible();
      // Only the creator edits and deletes (delete rule changed 2026-11-12)
      expect(await announcements.cardActions(body.title)).toEqual([
        'View details',
      ]);
    },
  );

  test(
    'ANN-024, ANN-025, ANN-026: Verify searching by full title, by a partial term, and with no match (and clearing it)',
    tags,
    async ({ page, api }) => {
      const word = 'Qsearch' + Date.now();
      const a = await sendByApi(api, { title: word + ' alpha' });
      const b = await sendByApi(api, { title: word + ' beta' });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      const cards = page.getByRole('heading', { level: 3 });
      await announcements.search.fill(a.body.title);
      await expect(cards).toHaveText([a.body.title]);
      await announcements.search.fill(word);
      await expect(cards).toHaveText([b.body.title, a.body.title]);
      await announcements.search.fill('zz-no-such-announcement');
      await expect(cards).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Clear search' }).first(),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Clear search' }).first().click();
      await expect(announcements.search).toHaveValue('');
      await expect(cards.first()).toBeVisible();
    },
  );

  test(
    'ANN-027, ANN-028: Verify that the listing is newest first and can be sorted oldest first',
    tags,
    async ({ page, api }) => {
      const word = 'Qsort' + Date.now();
      const older = await sendByApi(api, { title: word + ' older' });
      const newer = await sendByApi(api, { title: word + ' newer' });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await expect(announcements.sort).toHaveText('Newest first');
      await announcements.search.fill(word);
      const cards = page.getByRole('heading', { level: 3 });
      await expect(cards).toHaveText([newer.body.title, older.body.title]);
      await announcements.sort.click();
      await page.getByRole('option', { name: 'Oldest first' }).click();
      await expect(cards).toHaveText([older.body.title, newer.body.title]);
    },
  );
});

// ---------- AC2 to AC6: create, validation, recipients, settings, review and send ----------

test.describe('AC2 Create page and validation', () => {
  test(
    'ANN-029, ANN-078, ANN-073: Verify the create page has Content, Recipients and Engagement on one page; Everyone and no acknowledgement are the defaults',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      for (const region of ['Content', 'Recipients', 'Engagement']) {
        await expect(page.getByRole('region', { name: region })).toBeVisible();
      }
      await expect(
        page.getByRole('radio', { name: /^Everyone can comment and reply/ }),
      ).toBeChecked();
      await expect(announcements.allDrivers).toBeChecked();
      await expect(announcements.acknowledgement).not.toBeChecked();
    },
  );

  test(
    'ANN-030: Verify that Cancel on the create page returns to the listing and sends nothing',
    tags,
    async ({ page, api }) => {
      const announcements = await openCreate(page);
      const title = unique('QA cancel');
      await announcements.fillAnnouncement(title);
      await expect(announcements.page.getByRole('dialog')).toHaveCount(0);
      await announcements.cancel.click();
      await expect(page, 'one click on Cancel').toHaveURL(/\/announcements$/, {
        timeout: 5000,
      });
      expect(await sentWithTitle(api, title)).toEqual([]);
    },
  );

  test(
    'ANN-031, ANN-096: Verify that going back from the review keeps the data, and cancelling then sends nothing',
    tags,
    async ({ page, api }) => {
      const announcements = await openCreate(page);
      const title = unique('QA back');
      await announcements.fillAnnouncement(title);
      await announcements.reviewAndSend.click();
      await expect(announcements.dialog).toContainText(title);
      await announcements.backToEditing.click();
      await expect(announcements.title).toHaveValue(title);
      await expect(announcements.description).toContainText(
        'QA automation announcement',
      );
      await expect(page.getByText('1 driver selected')).toBeVisible();
      await announcements.title.fill(title + ' new');
      await announcements.reviewAndSend.click();
      await expect(announcements.dialog).toContainText(title + ' new');
      await announcements.backToEditing.click();
      await announcements.cancel.click();
      await expect(page).toHaveURL(/\/announcements$/);
      expect([
        ...(await sentWithTitle(api, title)),
        ...(await sentWithTitle(api, title + ' new')),
      ]).toEqual([]);
    },
  );

  test(
    'ANN-032 to ANN-035: Verify that Review & send stays blocked with a message while the title or description is missing or only spaces',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      const blocked = async (step) => {
        await expect(announcements.reviewAndSend, step).toBeDisabled();
        await expect(announcements.status, step).toHaveText(
          'Add a title and description to continue.',
        );
      };
      await blocked('ANN-034 both missing');
      await announcements.typeDescription('QA description');
      await blocked('ANN-032 title missing');
      await announcements.title.fill('   ');
      await blocked('ANN-035 title of spaces');
      await announcements.title.fill('QA title');
      await announcements.description.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await blocked('ANN-033 description missing');
      await page.keyboard.insertText('   ');
      await blocked('ANN-035 description of spaces');
    },
  );

  test(
    'ANN-036, ANN-077: Verify that Selected drivers with no driver blocks the review with "Pick at least one driver"',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.title.fill('QA title');
      await announcements.typeDescription('QA description');
      const picker = await announcements.openPicker();
      await expect(
        picker.getByText('0 selected', { exact: true }),
      ).toBeVisible(); // ANN-073: nobody by default
      await picker.getByRole('button', { name: 'Cancel' }).click();
      await expect(announcements.reviewAndSend).toBeDisabled();
      await expect(page.getByRole('alert')).toContainText(
        'No drivers selected yet',
      );
      await expect(page.getByRole('alert')).toContainText(
        'Pick at least one driver, or switch to All drivers.',
      );
      // ANN-077: pick the driver, then remove them again
      await announcements.pickDrivers([driverName()]);
      await expect(announcements.reviewAndSend).toBeEnabled();
      await announcements.editSelection.click();
      await announcements.dialog
        .getByRole('checkbox', { name: driverName(), exact: true })
        .uncheck();
      await expect(
        announcements.dialog.getByRole('button', {
          name: 'Save selection (0)',
        }),
      ).toBeDisabled();
    },
  );

  test(
    'ANN-037, ANN-038, ANN-054: Verify that an unsupported file is marked and blocks the review until it is removed',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.fillAnnouncement('QA title');
      for (const name of [
        'qa-sample.txt',
        'qa-sample.gif',
        'qa-sample.mp4',
        'qa-sample.exe',
      ]) {
        await announcements.fileInput.setInputFiles(file(name));
        await expect(page.getByText(name)).toBeVisible();
      }
      await expect(
        page.getByText(
          'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.',
        ),
      ).toHaveCount(4);
      await expect(announcements.status).toHaveText(
        'Remove the attachments that could not be added.',
      );
      await expect(announcements.reviewAndSend).toBeDisabled();
      for (const name of [
        'qa-sample.txt',
        'qa-sample.gif',
        'qa-sample.mp4',
        'qa-sample.exe',
      ]) {
        await page.getByRole('button', { name: 'Remove ' + name }).click();
      }
      await expect(announcements.status).toHaveText(/^Sends to 1 driver/);
      await expect(announcements.reviewAndSend).toBeEnabled();
    },
  );

  test(
    'ANN-055: Verify that an .exe renamed to .pdf is rejected with a message',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.fillAnnouncement('QA title');
      await announcements.fileInput.setInputFiles(file('qa-exe-renamed.pdf'));
      await expect(
        page.getByText('qa-exe-renamed.pdf is not a supported file type'),
      ).toBeVisible();
      await expect(announcements.reviewAndSend).toBeDisabled();
    },
  );
});

test.describe('AC3 Content and attachments', () => {
  test(
    'ANN-039, ANN-043: Verify that the title and description counters follow typing and deleting',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.title.fill('x'.repeat(20));
      await expect(announcements.titleCounter).toHaveText(
        '20 / 100 characters',
      );
      for (let i = 0; i < 5; i++) await announcements.title.press('Backspace');
      await expect(announcements.titleCounter).toHaveText(
        '15 / 100 characters',
      );
      await announcements.description.click();
      await page.keyboard.insertText('y'.repeat(200));
      await expect(announcements.descriptionCounter).toHaveText(
        '200 / 10,000 characters',
      );
      for (let i = 0; i < 50; i++) await page.keyboard.press('Backspace');
      await expect(announcements.descriptionCounter).toHaveText(
        '150 / 10,000 characters',
      );
    },
  );

  test(
    'ANN-040, ANN-044: Verify that the title takes exactly 100 and the description exactly 10,000 characters',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.title.fill('t'.repeat(100));
      await expect(announcements.titleCounter).toHaveText(
        '100 / 100 characters',
      );
      await announcements.description.click();
      await page.keyboard.insertText('d'.repeat(10000));
      await expect(announcements.descriptionCounter).toHaveText(
        '10,000 / 10,000 characters',
      );
      await expect(page.getByText(/cannot exceed/)).toHaveCount(0);
    },
  );

  // The app lets the text go over the limit, then shows "Title cannot exceed 100 characters. 101 / 100" and
  // blocks Review & send. The sheet expects that the extra characters are not taken at all.
  test(
    'ANN-041, ANN-042: Verify that the title does not take more than 100 characters, typed or pasted (BUG-UI-009)',
    bugTags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.title.fill('t'.repeat(100));
      await announcements.title.press('End');
      await page.keyboard.type('X'); // ANN-041: the 101st character
      await expect(announcements.titleCounter, 'ANN-041 typing').toHaveText(
        '100 / 100 characters',
      );
      await announcements.title.fill('');
      await announcements.title.focus();
      await page.keyboard.insertText('p'.repeat(150)); // ANN-042: like a paste
      await expect(announcements.titleCounter, 'ANN-042 paste').toHaveText(
        '100 / 100 characters',
      );
      await expect(announcements.title).toHaveValue('p'.repeat(100));
    },
  );

  test(
    'ANN-045, ANN-046: Verify that the description does not take more than 10,000 characters, typed or pasted (BUG-UI-009)',
    bugTags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.description.click();
      await page.keyboard.insertText('d'.repeat(10000));
      await page.keyboard.type('X'); // ANN-045
      await expect(
        announcements.descriptionCounter,
        'ANN-045 typing',
      ).toHaveText('10,000 / 10,000 characters');
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Delete');
      await page.keyboard.insertText('e'.repeat(10050)); // ANN-046: like a paste
      await expect(
        announcements.descriptionCounter,
        'ANN-046 paste',
      ).toHaveText('10,000 / 10,000 characters');
    },
  );

  test(
    'ANN-047, ANN-093, ANN-094, ANN-095: Verify the review: recipients, comments, acknowledgement, attachments, the preview with its list, and the number of drivers notified',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      const title = unique('QA review');
      await announcements.title.fill(title);
      await announcements.typeDescription(
        'First line\n- bullet one\nbullet two',
      );
      await expect(announcements.description.getByRole('listitem')).toHaveCount(
        2,
      );
      await announcements.pickDrivers([driverName()]);
      await page
        .getByRole('radio', { name: /^Drivers comment, admins reply/ })
        .check();
      await announcements.acknowledgement.check();
      await announcements.fileInput.setInputFiles([
        file('qa-sample.pdf'),
        file('qa-sample.png'),
      ]);
      await expect(
        page.getByRole('button', { name: 'Remove qa-sample.png' }),
      ).toBeVisible();
      await expect(announcements.reviewAndSend).toBeEnabled();
      await announcements.reviewAndSend.click();
      const review = announcements.dialog;
      await expect(
        review.getByRole('heading', { name: 'Review announcement' }),
      ).toBeVisible();
      for (const text of [
        '1 selected driver',
        driverName(),
        'Drivers comment, admins reply',
        'Required',
        '2 files',
        title,
        'qa-sample.pdf',
        'qa-sample.png',
        '1 driver will be notified.',
      ]) {
        await expect(
          review.getByText(text, { exact: false }).first(),
          text,
        ).toBeVisible();
      }
      // ANN-047: the preview keeps the line break and the two bullets
      const preview = (
        await review.getByText('First line').locator('..').innerText()
      ).replace(/[ \t]+/g, ' ');
      expect(preview).toMatch(
        /First line\s*\n\s*• ?bullet one\s*\n\s*• ?bullet two/,
      );
      await announcements.backToEditing.click();
      await announcements.cancel.click();
    },
  );

  test(
    'ANN-052, ANN-057, ANN-058: Verify that the five supported formats can be attached, and removing one keeps the others',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.fillAnnouncement('QA title');
      const names = [
        'qa-sample.pdf',
        'qa-sample.docx',
        'qa-sample.xlsx',
        'qa-sample.png',
      ];
      await announcements.fileInput.setInputFiles([
        ...names.map(file),
        path.join(__dirname, '../../test-files/driver-signature.jpeg'),
      ]);
      for (const name of [...names, 'driver-signature.jpeg']) {
        await expect(
          page.getByRole('button', { name: 'Remove ' + name }),
        ).toBeVisible();
      }
      await expect(page.getByText('Unsupported file type')).toHaveCount(0);
      await page.getByRole('button', { name: 'Remove qa-sample.docx' }).click();
      await expect(
        page.getByRole('button', { name: 'Remove qa-sample.docx' }),
      ).toHaveCount(0);
      await announcements.reviewAndSend.click();
      await expect(
        announcements.dialog.getByText('4 files', { exact: false }),
      ).toBeVisible();
      await expect(
        announcements.dialog.getByText('qa-sample.docx'),
      ).toHaveCount(0);
      await announcements.backToEditing.click();
    },
  );

  test(
    'ANN-053: Verify that a supported file can be attached by drag-and-drop',
    tags,
    async ({ page }) => {
      await openCreate(page);
      const pdf = require('fs')
        .readFileSync(file('qa-sample.pdf'))
        .toString('base64');
      const dropZone = page.getByText('Drag files here or');
      const dataTransfer = await page.evaluateHandle((b64) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const dt = new DataTransfer();
        dt.items.add(
          new File([bytes], 'qa-dropped.pdf', { type: 'application/pdf' }),
        );
        return dt;
      }, pdf);
      for (const event of ['dragenter', 'dragover', 'drop'])
        await dropZone.dispatchEvent(event, { dataTransfer });
      await expect(
        page.getByRole('button', { name: 'Remove qa-dropped.pdf' }),
      ).toBeVisible();
      await expect(page.getByText('Unsupported file type')).toHaveCount(0);
    },
  );
});

test.describe('AC4 Recipients', () => {
  test(
    'ANN-066, ANN-067, ANN-068, ANN-069, ANN-070, ANN-071, ANN-072: Verify the driver picker: search by name and ID, Select all, deselect, keep selections, no match',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const driver = await ann.findTestDriver(api, owner);
      const announcements = await openCreate(page);
      const picker = await announcements.openPicker();
      const search = picker.getByRole('textbox', { name: 'Search drivers' });
      const selectAll = picker.getByRole('checkbox', { name: /^Select all/ });
      const total = Number(
        (
          (await selectAll.getAttribute('aria-label')) ??
          (await picker.getByText(/^Select all \d+ drivers$/).innerText())
        ).match(/\d+/)[0],
      );
      // ANN-066: full and partial name
      await search.fill(driver.name);
      await expect(
        picker.getByRole('checkbox', { name: driver.name, exact: true }),
      ).toBeVisible();
      await search.fill(driver.name.slice(0, 4).toLowerCase());
      await expect(
        picker.getByRole('checkbox', { name: driver.name, exact: true }),
      ).toBeVisible();
      // ANN-067: driver ID
      await search.fill(String(driver.driver_id));
      await expect(
        picker.getByRole('checkbox', { name: driver.name, exact: true }),
      ).toBeVisible();
      // ANN-069: Select all during a search selects only the matches
      await search.fill(driver.name);
      await picker
        .getByRole('checkbox', { name: /^Select all \d+ matching/ })
        .check();
      await search.fill('');
      await expect(picker.getByText('1 driver selected')).toBeVisible();
      // ANN-071: choose a second driver while searching: both stay selected
      await otherDriver(picker).check();
      await expect(picker.getByText('2 drivers selected')).toBeVisible();
      // ANN-068: Select all without a search
      await picker
        .getByRole('checkbox', { name: /^Select all \d+ drivers$/ })
        .check();
      await expect(picker.getByText(total + ' drivers selected')).toBeVisible();
      // ANN-070: deselect one after Select all
      await picker
        .getByRole('checkbox', { name: driver.name, exact: true })
        .uncheck();
      await expect(
        picker.getByText(total - 1 + ' drivers selected'),
      ).toBeVisible();
      // ANN-072: no match, then clear
      await search.fill('zz-no-such-driver');
      await expect(
        picker.getByRole('checkbox', { name: driver.name, exact: true }),
      ).toHaveCount(0);
      await picker.getByRole('button', { name: 'Clear', exact: true }).click();
      await expect(
        picker.getByRole('checkbox', { name: driver.name, exact: true }),
      ).toBeVisible();
      // Nothing is sent: the picker is cancelled
      await picker.getByRole('button', { name: 'Cancel' }).click();
    },
  );

  test(
    'ANN-063, ANN-064: Verify that inactive drivers and drivers of other stations are not in the driver picker',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const list = await ann.dataOf(
        await api.get('/lmd/prfsrv/perf_driver/v3/driver_list', {
          headers: {
            'x-access-token': owner.token,
            'x-access-user': owner.account_id,
          },
          params: { limit: 1000, offset: 0 },
        }),
        'driver list',
      );
      const onStation = (d) =>
        (d.stations || []).some(
          (s) => String(s.station_id) === process.env.ANN_STATION_ID,
        );
      const inactive = list
        .filter((d) => d.status === 'inactive' && onStation(d))
        .map((d) => d.name);
      const elsewhere = list
        .filter((d) => d.status === 'active' && !onStation(d))
        .map((d) => d.name);
      const announcements = await openCreate(page);
      const picker = await announcements.openPicker();
      const search = picker.getByRole('textbox', { name: 'Search drivers' });
      const shown = [];
      for (const name of [...inactive.slice(0, 5), ...elsewhere.slice(0, 5)]) {
        await search.fill(name);
        await page.waitForTimeout(300);
        if (await picker.getByRole('checkbox', { name, exact: true }).count())
          shown.push(name);
      }
      test.skip(
        !inactive.length && !elsewhere.length,
        'no inactive or other-station driver to check',
      );
      expect(shown, 'inactive / other-station drivers in the picker').toEqual(
        [],
      );
    },
  );

  test(
    'ANN-074, ANN-075, ANN-076: Verify the recipient count and new-driver note for All and Selected drivers, and changing the selection before sending',
    tags,
    async ({ page }) => {
      const announcements = await openCreate(page);
      await announcements.title.fill('QA title');
      await announcements.typeDescription('QA description');
      const allLabel =
        (await announcements.allDrivers.getAttribute('aria-label')) ??
        (await page
          .getByText(/^All \d+ drivers, plus new drivers/)
          .innerText());
      const total = (
        await page.getByText(/^All \d+ drivers, plus new drivers/).innerText()
      ).match(/\d+/)[0];
      await expect(announcements.status, 'ANN-075').toContainText(
        'Sends to ' + total + ' drivers',
      );
      await expect(
        page
          .getByText('Drivers who join later get it automatically.', {
            exact: false,
          })
          .first(),
      ).toBeVisible();
      await announcements.pickDrivers([driverName()]);
      await expect(
        page.getByText(/^Sends to 1 driver\. New drivers won't receive it\./),
        'ANN-076',
      ).toBeVisible();
      // ANN-074: change the selection (add a second driver), check the review, then cancel: nothing is sent
      await announcements.editSelection.click();
      const picker = announcements.dialog;
      await otherDriver(picker).check();
      await picker.getByRole('button', { name: /^Save selection/ }).click();
      await announcements.reviewAndSend.click();
      await expect(
        announcements.dialog.getByText('2 selected drivers'),
      ).toBeVisible();
      await expect(
        announcements.dialog.getByText('2 drivers will be notified.'),
      ).toBeVisible();
      await announcements.backToEditing.click();
      await announcements.cancel.click();
      expect(allLabel).toBeTruthy();
    },
  );
});

test.describe('AC6 Send', () => {
  test(
    'ANN-097, ANN-101, ANN-102: Verify that sending publishes the announcement, says "sent to 1 driver" and shows it first in the listing',
    tags,
    async ({ page, api }) => {
      const announcements = await openCreate(page);
      const title = unique('QA send');
      await announcements.fillAnnouncement(title);
      await announcements.reviewAndSend.click();
      await announcements.send.click();
      await expect(
        page.getByText('Announcement sent to 1 driver.'),
      ).toBeVisible();
      await announcements.openListing();
      await expect(page.getByRole('heading', { level: 3 }).first()).toHaveText(
        title,
      );
      expect(await sentWithTitle(api, title)).toHaveLength(1);
    },
  );

  test(
    'ANN-104: Verify that a double click on Send announcement sends only one announcement',
    tags,
    async ({ page, api }) => {
      const announcements = await openCreate(page);
      const title = unique('QA double send');
      await announcements.fillAnnouncement(title);
      await announcements.reviewAndSend.click();
      await announcements.send.dblclick();
      await expect(
        page.getByText('Announcement sent to 1 driver.').first(),
      ).toBeVisible();
      await page.waitForTimeout(2000);
      expect(await sentWithTitle(api, title)).toHaveLength(1);
    },
  );

  test(
    'ANN-105: Verify that sending fails safely without a connection, and the retry sends exactly one announcement',
    tags,
    async ({ page, api }) => {
      const announcements = await openCreate(page);
      const title = unique('QA offline send');
      await announcements.fillAnnouncement(title);
      await announcements.reviewAndSend.click();
      await page.route('**/announcements/v1/create', (route) =>
        route.abort('internetdisconnected'),
      );
      await announcements.send.click();
      await expect(
        page.getByText(/failed|error|try again|network/i).first(),
      ).toBeVisible();
      expect(await sentWithTitle(api, title), 'nothing sent').toHaveLength(0);
      await page.unroute('**/announcements/v1/create');
      if (!(await announcements.send.isVisible()))
        await announcements.reviewAndSend.click();
      await announcements.send.click();
      await expect(
        page.getByText('Announcement sent to 1 driver.'),
      ).toBeVisible();
      expect(
        await sentWithTitle(api, title),
        'one after the retry',
      ).toHaveLength(1);
    },
  );
});

// ---------- AC7 and AC8: details and comments ----------

test.describe('AC7 Details', () => {
  test(
    'ANN-106, ANN-108, ANN-109, ANN-110, ANN-112, ANN-113, ANN-114: Verify the details page: header, Edit and Delete, tabs, description, attachment, delivery and settings',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const pdf = await ann.upload(api, owner, {
        name: 'qa-sample.pdf',
        mimeType: 'application/pdf',
        buffer: require('fs').readFileSync(file('qa-sample.pdf')),
      });
      const { id, body } = await sendByApi(api, {
        title: unique('QA details'),
        attachment_ids: [pdf.attachment_id],
        acknowledgement_enabled: true,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        body.title,
      );
      await expect(
        page.getByText(
          /^By Arth · Sent \w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M$/,
        ),
      ).toBeVisible();
      await expect(page.getByText('Comments: everyone').first()).toBeVisible();
      await expect(page.getByText(/Edited/)).toHaveCount(0); // ANN-108
      await expect(announcements.edit).toBeVisible();
      await expect(announcements.delete).toBeVisible();
      for (const tab of ['Overview', 'Activity', 'History'])
        await expect(
          page.getByRole('tab', { name: new RegExp('^' + tab) }),
        ).toBeVisible();
      await expect(page.getByText(body.description)).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Download qa-sample.pdf' }),
      ).toBeVisible();
      await expect(page.getByText('Sent to 1 driver')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Seen' }),
      ).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Acknowledged' }),
      ).toBeVisible();
      await expect(page.getByText('Created by')).toBeVisible();
      await expect(page.getByText('Required', { exact: true })).toBeVisible();
    },
  );

  test(
    'ANN-107, ANN-112: Verify that an edited announcement shows Edited with the date/time, and Last edited in the details',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, { title: unique('QA edited') });
      await ann.dataOf(
        await ann.api.update(api, owner, id, {
          ...body,
          title: body.title + ' edited',
        }),
        'Saving the edit',
      );
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(page.getByText(/Edited/).first()).toBeVisible();
      await expect(page.getByText('Last edited')).toBeVisible();
    },
  );

  test(
    'ANN-111, ANN-148: Verify that acknowledgement progress, filters and statuses are not shown when acknowledgement is Off',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA no ack'),
        acknowledgement_enabled: false,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(
        page.getByText('Acknowledgement not required.'),
      ).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Acknowledged' }),
      ).toHaveCount(0);
      await page.getByRole('tab', { name: /^Activity/ }).click();
      await expect(page.getByRole('button', { name: /^All 1/ })).toBeVisible();
      await expect(
        page.getByRole('button', { name: /^Not seen 1/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /acknowledged/i }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('columnheader', { name: /acknowledg/i }),
      ).toHaveCount(0);
    },
  );

  test(
    'ANN-115, ANN-125: Verify that another admin sees neither Edit nor Delete on the details page, and no Edit in the comments-off message',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA details B'),
        comment_mode: 'off',
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(
        process.env.ADMIN_B_EMAIL,
        process.env.ADMIN_B_PASSWORD,
      );
      await announcements.openDetails(id);
      await expect(
        page.getByText('Comments are off for this announcement'),
      ).toBeVisible();
      await expect(announcements.delete).toHaveCount(0);
      await expect(announcements.edit).toHaveCount(0);
      await expect(
        page.getByText('Comments are off for this announcement'),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Edit settings' }),
      ).toHaveCount(0);
    },
  );

  test(
    'ANN-123, ANN-124: Verify the comments-off message, and that the creator can go to Edit from it',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA comments off'),
        comment_mode: 'off',
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(
        page.getByText('Comments are off for this announcement'),
      ).toBeVisible();
      await expect(announcements.commentBox).toHaveCount(0);
      await page.getByRole('button', { name: 'Edit settings' }).click();
      await expect(page).toHaveURL(
        new RegExp('/announcements/' + id + '/edit'),
      );
      await expect(
        page.getByRole('heading', { name: 'Edit announcement' }),
      ).toBeVisible();
    },
  );

  test(
    'ANN-117: Verify that the attachment link on the details page does not open without a login (BUG-API-035)',
    bugTags,
    async ({ page, api, browser }) => {
      const owner = await ann.login();
      const pdf = await ann.upload(api, owner, {
        name: 'qa-sample.pdf',
        mimeType: 'application/pdf',
        buffer: require('fs').readFileSync(file('qa-sample.pdf')),
      });
      const { id } = await sendByApi(api, {
        title: unique('QA link'),
        attachment_ids: [pdf.attachment_id],
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      const href = await page
        .getByRole('link', { name: 'Download qa-sample.pdf' })
        .getAttribute('href');
      // A new browser without any login opens the copied link
      const stranger = await browser.newContext();
      const response = await stranger.request.get(href);
      await stranger.close();
      expect(response.status(), href).not.toBe(200);
    },
  );
});

test.describe('AC5, AC8 Comments', () => {
  test(
    'ANN-080, ANN-092, ANN-127, ANN-128, ANN-129: Verify that an admin posts a comment, has only Delete on it, and the delete asks first (Cancel keeps it)',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id } = await sendByApi(api, { title: unique('QA comment') });
      const parent = await ann.addComment(
        api,
        owner,
        id,
        'QA parent with reply',
      );
      await ann.addComment(api, owner, id, 'QA reply', parent.comment_id);
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await announcements.commentBox.fill('QA comment from the screen');
      await announcements.post.click();
      await expect(page.getByText('QA comment from the screen')).toBeVisible();
      // ANN-092: the comment's menu has Delete only, no Edit
      const actions = page
        .getByText('QA parent with reply', { exact: true })
        .locator(
          'xpath=ancestor::*[.//button[starts-with(@aria-label,"Comment actions for")]][1]',
        )
        .getByRole('button', { name: /^Comment actions for/ })
        .first();
      await actions.click();
      expect(
        (await page.getByRole('menuitem').allInnerTexts()).map((t) => t.trim()),
      ).toEqual(['Delete comment']);
      // ANN-127, ANN-128: the comment has a reply: the confirmation says the replies go too
      await page.getByRole('menuitem', { name: 'Delete comment' }).click();
      const confirm = announcements.dialog;
      await expect(confirm.getByText('Delete this comment?')).toBeVisible();
      await expect(confirm).toContainText(/repl/i);
      // ANN-129: Cancel keeps it
      await confirm.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('QA parent with reply')).toBeVisible();
      await expect(page.getByText('QA reply', { exact: true })).toBeVisible();
    },
  );

  test(
    'ANN-084: Verify that in "Drivers comment, admins reply" mode the admin has no box to start a new comment',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA private'),
        comment_mode: 'driver_owner_admin_reply',
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(
        page.getByText(/Admins can.t start a new comment/),
      ).toBeVisible();
      await expect(announcements.commentBox).toHaveCount(0);
    },
  );

  test(
    'ANN-121: Verify that unread comments of another admin are marked New',
    tags,
    async ({ page, api }) => {
      const adminB = await ann.login('ADMIN_B');
      const { id } = await sendByApi(api, { title: unique('QA new comments') });
      await ann.addComment(api, adminB, id, 'QA new one');
      await ann.addComment(api, adminB, id, 'QA new two');
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await expect(page.getByText('New', { exact: true })).toHaveCount(2);
    },
  );
});

// ---------- AC9 and AC10: activity and history ----------

test.describe('AC9, AC10 Activity and History', () => {
  test(
    'ANN-135, ANN-140, ANN-141, ANN-144, ANN-145, ANN-146: Verify the activity counts, the Not seen status, filters and search',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA activity'),
        acknowledgement_enabled: true,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await page.getByRole('tab', { name: /^Activity/ }).click();
      const table = page.getByRole('table', { name: 'Driver activity list' });
      await expect(
        table.getByRole('row', { name: new RegExp(driverName()) }),
      ).toContainText(/Not seen/);
      await page.getByRole('button', { name: /^Not seen/ }).click();
      await expect(
        table.getByRole('row', { name: new RegExp(driverName()) }),
      ).toBeVisible();
      await page.getByRole('button', { name: /^All/ }).first().click();
      await page
        .getByRole('textbox', { name: 'Search drivers' })
        .fill(driverName().split(' ')[0]);
      await expect(
        table.getByRole('row', { name: new RegExp(driverName()) }),
      ).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Search drivers' })
        .fill('zz-nobody');
      await expect(
        page.getByText(/No drivers found|Showing 0 drivers/).first(),
      ).toBeVisible();
    },
  );

  test(
    // The sheet also asks for the driver's station: dropped with the BA (2026-11-17), an announcement goes to the
    // drivers of one station only, so the Activity list has no station column.
    'ANN-137: Verify that each activity row shows the driver and whether they saw the announcement',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, {
        title: unique('QA activity station'),
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await page.getByRole('tab', { name: /^Activity/ }).click();
      const row = page
        .getByRole('table', { name: 'Driver activity list' })
        .getByRole('row', { name: new RegExp(driverName()) });
      await expect(row, 'the row has the seen status').toContainText(
        /Not seen|Seen/i,
      );
    },
  );

  test(
    'ANN-149, ANN-150: Verify that History lists the changes newest first with who and when, and a title change with before and after',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, {
        title: unique('QA history'),
      });
      await ann.dataOf(
        await ann.api.update(api, owner, id, {
          ...body,
          title: body.title + ' edited',
        }),
        'Saving the edit',
      );
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await page.getByRole('tab', { name: /^History/ }).click();
      const entries = page
        .getByRole('list', { name: 'History' })
        .getByRole('listitem');
      await expect(entries.last()).toContainText('created the announcement');
      const latest = entries.first();
      await expect(latest.getByText('Arth', { exact: true })).toBeVisible();
      await expect(latest.getByText('changed the Title')).toBeVisible();
      await expect(latest.locator('time')).toBeVisible();
      await expect(
        latest.getByText(body.title, { exact: true }),
        'old title',
      ).toBeVisible();
      await expect(
        latest.getByText(body.title + ' edited', { exact: true }),
        'new title',
      ).toBeVisible();
    },
  );
});

// ---------- AC11: edit ----------

test.describe('AC11 Edit', () => {
  test(
    'ANN-161, ANN-172, ANN-188: Verify that Edit opens with the current values and the sent-announcement warning, and Cancel saves nothing',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, {
        title: unique('QA edit page'),
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openEdit(id);
      await expect(announcements.title).toHaveValue(body.title);
      await expect(announcements.description).toContainText(body.description);
      await expect(
        page.getByText(
          /You.re editing a sent announcement \(1 driver\)\. Changes are recorded in History\./,
        ),
      ).toBeVisible();
      await expect(announcements.reviewChanges).toBeDisabled();
      await announcements.title.fill(body.title + ' changed');
      await announcements.cancel.click();
      const data = await ann.overview(api, owner, id);
      expect({
        title: data.title,
        is_edited: data.is_edited,
        history: data.tabs.history_count,
      }).toEqual({ title: body.title, is_edited: false, history: 1 });
    },
  );

  test(
    'ANN-162: Verify that an admin who did not create the announcement cannot edit it through the edit URL',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, { title: unique('QA edit URL') });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(
        process.env.ADMIN_B_EMAIL,
        process.env.ADMIN_B_PASSWORD,
      );
      await announcements.openEdit(id);
      // The app sends Admin B back to the details page (no edit form, no Edit button)
      await expect(page).toHaveURL(new RegExp('/announcements/' + id + '$'));
      await expect(
        page.getByRole('heading', { name: 'Edit announcement' }),
      ).toHaveCount(0);
      await expect(announcements.reviewChanges).toHaveCount(0);
      await expect(announcements.edit).toHaveCount(0);
    },
  );

  test(
    'ANN-173, ANN-174, ANN-175, ANN-184, ANN-183: Verify the save summary, the default options, the saved message with View history, and Edited',
    tags,
    async ({ page, api }) => {
      const { id, body } = await sendByApi(api, {
        title: unique('QA save'),
        acknowledgement_enabled: true,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openEdit(id);
      await announcements.title.fill(body.title + ' edited');
      await announcements.fileInput.setInputFiles(file('qa-sample.png'));
      await expect(
        page.getByRole('button', { name: 'Remove qa-sample.png' }),
      ).toBeVisible();
      await expect(announcements.reviewChanges).toBeEnabled();
      await announcements.reviewChanges.click();
      const dialog = announcements.dialog;
      await expect(
        dialog.getByRole('heading', { name: 'Save changes?' }),
      ).toBeVisible();
      await expect(dialog).toContainText(body.title + ' edited'); // ANN-173: the title change
      await expect(dialog.getByText('Added qa-sample.png')).toBeVisible(); // ANN-173: the attachment change
      await expect(
        dialog.getByRole('checkbox', {
          name: /^Notify drivers about this update/,
        }),
      ).toBeChecked(); // ANN-174
      await expect(
        dialog.getByRole('checkbox', {
          name: /^Ask drivers to acknowledge again/,
        }),
      ).not.toBeChecked(); // ANN-175
      await dialog
        .getByRole('checkbox', { name: /^Notify drivers about this update/ })
        .uncheck(); // no update SMS
      await announcements.saveChanges.click();
      await expect(page.getByText('Changes saved.')).toBeVisible(); // ANN-184
      await page.getByRole('button', { name: 'View history' }).click();
      await expect(page.getByRole('tab', { name: /^History/ })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.getByText(/Edited/).first()).toBeVisible(); // ANN-183
    },
  );

  test(
    'ANN-176, ANN-177: Verify that "Ask drivers to acknowledge again" is not offered when acknowledgement is Off or turned Off',
    tags,
    async ({ page, api }) => {
      const off = await sendByApi(api, {
        title: unique('QA ack off'),
        acknowledgement_enabled: false,
      });
      const on = await sendByApi(api, {
        title: unique('QA ack turned off'),
        acknowledgement_enabled: true,
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      for (const [name, a, turnOff] of [
        ['ANN-176', off, false],
        ['ANN-177', on, true],
      ]) {
        await announcements.openEdit(a.id);
        await announcements.title.fill(a.body.title + ' edited');
        if (turnOff) await announcements.acknowledgement.uncheck();
        await announcements.reviewChanges.click();
        await expect(
          announcements.dialog.getByRole('checkbox', {
            name: /^Ask drivers to acknowledge again/,
          }),
          name,
        ).toHaveCount(0);
        await announcements.backToEditing.click();
        await announcements.cancel.click();
      }
    },
  );

  test(
    'ANN-168, ANN-170, ANN-171: Verify that Edit blocks saving with a blank title or description, no driver, or an invalid attachment',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, { title: unique('QA edit checks') });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openEdit(id);
      await announcements.title.fill('  ');
      await expect(announcements.reviewChanges, 'ANN-168 title').toBeDisabled();
      await expect(announcements.status).toHaveText(
        'Add a title and description to continue.',
      );
      await announcements.title.fill('QA title');
      await announcements.fileInput.setInputFiles(file('qa-sample.txt'));
      await expect(
        page.getByText(
          'Unsupported file type. Use PDF, DOCX, XLSX, PNG or JPG.',
        ),
      ).toBeVisible();
      await expect(
        announcements.reviewChanges,
        'ANN-171 bad file',
      ).toBeDisabled();
      await page.getByRole('button', { name: 'Remove qa-sample.txt' }).click();
      await announcements.editSelection.click();
      await announcements.dialog
        .getByRole('checkbox', { name: driverName(), exact: true })
        .uncheck();
      await expect(
        announcements.dialog.getByRole('button', {
          name: 'Save selection (0)',
        }),
        'ANN-170 no driver',
      ).toBeDisabled();
    },
  );

  test(
    'ANN-189: Verify that saving fails safely without a connection, and the retry saves once',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, {
        title: unique('QA offline save'),
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openEdit(id);
      await announcements.title.fill(body.title + ' edited');
      await announcements.reviewChanges.click();
      await announcements.dialog
        .getByRole('checkbox', { name: /^Notify drivers about this update/ })
        .uncheck();
      await page.route('**/announcements/v1/update/**', (route) =>
        route.abort('internetdisconnected'),
      );
      await announcements.saveChanges.click();
      await expect(
        page.getByText(/failed|error|try again|network/i).first(),
      ).toBeVisible();
      expect((await ann.overview(api, owner, id)).title, 'nothing saved').toBe(
        body.title,
      );
      await page.unroute('**/announcements/v1/update/**');
      if (!(await announcements.saveChanges.isVisible())) {
        await announcements.reviewChanges.click();
        await announcements.dialog
          .getByRole('checkbox', { name: /^Notify drivers about this update/ })
          .uncheck();
      }
      await announcements.saveChanges.click();
      await expect(page.getByText('Changes saved.')).toBeVisible();
      const edits = (await ann.history(api, owner, id)).history.filter(
        (h) => h.action === 'edited',
      );
      expect(edits, 'one History entry').toHaveLength(1);
    },
  );
});

// ---------- AC12: delete ----------

test.describe('AC12 Delete', () => {
  test(
    'ANN-190, ANN-193: Verify the delete confirmation from the listing (title and impact), and that Cancel keeps the announcement',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, {
        title: unique('QA delete cancel'),
      });
      await ann.addComment(api, owner, id, 'QA comment');
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.cardActions(body.title);
      await page.getByRole('menuitem', { name: 'Delete' }).click();
      const dialog = announcements.dialog;
      await expect(dialog.getByText('Delete this announcement?')).toBeVisible();
      await expect(dialog).toContainText(
        '“' +
          body.title +
          '” will be removed for the 1 driver who received it, along with its 1 comment',
      );
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(announcements.card(body.title)).toBeVisible();
      expect((await ann.api.overview(api, owner, id)).status()).toBe(200);
    },
  );

  test(
    'ANN-191, ANN-195, ANN-197: Verify deleting from the details page: the same confirmation, a double click deletes once, and the deleted message',
    tags,
    async ({ page, api }) => {
      const owner = await ann.login();
      const { id, body } = await sendByApi(api, { title: unique('QA delete') });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      await announcements.openDetails(id);
      await announcements.delete.click();
      const dialog = announcements.dialog;
      await expect(dialog.getByText('Delete this announcement?')).toBeVisible();
      await expect(dialog).toContainText(body.title);
      // ANN-197: the delete requests the page sends for this announcement
      const deletes = [];
      page.on('request', (r) => {
        if (
          r.method() === 'DELETE' &&
          r.url().endsWith('/announcements/v1/' + id)
        )
          deletes.push(r.url());
      });
      await dialog.getByRole('button', { name: 'Delete' }).dblclick();
      await expect(
        page.getByText('“' + body.title + '” was deleted.').first(),
      ).toBeVisible();
      // The app waits 5 seconds (Undo) before it deletes
      await expect
        .poll(async () => (await ann.api.overview(api, owner, id)).status(), {
          timeout: 20000,
        })
        .toBe(404);
      await page.waitForTimeout(2000);
      expect(deletes, 'one delete request').toHaveLength(1);
    },
  );
});
