const { test, expect } = require('@playwright/test');
const ann = require('../../../api/announcements');

// Announcements by role (story "Announcements", AC1, AC2, AC5, AC7, AC8, AC11, AC12; sheet cases in the titles).
// The main file (announcements.spec.js) always creates as the owner. This file checks the other roles of the
// station ANN_STATION_ID (DYY6 on staging):
//   - ADMIN_B (gyani): an admin who is not the owner, as the creator of an announcement
//   - PROMOTED_ADMIN (koala11): a driver promoted to admin ("Promote As An Admin"), as a user who did not create
// Rules: Owners/Admins (also promoted admins) create; only the creating admin edits and deletes (also not the
// owner; changed 2026-11-12: before, any admin deleted); only the author of a comment deletes it; in "Drivers
// comment, admins reply" admins can only reply.
// Every announcement goes only to ANN_DRIVER_NAME (Chad Elnahal): @adds-data. ann.cleanUp deletes them after each
// test as their creator.
test.skip(!process.env.ANN_STATION_ID, 'ANN_* not set in .env');

const tags = { tag: ['@regression', '@adds-data'] };

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

const findCard = async (request, user, id, title) =>
  (
    await ann.dataOf(
      await ann.api.list(request, user, { search: title, limit: 50 }),
      'Listing announcements',
    )
  ).announcements.find((a) => a.announcement_id === id);

// The status and the message of an answer, checked together so the report shows both
async function answer(response) {
  const body = await ann.bodyOf(response);
  return { status: response.status(), message: body.message ?? body.error };
}

// ---------- An admin who is not the owner creates (gyani) ----------

test.describe('Admin (not the owner) as creator', () => {
  test.skip(!process.env.ADMIN_B_EMAIL, 'ADMIN_B_* not set in .env');

  test(
    'ROLE-01 (ANN-001, ANN-009, ANN-097): Verify that an admin who is not the owner can send an announcement, and every admin sees them as its creator',
    tags,
    async ({ request }) => {
      const adminB = await ann.login('ADMIN_B');
      const owner = await ann.login();
      const { id, body, sent_to } = await send(request, adminB);
      const card = await findCard(request, owner, id, body.title);
      const data = await ann.overview(request, owner, id);
      expect({
        sent_to,
        'owner sees the card': card?.title,
        creator: [data.created_by.name, data.created_by.role],
      }).toEqual({
        sent_to: 1,
        'owner sees the card': body.title,
        creator: ['gyani', 'admin'],
      });
    },
  );

  test(
    'ROLE-02 (ANN-022, ANN-023, ANN-160, ANN-162, ANN-192): Verify that only the creating admin may edit and delete: the owner and the promoted admin get 403 on save and on delete',
    tags,
    async ({ request }) => {
      const adminB = await ann.login('ADMIN_B');
      const owner = await ann.login();
      const { id, body } = await send(request, adminB);
      const flags = async (user) => {
        const data = await ann.overview(request, user, id);
        return [data.can_edit, data.can_delete];
      };
      const others = { owner };
      if (process.env.PROMOTED_ADMIN_EMAIL) {
        others.promoted = await ann.login('PROMOTED_ADMIN');
      }
      const refused = {};
      for (const [who, user] of Object.entries(others)) {
        refused[who] = {
          save: await answer(
            await ann.api.update(request, user, id, {
              ...body,
              title: body.title + ' by ' + who,
            }),
          ),
          delete: await answer(await ann.api.remove(request, user, id)),
        };
      }
      const saved = await answer(
        await ann.api.update(request, adminB, id, {
          ...body,
          title: body.title + ' edited',
        }),
      );
      const [latest] = (await ann.history(request, owner, id)).history;
      const notCreator = {
        save: {
          status: 403,
          message: expect.stringMatching(/Only the admin who created/),
        },
        delete: {
          status: 403,
          message: expect.stringMatching(
            /Only the admin who created .* delete/,
          ),
        },
      };
      expect({
        'creator [can_edit, can_delete]': await flags(adminB),
        'owner [can_edit, can_delete]': await flags(owner),
        refused,
        'creator saves': saved.status,
        history: [latest.action, latest.changed_by.name],
      }).toEqual({
        'creator [can_edit, can_delete]': [true, true],
        'owner [can_edit, can_delete]': [false, false],
        refused: Object.fromEntries(
          Object.keys(others).map((who) => [who, notCreator]),
        ),
        'creator saves': 200,
        history: ['edited', 'gyani'],
      });
    },
  );

  test(
    'ROLE-03 (ANN-191, ANN-194): Verify that the creating admin can delete their own announcement, and it is gone',
    tags,
    async ({ request }) => {
      const adminB = await ann.login('ADMIN_B');
      const { id } = await send(request, adminB);
      const deleted = await answer(await ann.api.remove(request, adminB, id));
      const after = await ann.api.overview(request, adminB, id);
      expect({ deleted, after: after.status() }).toEqual({
        deleted: {
          status: 200,
          message: expect.stringMatching(/deleted/i),
        },
        after: 404,
      });
    },
  );

  test(
    'ROLE-04 (ANN-080, ANN-084): Verify the comment rules for an admin creator: a comment in "Everyone" mode; no new comment in "Drivers comment, admins reply"',
    tags,
    async ({ request }) => {
      const adminB = await ann.login('ADMIN_B');
      const everyone = await send(request, adminB, {
        comment_mode: 'everyone',
      });
      const replyOnly = await send(request, adminB, {
        comment_mode: 'driver_owner_admin_reply',
      });
      const posted = await answer(
        await ann.api.addComment(request, adminB, everyone.id, 'QA comment'),
      );
      const refused = await answer(
        await ann.api.addComment(request, adminB, replyOnly.id, 'QA comment'),
      );
      expect({ posted, refused }).toEqual({
        posted: { status: 200, message: 'Comment posted' },
        refused: {
          status: 403,
          message: expect.stringMatching(/you can only reply/),
        },
      });
    },
  );
});

// ---------- A promoted admin (koala11) ----------

test.describe('Promoted admin', () => {
  test.skip(!process.env.PROMOTED_ADMIN_EMAIL, 'PROMOTED_ADMIN_* not set');

  test(
    "ROLE-05 (ANN-001, ANN-106, ANN-135, ANN-149): Verify that a promoted admin sees the station's announcements, their details, activity and history",
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id, body } = await send(request, owner);
      const card = await findCard(request, promoted, id, body.title);
      const statuses = {
        overview: (await ann.api.overview(request, promoted, id)).status(),
        activity: (await ann.api.activity(request, promoted, id)).status(),
        history: (await ann.api.history(request, promoted, id)).status(),
      };
      expect({ card: card?.title, ...statuses }).toEqual({
        card: body.title,
        overview: 200,
        activity: 200,
        history: 200,
      });
    },
  );

  test(
    "ROLE-06 (ANN-023, ANN-115, ANN-162): Verify that a promoted admin has no Edit and no Delete on another admin's announcement (403 on save)",
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id, body } = await send(request, owner);
      const card = await findCard(request, promoted, id, body.title);
      const data = await ann.overview(request, promoted, id);
      const save = await answer(
        await ann.api.update(request, promoted, id, {
          ...body,
          title: body.title + ' by promoted',
        }),
      );
      expect({
        'card can_edit': card.can_edit,
        'details [can_edit, can_delete]': [data.can_edit, data.can_delete],
        save,
      }).toEqual({
        'card can_edit': false,
        'details [can_edit, can_delete]': [false, false],
        save: {
          status: 403,
          message: expect.stringMatching(/Only the admin who created/),
        },
      });
    },
  );

  test(
    "ROLE-07 (ANN-192): Verify that a promoted admin cannot delete another admin's announcement, and it stays (only the creator deletes)",
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner);
      const deleted = await answer(await ann.api.remove(request, promoted, id));
      expect({
        deleted,
        'owner opens it': (await ann.api.overview(request, owner, id)).status(),
      }).toEqual({
        deleted: {
          status: 403,
          message: expect.stringMatching(
            /Only the admin who created .* delete/,
          ),
        },
        'owner opens it': 200,
      });
    },
  );

  test(
    'ROLE-08 (ANN-080, ANN-118, ANN-019, ANN-121): Verify that a promoted admin can comment and reply in "Everyone" mode, and the owner sees both as new',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, { comment_mode: 'everyone' });
      const parent = await ann.addComment(request, owner, id, 'QA owner');
      const comment = await ann.addComment(
        request,
        promoted,
        id,
        'QA promoted',
      );
      const reply = await ann.addComment(
        request,
        promoted,
        id,
        'QA promoted reply',
        parent.comment_id,
      );
      const { comments } = await ann.overview(request, owner, id);
      const thread = (cid) =>
        comments.threads.find((t) => t.comment_id === cid);
      expect({
        'replies under the owner': thread(parent.comment_id).replies.map(
          (r) => r.comment_id,
        ),
        'own comment listed': !!thread(comment.comment_id),
        'new for the owner': comments.unread_count,
      }).toEqual({
        'replies under the owner': [reply.comment_id],
        'own comment listed': true,
        'new for the owner': 2,
      });
    },
  );

  test(
    'ROLE-09 (ANN-086): Verify that a promoted admin cannot comment when comments are Off',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, { comment_mode: 'off' });
      expect(
        await answer(
          await ann.api.addComment(request, promoted, id, 'QA comment'),
        ),
      ).toEqual({
        status: 400,
        message: expect.stringMatching(/Comments are off/),
      });
    },
  );

  test(
    'ROLE-10 (ANN-130, ANN-157): Verify that a promoted admin can delete their own comment, and History records it with their name',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, { comment_mode: 'everyone' });
      const comment = await ann.addComment(
        request,
        promoted,
        id,
        'QA promoted to delete',
      );
      const deleted = await answer(
        await ann.api.deleteComment(request, promoted, id, comment.comment_id),
      );
      const [latest] = (await ann.history(request, owner, id)).history;
      expect({
        deleted,
        history: [latest.action, latest.changed_by.name],
      }).toEqual({
        deleted: { status: 200, message: 'Comment deleted' },
        history: ['comment_deleted', 'koala'],
      });
    },
  );

  test(
    'ROLE-11 (AC1, AC2, BUG-API-045 fixed): Verify that a promoted admin can send an announcement',
    tags,
    async ({ request }) => {
      const promoted = await ann.login('PROMOTED_ADMIN');
      const body = await ann.announcementBody(request, promoted);
      const response = await ann.api.create(request, promoted, body);
      const result = await answer(response);
      if (response.status() === 200) {
        created.push((await ann.bodyOf(response)).data.announcement_id);
      }
      // BUG-API-045 (fixed 2026-11-12): was 400 "...created_by: Only owner or admin can create an announcement"
      expect(result).toEqual({
        status: 200,
        message: expect.stringMatching(/sent to 1 driver/),
      });
    },
  );

  test(
    'ROLE-12 (ANN-084, BUG-API-046 fixed): Verify that a promoted admin cannot start a new comment in "Drivers comment, admins reply" mode',
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, {
        comment_mode: 'driver_owner_admin_reply',
      });
      // BUG-API-046 (fixed 2026-11-12): was 200 "Comment posted"
      expect(
        await answer(
          await ann.api.addComment(request, promoted, id, 'QA comment'),
        ),
      ).toEqual({
        status: 403,
        message: expect.stringMatching(/you can only reply/),
      });
    },
  );

  test(
    "ROLE-13 (AC8, BUG-API-046 fixed): Verify that a promoted admin's comment is saved as an admin's comment, not a driver's",
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, { comment_mode: 'everyone' });
      const comment = await ann.addComment(
        request,
        promoted,
        id,
        'QA promoted',
      );
      // BUG-API-046 (fixed 2026-11-12): author.role was "driver"
      expect(comment.author.role).not.toBe('driver');
    },
  );

  test(
    "ROLE-14 (ANN-131, ANN-134): Verify that only the author deletes a comment: the promoted admin cannot delete the owner's comment, the owner cannot delete the promoted admin's",
    tags,
    async ({ request }) => {
      const owner = await ann.login();
      const promoted = await ann.login('PROMOTED_ADMIN');
      const { id } = await send(request, owner, { comment_mode: 'everyone' });
      const byOwner = await ann.addComment(request, owner, id, 'QA owner');
      const byPromoted = await ann.addComment(
        request,
        promoted,
        id,
        'QA promoted',
      );
      const notAuthor = {
        status: 403,
        message: expect.stringMatching(/Only the author can delete/),
      };
      const canDelete = async (user) =>
        Object.fromEntries(
          (await ann.overview(request, user, id)).comments.threads.map((t) => [
            t.author.name,
            t.can_delete,
          ]),
        );
      expect({
        'owner sees can_delete': await canDelete(owner),
        'promoted deletes the owner comment': await answer(
          await ann.api.deleteComment(
            request,
            promoted,
            id,
            byOwner.comment_id,
          ),
        ),
        'owner deletes the promoted comment': await answer(
          await ann.api.deleteComment(
            request,
            owner,
            id,
            byPromoted.comment_id,
          ),
        ),
        'comments left': (await ann.overview(request, owner, id)).comments
          .count,
      }).toEqual({
        'owner sees can_delete': {
          [byOwner.author.name]: true,
          [byPromoted.author.name]: false,
        },
        'promoted deletes the owner comment': notAuthor,
        'owner deletes the promoted comment': notAuthor,
        'comments left': 2,
      });
    },
  );
});
