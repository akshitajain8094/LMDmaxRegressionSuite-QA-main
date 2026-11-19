const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const ann = require('../../../api/announcements');
const loginAsTestUser = require('../../../api/auth');
const { loginAs } = require('../../../api/auth');

// Announcements module (sheet "Announcements_Module_Test_Cases", ANN-xxx, see docs/announcements-coverage.md).
// Station ANN_STATION_ID (DYY6 on staging): the owner ANN_OWNER (Arth) is "Admin A", the admin who creates;
// ADMIN_B (gyani) is an admin who did not create. Every announcement goes only to the test driver
// ANN_DRIVER_NAME (Chad Elnahal), who gets a push notification and an SMS for each one: @adds-data.
// The project runs these tests one at a time (counts and "newest first" would change under a parallel test).
test.skip(!process.env.ANN_STATION_ID, 'ANN_* not set in .env');

const tags = { tag: ['@regression', '@adds-data'] };
const bugTags = { tag: ['@regression', '@adds-data', '@knownbug'] };

const file = (name, mimeType) => ({
  name,
  mimeType,
  buffer: fs.readFileSync(
    path.join(__dirname, '../../../test-files/announcements', name),
  ),
});
const files = {
  pdf: file('qa-sample.pdf', 'application/pdf'),
  docx: file(
    'qa-sample.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ),
  xlsx: file(
    'qa-sample.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ),
  png: file('qa-sample.png', 'image/png'),
  jpg: {
    name: 'qa-sample.jpg',
    mimeType: 'image/jpeg',
    buffer: fs.readFileSync(
      path.join(__dirname, '../../../test-files/driver-signature.jpeg'),
    ),
  },
};

// Announcements a test sent: deleted after the test
let created = [];
test.afterEach(async ({ request }) => {
  for (const id of created) await ann.cleanUp(request, id);
  created = [];
});

async function send(request, user, fields) {
  const announcement = await ann.create(request, user, fields);
  created.push(announcement.id);
  return announcement;
}

// Every announcement of the station, page by page
async function allAnnouncements(request, user, query = {}) {
  const all = [];
  let cursor;
  let total;
  do {
    const data = await ann.dataOf(
      await ann.api.list(request, user, {
        limit: 50,
        ...query,
        ...(cursor ? { cursor } : {}),
      }),
      'Listing announcements',
    );
    all.push(...data.announcements);
    total = data.total;
    cursor = data.pagination.has_more ? data.pagination.next_cursor : null;
  } while (cursor);
  return { all, total };
}

const findCard = async (request, user, id, title) =>
  (await allAnnouncements(request, user, { search: title })).all.find(
    (a) => a.announcement_id === id,
  );

// A status and a message, checked together so the report shows both
async function expectRejected(response, status, message) {
  const body = await ann.bodyOf(response);
  expect({
    status: response.status(),
    message: body.message ?? body.error,
  }).toEqual({
    status,
    message: expect.stringMatching(message),
  });
}

// ---------- AC1: access and listing ----------

test.describe('AC1 Access and listing', () => {
  test(
    'ANN-001, ANN-002: Verify that the owner and an admin of the station see its announcements in the listing',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const card = await findCard(request, owner, id, body.title);
      expect(card, 'owner sees the announcement').toBeTruthy();
      const adminB = await ann.login('ADMIN_B');
      expect(
        await findCard(request, adminB, id, body.title),
        'Admin B sees it',
      ).toBeTruthy();
    },
  );

  test(
    'ANN-003: Verify that announcements of one station do not appear in the listing of another station, and a user without access cannot select the station',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      // The same owner on another station (AQWA): the DYY6 announcement is not listed
      const otherStation = await loginAs(
        'ANN_OWNER',
        process.env.ANN_OWNER_EMAIL,
        process.env.ANN_OWNER_PASSWORD,
        process.env.CHAT_STATION_ID,
      );
      expect(
        await findCard(request, otherStation, id, body.title),
      ).toBeUndefined();
      // The test user (no access to DYY6) cannot select the station at all
      await expect(
        loginAs(
          'the test user',
          process.env.LOGIN_EMAIL,
          process.env.LOGIN_PASSWORD,
          process.env.ANN_STATION_ID,
        ),
      ).rejects.toThrow(/has no access to station/);
    },
  );

  test(
    'ANN-004, ANN-117: Verify that a user of another station cannot open an announcement, its activity, history or attachment through a direct link',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const attachment = await ann.upload(request, owner, files.pdf);
      const { id } = await send(request, owner, {
        attachment_ids: [attachment.attachment_id],
      });
      const stranger = await loginAsTestUser(); // the test user, on another station (DYY1)
      const calls = {
        overview: await ann.api.overview(request, stranger, id),
        activity: await ann.api.activity(request, stranger, id),
        history: await ann.api.history(request, stranger, id),
        download: await ann.api.download(
          request,
          stranger,
          id,
          attachment.attachment_id,
        ),
        'download without login': await ann.api.download(
          request,
          null,
          id,
          attachment.attachment_id,
        ),
      };
      const result = {};
      for (const [name, response] of Object.entries(calls)) {
        const text = await response.text();
        result[name] = {
          denied: [401, 403, 404].includes(response.status()),
          leaksTitle: text.includes('QA announcement'),
        };
      }
      for (const name of Object.keys(calls)) {
        expect(result[name], name).toEqual({ denied: true, leaksTitle: false });
      }
    },
  );

  test(
    "ANN-117: Verify that an attachment's file link cannot be opened without a login (BUG-API-035)",
    bugTags,
    async ({ request }) => {
      const owner = await ann.login();
      const attachment = await ann.upload(request, owner, files.pdf);
      const { id } = await send(request, owner, {
        attachment_ids: [attachment.attachment_id],
      });
      const { attachments } = await ann.overview(request, owner, id);
      // The overview gives every viewer the file's storage link (url): it must not open without a login
      const response = await request.get(attachments[0].url, { headers: {} });
      expect(response.status(), attachments[0].url).not.toBe(200);
    },
  );

  test(
    'ANN-005: Verify that the total count equals the number of announcements in the listing',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      await send(request, owner);
      await send(request, owner);
      await send(request, owner);
      const { all, total } = await allAnnouncements(request, owner);
      expect(total).toBe(all.length);
      expect(total).toBeGreaterThanOrEqual(3);
    },
  );

  test(
    'ANN-006: Verify that a station without announcements answers a total of 0 and an empty list',
    tags,
    async ({ request }) => {
      const otherStation = await loginAs(
        'ANN_OWNER',
        process.env.ANN_OWNER_EMAIL,
        process.env.ANN_OWNER_PASSWORD,
        process.env.CHAT_STATION_ID,
      );
      const data = await ann.dataOf(
        await ann.api.list(request, otherStation),
        'Listing announcements',
      );
      test.skip(
        data.total > 0,
        'station ' + process.env.CHAT_STATION_ID + ' has announcements now',
      );
      expect(data).toEqual({
        announcements: [],
        total: 0,
        pagination: { next_cursor: null, has_more: false },
      });
    },
  );

  test(
    'ANN-007: Verify that the total count increases by one after a new announcement is sent',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const before = (await allAnnouncements(request, owner)).total;
      await send(request, owner);
      expect((await allAnnouncements(request, owner)).total).toBe(before + 1);
    },
  );

  test.describe('the card', () => {
    // One announcement with 3 attachments, acknowledgement on and one comment; read by every test here
    let card;
    let cardId;
    test.beforeAll(async ({ request }) => {
      const owner = await ann.login();
      const ids = [];
      for (const f of [files.pdf, files.png, files.docx])
        ids.push((await ann.upload(request, owner, f)).attachment_id);
      const { id, body } = await ann.create(request, owner, {
        attachment_ids: ids,
        acknowledgement_enabled: true,
      });
      cardId = id;
      await ann.addComment(request, owner, id, 'QA comment');
      card = await findCard(request, owner, id, body.title);
      card.sentTitle = body.title;
    });
    test.afterAll(async ({ request }) => {
      if (cardId) await ann.cleanUp(request, cardId);
    });

    test(
      'ANN-009: Verify that each card has the title, description preview, creator and publication date/time',
      tags,
      async () => {
        expect(card).toMatchObject({
          title: card.sentTitle,
          description_preview: 'QA automation announcement. Please ignore.',
          created_by: { name: 'Arth', role: 'owner' },
        });
        expect(Date.now() - Date.parse(card.published_at)).toBeLessThan(
          10 * 60 * 1000,
        );
      },
    );

    test(
      'ANN-011: Verify that a Selected drivers card shows the number of selected drivers',
      tags,
      async () => {
        expect(card.audience).toEqual({ type: 'selected', recipients: 1 });
      },
    );

    test(
      'ANN-012: Verify that the card shows the attachment count',
      tags,
      async () => {
        expect(card.attachment_count).toBe(3);
      },
    );

    test(
      'ANN-014, ANN-015: Verify that the card shows the seen and acknowledged counts as x/y',
      tags,
      async () => {
        // The test driver has not opened it: 0 of 1 (counts above 0 need the driver app)
        expect({ seen: card.seen, acknowledged: card.acknowledged }).toEqual({
          seen: { count: 0, total: 1 },
          acknowledged: { count: 0, total: 1 },
        });
      },
    );

    test(
      'ANN-017: Verify that the card shows the comment count when comments are on',
      tags,
      async () => {
        expect({
          comment_mode: card.comment_mode,
          comment_count: card.comment_count,
        }).toEqual({
          comment_mode: 'everyone',
          comment_count: 1,
        });
      },
    );

    test(
      'ANN-022: Verify that the creating admin may edit and delete their own announcement',
      tags,
      async ({ request }) => {
        const owner = await ann.login();
        const data = await ann.overview(request, owner, cardId);
        expect({
          list: card.can_edit,
          can_edit: data.can_edit,
          can_delete: data.can_delete,
        }).toEqual({
          list: true,
          can_edit: true,
          can_delete: true,
        });
      },
    );

    test(
      'ANN-023, ANN-115: Verify that another admin may neither edit nor delete the announcement (only its creator)',
      tags,
      async ({ request }) => {
        const adminB = await ann.login('ADMIN_B');
        const listed = await findCard(request, adminB, cardId, card.sentTitle);
        const data = await ann.overview(request, adminB, cardId);
        expect({
          list: listed.can_edit,
          can_edit: data.can_edit,
          can_delete: data.can_delete,
        }).toEqual({
          list: false,
          can_edit: false,
          can_delete: false,
        });
      },
    );
  });

  test(
    'ANN-013, ANN-016, ANN-018: Verify that a card without attachments, acknowledgement or comments shows none of these counts',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner, {
        comment_mode: 'off',
        acknowledgement_enabled: false,
      });
      const card = await findCard(request, owner, id, body.title);
      expect({
        attachment_count: card.attachment_count,
        comment_mode: card.comment_mode,
        acknowledged: card.acknowledged ?? null,
      }).toEqual({
        attachment_count: 0,
        comment_mode: 'off',
        acknowledged: null,
      });
    },
  );

  test(
    'ANN-019, ANN-020, ANN-021: Verify the unread-comment indicator: shown for new comments of another admin, cleared after reading',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id, body } = await send(request, owner);
      const before = await findCard(request, owner, id, body.title);
      await ann.addComment(request, adminB, id, 'QA comment from Admin B');
      await ann.addComment(
        request,
        adminB,
        id,
        'QA second comment from Admin B',
      );
      const unread = await findCard(request, owner, id, body.title);
      await ann.overview(request, owner, id); // the owner opens the announcement: the comments are read
      const read = await findCard(request, owner, id, body.title);
      expect({
        'ANN-021 no comments': before.has_unread_comments,
        'ANN-019 two new comments': [
          unread.has_unread_comments,
          unread.unread_comment_count,
        ],
        'ANN-020 after reading': [
          read.has_unread_comments,
          read.unread_comment_count,
        ],
      }).toEqual({
        'ANN-021 no comments': false,
        'ANN-019 two new comments': [true, 2],
        'ANN-020 after reading': [false, 0],
      });
    },
  );

  test(
    'ANN-024, ANN-025, ANN-026: Verify searching by full title, by a partial term, and with no match',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const word = 'Qsearch' + Date.now();
      const a = await send(request, owner, { title: word + ' alpha' });
      const b = await send(request, owner, { title: word + ' beta' });
      const ids = async (search) =>
        (await allAnnouncements(request, owner, { search })).all
          .map((x) => x.announcement_id)
          .sort();
      expect({
        full: await ids(word + ' alpha'),
        partial: await ids(word),
        none: await ids('zz-no-such-announcement-' + Date.now()),
      }).toEqual({ full: [a.id], partial: [a.id, b.id].sort(), none: [] });
    },
  );

  test(
    'ANN-027, ANN-028, ANN-102: Verify that the listing is newest first by default, can be sorted oldest first, and a new announcement is on top',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      await send(request, owner);
      const newest = await send(request, owner);
      const byDefault = (
        await ann.dataOf(
          await ann.api.list(request, owner, { sort: undefined }),
          'list',
        )
      ).announcements;
      const oldest = (
        await allAnnouncements(request, owner, { sort: 'oldest' })
      ).all;
      const times = (list) => list.map((a) => Date.parse(a.published_at));
      expect(
        byDefault[0].announcement_id,
        'ANN-102 the new announcement is first',
      ).toBe(newest.id);
      expect(times(byDefault), 'ANN-027 newest first').toEqual(
        [...times(byDefault)].sort((x, y) => y - x),
      );
      expect(times(oldest), 'ANN-028 oldest first').toEqual(
        [...times(oldest)].sort((x, y) => x - y),
      );
    },
  );
});

// ---------- AC2 and AC3: required fields, limits and attachments (the server's own checks) ----------

test.describe('AC2, AC3 Validation by the server', () => {
  test(
    'ANN-032 to ANN-036: Verify that the server rejects a missing or blank title or description, and Selected drivers with no driver',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const body = (fields) => ann.announcementBody(request, owner, fields);
      const cases = {
        'ANN-032 no title': [{ title: '' }, /Title is required/],
        'ANN-033 no description': [
          { description: '' },
          /Description is required/,
        ],
        'ANN-034 neither': [{ title: '', description: '' }, /is required/],
        'ANN-035 title of spaces': [{ title: '   ' }, /Title is required/],
        'ANN-035 description of spaces': [
          { description: '  \n  ' },
          /Description is required/,
        ],
        'ANN-036 no driver selected': [
          { user_ids: [] },
          /at least one driver/i,
        ],
      };
      for (const [name, [fields, message]] of Object.entries(cases)) {
        await test.step(name, async () => {
          const response = await ann.api.create(
            request,
            owner,
            await body(fields),
          );
          const data = (await ann.bodyOf(response)).data;
          if (data?.announcement_id) created.push(data.announcement_id);
          await expectRejected(response, 400, message);
        });
      }
    },
  );

  test(
    'ANN-040, ANN-044: Verify that a title of exactly 100 and a description of exactly 10,000 characters are accepted in full',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const title = 'T'.repeat(87) + Date.now(); // 100
      const description = 'D'.repeat(10000);
      const { id } = await send(request, owner, { title, description });
      const data = await ann.overview(request, owner, id);
      expect({
        title: data.title.length,
        description: data.description.length,
      }).toEqual({ title: 100, description: 10000 });
    },
  );

  test(
    'ANN-045: Verify that the server rejects a description of 10,001 characters',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const response = await ann.api.create(
        request,
        owner,
        await ann.announcementBody(request, owner, {
          description: 'D'.repeat(10001),
        }),
      );
      const data = (await ann.bodyOf(response)).data;
      if (data?.announcement_id) created.push(data.announcement_id);
      await expectRejected(response, 400, /10000 characters/);
    },
  );

  test(
    'ANN-041: Verify that the server rejects a title of 101 characters (BUG-API-032)',
    bugTags,
    async ({ request }) => {
      const owner = await ann.login();
      const response = await ann.api.create(
        request,
        owner,
        await ann.announcementBody(request, owner, {
          title: 'T'.repeat(88) + Date.now(),
        }),
      );
      const data = (await ann.bodyOf(response)).data;
      if (data?.announcement_id) created.push(data.announcement_id);
      expect(
        response.status(),
        'a 101-character title is sent: ' + JSON.stringify(data),
      ).toBe(400);
    },
  );

  test(
    'ANN-047, ANN-048: Verify that line breaks, paragraphs and bullets of the description are kept exactly',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const description =
        'First paragraph\nsecond line\n\n- bullet one\n- bullet two\n\n1. first\n2. second';
      const { id } = await send(request, owner, { description });
      expect((await ann.overview(request, owner, id)).description).toBe(
        description,
      );
    },
  );

  test(
    'ANN-051, ANN-052: Verify that an announcement can be sent without attachments, and with one file of each supported format',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const none = await send(request, owner);
      expect((await ann.overview(request, owner, none.id)).attachments).toEqual(
        [],
      );
      const uploaded = [];
      for (const f of Object.values(files))
        uploaded.push(await ann.upload(request, owner, f));
      const { id } = await send(request, owner, {
        attachment_ids: uploaded.map((a) => a.attachment_id),
      });
      const names = (await ann.overview(request, owner, id)).attachments
        .map((a) => a.file_name)
        .sort();
      expect(names).toEqual(
        Object.values(files)
          .map((f) => f.name)
          .sort(),
      );
    },
  );

  test(
    'ANN-054, ANN-055: Verify that unsupported files (.txt, .gif, .mp4, .exe, an .exe renamed to .pdf) are rejected with a clear message',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const bad = [
        file('qa-sample.txt', 'text/plain'),
        file('qa-sample.gif', 'image/gif'),
        file('qa-sample.mp4', 'video/mp4'),
        file('qa-sample.exe', 'application/x-msdownload'),
        file('qa-exe-renamed.pdf', 'application/pdf'),
      ];
      for (const f of bad) {
        await test.step(f.name, async () => {
          await expectRejected(
            await ann.api.upload(request, owner, f),
            400,
            new RegExp(f.name + ' is not a supported file type'),
          );
        });
      }
    },
  );

  test(
    'ANN-056: Verify that a corrupt PDF is rejected (BUG-API-034)',
    bugTags,
    async ({ request }) => {
      const owner = await ann.login();
      const response = await ann.api.upload(
        request,
        owner,
        file('qa-corrupt.pdf', 'application/pdf'),
      );
      expect(
        response.status(),
        'a broken PDF is accepted: ' + (await response.text()).slice(0, 200),
      ).toBe(400);
    },
  );

  test(
    'ANN-054: Verify that a file larger than 10 MB is rejected, as the create page says (BUG-API-033)',
    bugTags,
    async ({ request }) => {
      const owner = await ann.login();
      const big = {
        name: 'qa-11mb.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.concat([
          files.pdf.buffer,
          Buffer.alloc(11 * 1024 * 1024, 32),
        ]),
      };
      const response = await ann.api.upload(request, owner, big);
      expect(
        response.status(),
        'an 11 MB file is accepted: ' + (await response.text()).slice(0, 200),
      ).toBe(400);
    },
  );

  test(
    'ANN-057, ANN-058: Verify that a removed attachment is not in the sent announcement, and the others stay',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const [a, b, c] = [
        await ann.upload(request, owner, files.pdf),
        await ann.upload(request, owner, files.png),
        await ann.upload(request, owner, files.xlsx),
      ];
      // b was removed before sending: the app sends only the ids of the files still in the list
      const { id } = await send(request, owner, {
        attachment_ids: [a.attachment_id, c.attachment_id],
      });
      const names = (await ann.overview(request, owner, id)).attachments
        .map((x) => x.file_name)
        .sort();
      expect(names).toEqual([a.file_name, c.file_name].sort());
      expect(names).not.toContain(b.file_name);
    },
  );
});

// ---------- AC4: recipients ----------

test.describe('AC4 Recipients', () => {
  test(
    'ANN-061, ANN-076, ANN-101: Verify that a Selected drivers announcement goes only to the chosen driver, new drivers do not get it, and the answer says "sent to 1 driver"',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const driver = await ann.findTestDriver(request, owner);
      const response = await ann.api.create(
        request,
        owner,
        await ann.announcementBody(request, owner),
      );
      const answer = await ann.bodyOf(response);
      created.push(answer.data.announcement_id);
      const data = await ann.overview(
        request,
        owner,
        answer.data.announcement_id,
      );
      const recipients = (
        await ann.activity(request, owner, answer.data.announcement_id)
      ).drivers.map((d) => d.name);
      expect({
        message: answer.message,
        sent_to: answer.data.sent_to,
        audience: data.audience,
        recipients,
      }).toEqual({
        message: 'Announcement sent to 1 driver',
        sent_to: 1,
        audience: {
          type: 'selected',
          recipients: 1,
          includes_new_drivers: false,
        },
        recipients: [driver.name],
      });
    },
  );

  test(
    'ANN-064: Verify that a driver of another station cannot be a recipient',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const otherStation = await loginAs(
        'ANN_OWNER',
        process.env.ANN_OWNER_EMAIL,
        process.env.ANN_OWNER_PASSWORD,
        process.env.CHAT_STATION_ID,
      );
      const users = await ann.dataOf(
        await request.get('/lmd/prfsrv/perf-user/v3/users', {
          headers: {
            'x-access-token': otherStation.token,
            'x-access-user': otherStation.account_id,
          },
        }),
        'users of the other station',
      );
      const stranger = users.find(
        (u) =>
          u.role === 'driver' &&
          !u.is_deleted &&
          u.stations.every(
            (s) => String(s.station_id) !== process.env.ANN_STATION_ID,
          ),
      );
      test.skip(!stranger, 'no driver who is only on the other station');
      const response = await ann.api.create(
        request,
        owner,
        await ann.announcementBody(request, owner, {
          user_ids: [String(stranger.id)],
        }),
      );
      const data = (await ann.bodyOf(response)).data;
      if (data?.announcement_id) created.push(data.announcement_id);
      await expectRejected(response, 400, /no drivers to send/);
    },
  );
});

// ---------- AC5: comment and acknowledgement settings ----------

test.describe('AC5 Comments and acknowledgement', () => {
  test(
    'ANN-080: Verify that an admin can post a comment in "Everyone can comment and reply" mode',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id } = await send(request, owner, { comment_mode: 'everyone' });
      const comment = await ann.addComment(
        request,
        owner,
        id,
        'QA admin comment',
      );
      const threads = (await ann.overview(request, owner, id)).comments.threads;
      expect(threads.map((t) => t.comment_id)).toEqual([comment.comment_id]);
    },
  );

  test(
    'ANN-084: Verify that an admin cannot start a new comment in "Drivers comment, admins reply" mode',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id } = await send(request, owner, {
        comment_mode: 'driver_owner_admin_reply',
      });
      const response = await ann.api.addComment(
        request,
        owner,
        id,
        'QA admin comment',
      );
      expect(
        response.status(),
        (await response.text()).slice(0, 200),
      ).toBeGreaterThanOrEqual(400);
    },
  );

  test(
    'ANN-086: Verify that no comment or reply can be added when comments are Off',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id } = await send(request, owner, { comment_mode: 'off' });
      await expectRejected(
        await ann.api.addComment(request, owner, id, 'QA comment'),
        400,
        /Comments are off/,
      );
    },
  );

  test(
    'ANN-090, ANN-111, ANN-148: Verify that no acknowledgement count, progress or status is given when acknowledgement is Off',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id } = await send(request, owner, {
        acknowledgement_enabled: false,
      });
      const data = await ann.overview(request, owner, id);
      const act = await ann.activity(request, owner, id);
      expect({
        settings: data.settings.acknowledgement_enabled,
        activity: act.acknowledgement_enabled,
        // sent to, seen and not seen are still given
        delivery: {
          sent_to: data.delivery.sent_to,
          seen: data.delivery.seen,
          not_seen: data.delivery.not_seen,
        },
      }).toEqual({
        settings: false,
        activity: false,
        delivery: { sent_to: 1, seen: 0, not_seen: 1 },
      });
    },
  );
});

// ---------- AC6: send ----------

test.describe('AC6 Send', () => {
  test(
    'ANN-104: Verify that sending twice with the same request (double click) creates only one announcement',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const body = await ann.announcementBody(request, owner);
      const [first, second] = await Promise.all([
        ann.api.create(request, owner, body),
        ann.api.create(request, owner, body),
      ]);
      const a = (await ann.bodyOf(first)).data;
      const b = (await ann.bodyOf(second)).data;
      created.push(a.announcement_id, b.announcement_id);
      const found = (
        await allAnnouncements(request, owner, { search: body.title })
      ).all;
      expect({
        sameId: a.announcement_id === b.announcement_id,
        listed: found.length,
      }).toEqual({ sameId: true, listed: 1 });
    },
  );
});

// ---------- AC7: details ----------

test.describe('AC7 Details', () => {
  test(
    'ANN-106, ANN-108, ANN-110, ANN-112, ANN-113: Verify the details of a new announcement: title, audience, settings, creator, date, delivery, tabs, not edited',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner, {
        comment_mode: 'everyone',
        acknowledgement_enabled: true,
      });
      const data = await ann.overview(request, owner, id);
      expect(data).toMatchObject({
        title: body.title,
        description: body.description,
        audience: { type: 'selected', recipients: 1 },
        settings: { comment_mode: 'everyone', acknowledgement_enabled: true },
        created_by: { name: 'Arth' },
        is_edited: false,
        last_edited_at: null,
        delivery: { sent_to: 1, seen: 0, not_seen: 1, acknowledged: 0 },
        tabs: { activity_count: 1, history_count: 1 },
      });
      expect(Date.now() - Date.parse(data.published_at)).toBeLessThan(
        10 * 60 * 1000,
      );
    },
  );

  test(
    'ANN-109: Verify that each attachment downloads and matches the uploaded file',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const uploaded = [
        await ann.upload(request, owner, files.pdf),
        await ann.upload(request, owner, files.jpg),
      ];
      const { id } = await send(request, owner, {
        attachment_ids: uploaded.map((a) => a.attachment_id),
      });
      for (const [i, f] of [files.pdf, files.jpg].entries()) {
        const response = await ann.api.download(
          request,
          owner,
          id,
          uploaded[i].attachment_id,
        );
        expect(response.status(), f.name).toBe(200);
        expect(
          Buffer.compare(await response.body(), f.buffer),
          f.name + ' is the same file',
        ).toBe(0);
      }
    },
  );
});

// ---------- AC8: comments ----------

test.describe('AC8 Comments', () => {
  test(
    'ANN-118, ANN-119, ANN-120: Verify that replies are shown under their comment, and a reply to a reply tags the person replied to',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id } = await send(request, owner);
      const parent = await ann.addComment(request, adminB, id, 'QA parent');
      const reply = await ann.addComment(
        request,
        owner,
        id,
        'QA reply',
        parent.comment_id,
      );
      const replyToReply = await ann.addComment(
        request,
        adminB,
        id,
        'QA reply to reply',
        reply.comment_id,
      );
      const [thread] = (await ann.overview(request, owner, id)).comments
        .threads;
      expect({
        parent: thread.comment_id,
        replies: thread.replies.map((r) => [r.comment_id, r.parent_id]),
        tagged: replyToReply.tagged?.name,
      }).toEqual({
        parent: parent.comment_id,
        replies: [
          [reply.comment_id, parent.comment_id],
          [replyToReply.comment_id, parent.comment_id],
        ],
        tagged: 'Arth',
      });
    },
  );

  test(
    'ANN-121, ANN-122: Verify that unread comments are marked as new with a count of 2, and are cleared after reading',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id } = await send(request, owner);
      await ann.addComment(request, adminB, id, 'QA one');
      await ann.addComment(request, adminB, id, 'QA two');
      const first = (await ann.overview(request, owner, id)).comments;
      const second = (await ann.overview(request, owner, id)).comments;
      expect({
        new: [first.unread_count, first.threads.map((t) => t.is_new)],
        afterReading: [
          second.unread_count,
          second.threads.map((t) => t.is_new),
        ],
      }).toEqual({ new: [2, [true, true]], afterReading: [0, [false, false]] });
    },
  );

  test(
    'ANN-126: Verify that existing comments are kept when comments are turned Off (and back on)',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const comment = await ann.addComment(request, owner, id, 'QA kept');
      await ann.dataOf(
        await ann.api.update(request, owner, id, {
          ...body,
          comment_mode: 'off',
        }),
        'Comments off',
      );
      const off = await ann.overview(request, owner, id);
      await ann.dataOf(
        await ann.api.update(request, owner, id, {
          ...body,
          comment_mode: 'everyone',
        }),
        'Comments on',
      );
      const on = await ann.overview(request, owner, id);
      expect({
        off: off.settings.comment_mode,
        kept: on.comments.threads.map((t) => t.comment_id),
      }).toEqual({
        off: 'off',
        kept: [comment.comment_id],
      });
    },
  );

  test(
    'ANN-130, ANN-131, ANN-157: Verify deleting one reply keeps the comment; deleting the comment removes it with its replies and History records it',
    tags,
    async ({ request }) => {
      // Only the author deletes a comment: the owner deletes their reply, Admin B their comment (with the replies)
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id } = await send(request, owner);
      const parent = await ann.addComment(
        request,
        adminB,
        id,
        'QA parent to delete',
      );
      const r1 = await ann.addComment(
        request,
        owner,
        id,
        'QA reply 1',
        parent.comment_id,
      );
      const r2 = await ann.addComment(
        request,
        owner,
        id,
        'QA reply 2',
        parent.comment_id,
      );
      const r3 = await ann.addComment(
        request,
        owner,
        id,
        'QA reply 3',
        parent.comment_id,
      );
      const one = await ann.dataOf(
        await ann.api.deleteComment(request, owner, id, r1.comment_id),
        'Delete one reply',
      );
      const afterOne = (await ann.overview(request, owner, id)).comments
        .threads;
      const all = await ann.dataOf(
        await ann.api.deleteComment(request, adminB, id, parent.comment_id),
        'Delete the comment',
      );
      const afterAll = (await ann.overview(request, owner, id)).comments;
      const entry = (await ann.history(request, owner, id)).history.find(
        (h) =>
          h.action === 'comment_deleted' &&
          h.comment.comment_id === parent.comment_id,
      );
      expect({
        'ANN-131 one reply': [
          one.is_reply,
          afterOne[0].replies.map((r) => r.comment_id),
        ],
        'ANN-130 comment and replies': [
          all.replies_removed,
          afterAll.threads.length,
        ],
        'ANN-157 history': [
          entry?.changed_by.name,
          entry?.comment.text,
          entry?.comment.replies_removed,
        ],
      }).toEqual({
        'ANN-131 one reply': [true, [r2.comment_id, r3.comment_id]],
        'ANN-130 comment and replies': [2, 0],
        'ANN-157 history': ['gyani', 'QA parent to delete', 2],
      });
    },
  );

  test(
    "ANN-134: Verify that a user cannot delete a comment of another user (an admin cannot delete the owner's comment)",
    tags,
    async ({ request }) => {
      // Only the author deletes a comment (rule changed 2026-11-12: before, any admin deleted any comment)
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id } = await send(request, owner);
      const comment = await ann.addComment(
        request,
        owner,
        id,
        'QA owner comment',
      );
      const [thread] = (await ann.overview(request, adminB, id)).comments
        .threads;
      const response = await ann.api.deleteComment(
        request,
        adminB,
        id,
        comment.comment_id,
      );
      expect({
        'author can_delete': comment.can_delete,
        'other admin can_delete': thread.can_delete,
        'other admin deletes': [
          response.status(),
          (await ann.bodyOf(response)).message,
        ],
        'still there': (await ann.overview(request, owner, id)).comments.count,
      }).toEqual({
        'author can_delete': true,
        'other admin can_delete': false,
        'other admin deletes': [403, expect.stringMatching(/Only the author/)],
        'still there': 1,
      });
    },
  );
});

// ---------- AC9: activity ----------

test.describe('AC9 Activity', () => {
  test(
    'ANN-135, ANN-140 to ANN-147: Verify the activity counts, statuses, filters and search; admins are not listed',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const driver = await ann.findTestDriver(request, owner);
      const { id } = await send(request, owner, {
        acknowledgement_enabled: true,
      });
      await ann.addComment(request, adminB, id, 'QA admin activity'); // an admin's comment does not make them a recipient
      const names = async (query) =>
        (await ann.activity(request, owner, id, query)).drivers.map(
          (d) => d.name,
        );
      const all = await ann.activity(request, owner, id);
      expect({
        'ANN-135 counts': all.summary,
        'ANN-140 status': all.drivers.map((d) => d.acknowledgement_status),
        'ANN-141 all': await names({ filter: 'all' }),
        'ANN-142 acknowledged': await names({ filter: 'acknowledged' }),
        'ANN-143 not acknowledged': await names({ filter: 'not_acknowledged' }),
        'ANN-144 not seen': await names({ filter: 'not_seen' }),
        'ANN-145 search': await names({
          search: driver.name.split(' ')[0].toLowerCase(),
        }),
        'ANN-146 no match': await names({ search: 'zz-nobody' }),
      }).toEqual({
        'ANN-135 counts': {
          sent_to: 1,
          seen: 0,
          seen_percent: 0,
          acknowledged: 0,
          acknowledged_percent: 0,
          not_seen: 1,
        },
        'ANN-140 status': ['not_seen'],
        'ANN-141 all': [driver.name],
        'ANN-142 acknowledged': [],
        'ANN-143 not acknowledged': [driver.name],
        'ANN-144 not seen': [driver.name],
        'ANN-145 search': [driver.name],
        'ANN-146 no match': [],
      });
      expect(
        all.drivers.map((d) => d.name),
        'ANN-147 admins are not listed',
      ).not.toContain('gyani');
    },
  );
});

// ---------- AC10 and AC11: edit and history ----------

test.describe('AC10, AC11 Edit and History', () => {
  test(
    'ANN-149 to ANN-153, ANN-160, ANN-163, ANN-164, ANN-166, ANN-167, ANN-183, ANN-187: Verify that one save changes the title, description, attachments and settings, shows Edited, and History records every change',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const oldFile = await ann.upload(request, owner, files.pdf);
      const { id, body } = await send(request, owner, {
        attachment_ids: [oldFile.attachment_id],
        comment_mode: 'everyone',
        acknowledgement_enabled: false,
      });
      const newFile = await ann.upload(request, owner, files.png);
      const edit = {
        ...body,
        title: body.title + ' edited',
        description: 'QA edited description',
        attachment_ids: [newFile.attachment_id],
        comment_mode: 'off',
        acknowledgement_enabled: true,
      };
      const saved = await ann.dataOf(
        await ann.api.update(request, owner, id, edit),
        'Saving the edit',
      );
      const data = await ann.overview(request, owner, id);
      const [latest, first] = (await ann.history(request, owner, id)).history;
      expect({
        'ANN-163 title/description': [data.title, data.description],
        'ANN-164 attachments': data.attachments.map((a) => a.file_name),
        'ANN-166, ANN-167 settings': data.settings,
        'ANN-183 edited': [
          data.is_edited,
          data.last_edited_by?.name,
          Math.abs(
            Date.parse(data.last_edited_at) - Date.parse(saved.edited_at),
          ),
        ],
      }).toEqual({
        'ANN-163 title/description': [edit.title, edit.description],
        'ANN-164 attachments': [newFile.file_name],
        'ANN-166, ANN-167 settings': {
          comment_mode: 'off',
          acknowledgement_enabled: true,
        },
        'ANN-183 edited': [true, 'Arth', 0],
      });
      expect({
        action: latest.action,
        by: latest.changed_by.name,
        changes: latest.changes,
      }).toEqual({
        action: 'edited',
        by: 'Arth',
        changes: {
          title: { before: body.title, after: edit.title },
          description: { before: body.description, after: edit.description },
          attachments: {
            added: [expect.objectContaining({ file_name: newFile.file_name })],
            removed: [
              expect.objectContaining({ file_name: oldFile.file_name }),
            ],
          },
          comment_mode: { before: 'everyone', after: 'off' },
          acknowledgement_enabled: expect.anything(),
        },
      });
      expect(
        first.action,
        'ANN-149 newest first: the "created" entry is last',
      ).toBe('created');
      expect(Date.parse(latest.created_at)).toBeGreaterThan(
        Date.parse(first.created_at),
      );
    },
  );

  test(
    'ANN-159: Verify that History has only created, edited and comment-deleted entries (no comment edits)',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const c = await ann.addComment(request, owner, id, 'QA comment');
      await ann.api.deleteComment(request, owner, id, c.comment_id);
      await ann.api.update(request, owner, id, {
        ...body,
        title: body.title + ' edited',
      });
      const actions = (await ann.history(request, owner, id)).history.map(
        (h) => h.action,
      );
      expect(actions).toEqual(['edited', 'comment_deleted', 'created']);
    },
  );

  test(
    'ANN-162: Verify that an admin who did not create the announcement cannot save an edit',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id, body } = await send(request, owner);
      await expectRejected(
        await ann.api.update(request, adminB, id, {
          ...body,
          title: 'edited by Admin B',
        }),
        403,
        /Only the admin who created/,
      );
      expect((await ann.overview(request, owner, id)).title).toBe(body.title);
    },
  );

  test(
    'ANN-168, ANN-169, ANN-170, ANN-171: Verify that Edit has the same checks: blank title or description, too long description, no driver, unknown attachment',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const cases = {
        'ANN-168 blank title': [{ title: '  ' }, /Title is required/],
        'ANN-168 blank description': [
          { description: '' },
          /Description is required/,
        ],
        'ANN-169 description 10,001': [
          { description: 'D'.repeat(10001) },
          /10000 characters/,
        ],
        'ANN-170 no driver': [{ user_ids: [] }, /at least one driver/i],
        'ANN-171 unknown attachment': [
          { attachment_ids: ['000000000000000000000000'] },
          /attachment/i,
        ],
      };
      for (const [name, [fields, message]] of Object.entries(cases)) {
        await test.step(name, async () => {
          await expectRejected(
            await ann.api.update(request, owner, id, { ...body, ...fields }),
            400,
            message,
          );
        });
      }
      const data = await ann.overview(request, owner, id);
      expect({ title: data.title, is_edited: data.is_edited }).toEqual({
        title: body.title,
        is_edited: false,
      });
    },
  );

  test(
    'ANN-169: Verify that Edit rejects a title of 101 characters (BUG-API-032)',
    bugTags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const response = await ann.api.update(request, owner, id, {
        ...body,
        title: 'T'.repeat(101),
      });
      expect(response.status(), 'a 101-character title is saved').toBe(400);
    },
  );

  test(
    'ANN-182, ANN-185: Verify that saving twice with the same request saves once, and editing does not create a new announcement',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const total = (await allAnnouncements(request, owner)).total;
      const edit = { ...body, title: body.title + ' edited' };
      const requestId = crypto.randomUUID();
      await Promise.all([
        ann.api.update(request, owner, id, edit, requestId),
        ann.api.update(request, owner, id, edit, requestId),
      ]);
      const edits = (await ann.history(request, owner, id)).history.filter(
        (h) => h.action === 'edited',
      );
      expect({
        edits: edits.length,
        total: (await allAnnouncements(request, owner)).total,
      }).toEqual({ edits: 1, total });
    },
  );

  test(
    'ANN-186: Verify that editing keeps the comments and the delivery data',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      const c = await ann.addComment(request, owner, id, 'QA kept after edit');
      const before = await ann.overview(request, owner, id);
      await ann.dataOf(
        await ann.api.update(request, owner, id, {
          ...body,
          title: body.title + ' edited',
        }),
        'Saving the edit',
      );
      const after = await ann.overview(request, owner, id);
      expect({
        comments: after.comments.threads.map((t) => t.comment_id),
        delivery: after.delivery,
      }).toEqual({
        comments: [c.comment_id],
        delivery: before.delivery,
      });
    },
  );
});

// ---------- AC12: delete ----------

test.describe('AC12 Delete', () => {
  test(
    'ANN-192, ANN-194, ANN-195, ANN-197: Verify that only the creator can delete (another admin gets 403); the announcement is gone from the listing and details; a second delete does no harm',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const adminB = await ann.login('ADMIN_B');
      const { id, body } = await send(request, owner);
      const other = await ann.api.remove(request, adminB, id);
      const otherBody = await ann.bodyOf(other);
      const first = await ann.api.remove(request, owner, id);
      const firstBody = await ann.bodyOf(first);
      const second = await ann.api.remove(request, owner, id);
      expect({
        'ANN-192 another admin deletes': [other.status(), otherBody.message],
        'ANN-195 the creator deletes': [first.status(), firstBody.message],
        'ANN-197 second delete': [
          second.status(),
          (await ann.bodyOf(second)).data?.is_duplicate,
        ],
        'ANN-194 details': (
          await ann.api.overview(request, owner, id)
        ).status(),
        'ANN-194 listing':
          (await findCard(request, owner, id, body.title)) ?? null,
      }).toEqual({
        'ANN-192 another admin deletes': [
          403,
          expect.stringMatching(/Only the admin who created .* delete/),
        ],
        'ANN-195 the creator deletes': [
          200,
          'Announcement deleted, it is no longer visible to drivers',
        ],
        'ANN-197 second delete': [200, true],
        'ANN-194 details': 404,
        'ANN-194 listing': null,
      });
    },
  );

  test(
    'ANN-199: Verify that an edit cannot be saved after the announcement was deleted (e.g. from another tab)',
    tags,
    async ({ request }) => {
      // Only the creator deletes now, so the creator deletes it (another tab) and then saves the open edit
      const owner = await ann.login();
      const { id, body } = await send(request, owner);
      await ann.dataOf(
        await ann.api.remove(request, owner, id),
        'The creator deletes',
      );
      await expectRejected(
        await ann.api.update(request, owner, id, {
          ...body,
          title: 'after delete',
        }),
        404,
        /not found/,
      );
      expect(
        await findCard(request, owner, id, body.title),
        'not restored',
      ).toBeUndefined();
    },
  );
});
