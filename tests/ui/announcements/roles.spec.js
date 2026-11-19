const {
  test: base,
  expect,
  request: playwrightRequest,
} = require('@playwright/test');
const ann = require('../../../api/announcements');
const AnnouncementsPage = require('../../../pages/AnnouncementsPage');

// Announcements by role, on the screens (story "Announcements", AC1, AC2, AC5, AC7, AC12). The main file
// (announcements.spec.js) logs in as the owner. This file logs in as the other roles of ANN_STATION_CODE (DYY6):
//   - ADMIN_B (gyani): an admin who is not the owner, as a creator
//   - PROMOTED_ADMIN (koala11): a driver promoted to admin
// Every announcement goes only to ANN_DRIVER_NAME (Chad Elnahal): @adds-data. Deleted after each test.
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
const unique = (word) => word + ' ' + Date.now();
const as = {
  admin: () => [process.env.ADMIN_B_EMAIL, process.env.ADMIN_B_PASSWORD],
  promoted: () => [
    process.env.PROMOTED_ADMIN_EMAIL,
    process.env.PROMOTED_ADMIN_PASSWORD,
  ],
};

let created = [];
test.afterEach(async ({ api }) => {
  for (const id of created) await ann.cleanUp(api, id);
  created = [];
});

// Sends an announcement through the API as who ('ANN_OWNER', 'ADMIN_B', ...)
async function sendByApi(api, who, fields) {
  const announcement = await ann.create(api, await ann.login(who), fields);
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

// Create page → title, description, the test driver → Review & send → Send announcement
async function sendOnScreen(announcements, title) {
  await announcements.createButton.click();
  await announcements.title.waitFor();
  await announcements.fillAnnouncement(title);
  await announcements.reviewAndSend.click();
  await announcements.send.click();
}

// ---------- An admin who is not the owner ----------

test.describe('Admin (not the owner)', () => {
  test.skip(!process.env.ADMIN_B_EMAIL, 'ADMIN_B_* not set in .env');

  test(
    'ROLE-UI-01 (ANN-097, ANN-022): Verify that an admin who is not the owner sends an announcement in the web app, and has Edit and Delete on its card',
    tags,
    async ({ page, api }) => {
      const announcements = new AnnouncementsPage(page);
      await announcements.open(...as.admin());
      const title = unique('QA admin send');
      await sendOnScreen(announcements, title);
      await expect(
        page.getByText('Announcement sent to 1 driver.'),
      ).toBeVisible();
      expect(await sentWithTitle(api, title)).toHaveLength(1);
      await announcements.openListing();
      await expect(announcements.card(title)).toContainText(/By\s*gyani/);
      expect(await announcements.cardActions(title)).toEqual(
        expect.arrayContaining(['Edit', 'Delete']),
      );
    },
  );

  test(
    "ROLE-UI-02 (ANN-023, ANN-115): Verify that the owner has neither Edit nor Delete on an admin's announcement (only the creator edits and deletes)",
    tags,
    async ({ page, api }) => {
      const { id, body } = await sendByApi(api, 'ADMIN_B', {
        title: unique('QA by admin'),
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open();
      expect(await announcements.cardActions(body.title)).toEqual([
        'View details',
      ]);
      await page.keyboard.press('Escape');
      await announcements.openDetails(id);
      await expect(page.getByText(body.title).first()).toBeVisible();
      await expect(announcements.delete).toHaveCount(0);
      await expect(announcements.edit).toHaveCount(0);
    },
  );
});

// ---------- A promoted admin ----------

test.describe('Promoted admin', () => {
  test.skip(!process.env.PROMOTED_ADMIN_EMAIL, 'PROMOTED_ADMIN_* not set');

  test(
    "ROLE-UI-03 (ANN-001, ANN-023, ANN-115): Verify that a promoted admin sees the owner's announcement with View details only (no Edit, no Delete)",
    tags,
    async ({ page, api }) => {
      const { id, body } = await sendByApi(api, 'ANN_OWNER', {
        title: unique('QA for promoted'),
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(...as.promoted());
      await expect(
        announcements
          .card(body.title)
          .getByRole('button', { name: 'View details' }),
      ).toBeVisible();
      expect(await announcements.cardActions(body.title)).toEqual([
        'View details',
      ]);
      await page.keyboard.press('Escape');
      await announcements.openDetails(id);
      await expect(page.getByText(body.title).first()).toBeVisible();
      await expect(announcements.delete).toHaveCount(0);
      await expect(announcements.edit).toHaveCount(0);
    },
  );

  test(
    'ROLE-UI-04 (ANN-080): Verify that a promoted admin posts a comment in "Everyone" mode',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, 'ANN_OWNER', {
        title: unique('QA promoted comment'),
        comment_mode: 'everyone',
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(...as.promoted());
      await announcements.openDetails(id);
      await announcements.commentBox.fill('QA comment by promoted admin');
      await announcements.post.click();
      await expect(
        page.getByText('QA comment by promoted admin'),
      ).toBeVisible();
    },
  );

  test(
    'ROLE-UI-05 (ANN-084): Verify that in "Drivers comment, admins reply" mode a promoted admin has no box to start a new comment',
    tags,
    async ({ page, api }) => {
      const { id } = await sendByApi(api, 'ANN_OWNER', {
        title: unique('QA promoted private'),
        comment_mode: 'driver_owner_admin_reply',
      });
      const announcements = new AnnouncementsPage(page);
      await announcements.open(...as.promoted());
      await announcements.openDetails(id);
      await expect(
        page.getByText(/Admins can.t start a new comment/),
      ).toBeVisible();
      await expect(announcements.commentBox).toHaveCount(0);
    },
  );

  test(
    'ROLE-UI-06 (AC1, AC2, BUG-API-045 fixed): Verify that a promoted admin can send an announcement from the Create page',
    tags,
    async ({ page, api }) => {
      const announcements = new AnnouncementsPage(page);
      await announcements.open(...as.promoted());
      const title = unique('QA promoted send');
      await sendOnScreen(announcements, title);
      // BUG-API-045 (fixed 2026-11-12): Send showed "...created_by: Only owner or admin can create an announcement"
      await expect(
        page
          .getByText('Announcement sent to 1 driver.')
          .or(page.getByText(/Only owner or admin can create/)),
      ).toBeVisible();
      await expect(
        page.getByText(/Only owner or admin can create/),
        'the server refused the promoted admin',
      ).toHaveCount(0);
      expect(await sentWithTitle(api, title)).toHaveLength(1);
    },
  );
});
