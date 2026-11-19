const { test, expect } = require('@playwright/test');
const {
  api,
  login,
  ownerOf,
  newDriverDetails,
  addDriver,
  tryAdd,
  deactivate,
  cleanUp,
  conflictsOf,
  conflictWith,
  driversWithEmail,
  stationOf,
} = require('../../../api/rehire');
const rehire = require('../../../api/rehire');

// Sheet "Rehire & Super Admin Conflict Handling – Test Cases" (TC_001 to TC_143): the server side of the
// cases an admin can do. Company A = Brothers (station ABC), company B = earthhh (station TTT): two DSPs.
// Every test adds its own new drivers (yopmail, 555 phones) and makes them inactive at the end.
// Send Request and the Super Admin's actions: super-admin-actions.spec.js. Not here: bulk upload, sign-in
// control, promotion and registration (their APIs are not known yet). See docs/rehire-coverage.md.
//
// The calls and answers are the ones the web app sends and gets (seen on staging, 2026-11-05).

const tags = { tag: ['@rehire', '@adds-data'] };
// Fails on a known bug (docs/known-bugs/api-bugs.md); passes when it is fixed
const bugTags = { tag: ['@rehire', '@adds-data', '@knownbug'] };

test.skip(
  !process.env.REHIRE_A_EMAIL || !process.env.REHIRE_B_EMAIL,
  'REHIRE_A_* and REHIRE_B_* are not set in .env',
);

test.afterEach(async ({ request }) => {
  await cleanUp(request);
});

// A name about 90% like the given one: the last letter of the name twice ("Ravi Kumar" → "Ravi Kumarr")
const similarName = (name) => name + name.slice(-1);

// A refused Add Driver: 409, nothing saved
function expectRefused(result) {
  expect(result.status, result.body.message).toBe(409);
  expect(result.body.success).toBe(false);
}

// ---------- REQ-01: same company, same role → Rehire ----------

test.describe('REQ-01 Rehire (same company, same role)', () => {
  test(
    'TC_001: Verify that adding an inactive driver again with the same details is a rehire conflict, not a new driver',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      await deactivate(request, 'A', ravi);

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', {
          name: ravi.name,
          email: ravi.email,
          phone: ravi.phone,
          transporter_id: ravi.transporter_id,
        }),
      );

      expectRefused(result);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict, 'the existing driver is named').toBeTruthy();
      expect(conflict.conflict_type).toBe('same_company');
      expect(conflict.status).toBe('inactive');
      expect(conflict.role).toBe('driver');
      // No new driver: nobody with this email is active
      const withEmail = await driversWithEmail(request, 'A', ravi.email);
      expect(withEmail.filter((d) => d.status === 'active')).toHaveLength(0);
    },
  );

  test(
    'TC_009: Verify that adding an active driver again with the same details creates no duplicate',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', {
          name: ravi.name,
          email: ravi.email,
          phone: ravi.phone,
          transporter_id: ravi.transporter_id,
        }),
      );

      expectRefused(result);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict).toBeTruthy();
      expect(conflict.conflict_type).toBe('same_company');
      expect(conflict.status).toBe('active');
      // to confirm: the names in matched_on for phone and transporter ID
      expect(conflict.matched_on).toEqual(
        expect.arrayContaining(['email', 'phone']),
      );
      expect(await driversWithEmail(request, 'A', ravi.email)).toHaveLength(1);
    },
  );

  test(
    'TC_006: Verify that a driver with only the same email is a conflict on the email',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: ravi.email }),
      );

      expectRefused(result);
      expect(result.body.message).toBe('email address already exists');
      expect(conflictWith(result.body, ravi.id).matched_on).toEqual(['email']);
    },
  );

  test(
    'TC_007: Verify that a driver with only the same phone is a conflict on the phone',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { phone: ravi.phone }),
      );

      expectRefused(result);
      expect(result.body.message).toBe('phone number already exists');
      expect(conflictWith(result.body, ravi.id).matched_on).toEqual(['phone']);
    },
  );

  test(
    'TC_008: Verify that a driver with only the same transporter ID is a conflict on the transporter ID',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { transporter_id: ravi.transporter_id }),
      );

      expectRefused(result);
      expect(result.body.message).toBe('transporter id already exists');
      expect(conflictWith(result.body, ravi.id)).toBeTruthy();
    },
  );

  test(
    'TC_028: Verify that the conflict names the existing driver with their real details',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: ravi.email }),
      );

      expectRefused(result);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict.name).toBe(ravi.name);
      expect(conflict.email).toBe(ravi.email);
      expect(conflict.role).toBe('driver');
    },
  );

  test(
    'TC_002, TC_004: Verify that Reactivate & Resolve activates the existing driver (same record, no new driver)',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      await deactivate(request, 'A', ravi);

      // The rehire popup's "Reactivate & Resolve"
      const response = await api.reactivate(
        request,
        await login('A'),
        ravi.id,
        ravi,
      );

      expect(response.status()).toBe(201);
      expect((await response.json()).message).toBe('updated successfully');
      const withEmail = await driversWithEmail(request, 'A', ravi.email);
      expect(withEmail, 'one record').toHaveLength(1);
      // TC_004: the same record (same id), so its history stays linked
      expect(String(withEmail[0].id)).toBe(String(ravi.id));
      expect(withEmail[0].status).toBe('active');
    },
  );

  test(
    'TC_010: Verify that Reactivate & Resolve with a new transporter ID updates the existing driver',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      await deactivate(request, 'A', ravi);
      const newTid = newDriverDetails('A').transporter_id;

      const response = await api.reactivate(
        request,
        await login('A'),
        ravi.id,
        {
          ...ravi,
          transporter_id: newTid,
        },
      );

      expect(response.status()).toBe(201);
      const [now] = await driversWithEmail(request, 'A', ravi.email);
      expect(now.transporter_id).toBe(newTid);
      expect(now.status).toBe('active');
      // The old transporter ID is free again: a new driver may use it
      const reuse = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { transporter_id: ravi.transporter_id }),
      );
      expect(reuse.status, reuse.body.message).toBe(200);
    },
  );
});

// ---------- REQ-02: same company, similar name (fuzzy) ----------

test.describe('REQ-02 Similar names (same company)', () => {
  test(
    'TC_011: Verify that a similar name in the same company lists the similar driver',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { name: similarName(ravi.name) }),
      );

      expectRefused(result);
      expect(result.body.message).toBe('Similar drivers found');
      const ids = result.body.data.fuzzy_matches.map((d) => String(d.id));
      expect(ids).toContain(String(ravi.id));
    },
  );

  test(
    'TC_014: Verify that every similar driver is listed',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const raviToo = await addDriver(request, 'A', {
        name: similarName(ravi.name),
        conflict_resolved: true, // the web app's "Skip & Add Driver As New"
      });

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { name: similarName(raviToo.name) }),
      );

      expectRefused(result);
      const ids = result.body.data.fuzzy_matches.map((d) => String(d.id));
      expect(ids).toEqual(
        expect.arrayContaining([String(ravi.id), String(raviToo.id)]),
      );
    },
  );

  test(
    'TC_012: Verify that Update & Resolve on a similar driver updates that driver and adds no new one',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const typed = newDriverDetails('A', { name: similarName(ravi.name) });

      // The similar-names popup → pick ravi → Update & Resolve
      const response = await api.updateSimilar(
        request,
        await login('A'),
        ravi.id,
        typed,
      );

      expect(response.status()).toBe(201);
      const [now] = await driversWithEmail(request, 'A', typed.email);
      expect(String(now.id), 'the same record').toBe(String(ravi.id));
      expect(now.name).toBe(typed.name);
      expect(now.status).toBe('active');
      expect(await driversWithEmail(request, 'A', ravi.email)).toHaveLength(0);
    },
  );

  test(
    'TC_013: Verify that Skip & Add as New adds a new driver and leaves the similar one unchanged',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      // The web app's "Skip & Add Driver As New" sends conflict_resolved: true
      const added = await addDriver(request, 'A', {
        name: similarName(ravi.name),
        conflict_resolved: true,
      });

      expect(added.id).not.toBe(ravi.id);
      const [still] = await driversWithEmail(request, 'A', ravi.email);
      expect(still.name).toBe(ravi.name);
      expect(still.status).toBe('active');
    },
  );

  test(
    'TC_015: Verify that a name that is not similar is added directly',
    tags,
    async ({ request }) => {
      await addDriver(request, 'A');
      // A new random name: not like any driver of the company
      const different = await tryAdd(request, 'A', newDriverDetails('A'));
      expect(different.status, different.body.message).toBe(200);
    },
  );

  test(
    'TC_016: Verify that similar names are not checked across companies',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { name: similarName(ravi.name) }),
      );

      expect(result.status, result.body.message).toBe(200);
    },
  );

  test(
    'TC_019: Verify that the name comparison ignores upper/lower case and extra spaces',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const [first, last] = ravi.name.split(' ');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', {
          name: '  ' + first.toLowerCase() + '   ' + last.toUpperCase() + ' ',
        }),
      );

      expectRefused(result);
      expect(result.body.message).toBe('Similar drivers found');
      const ids = result.body.data.fuzzy_matches.map((d) => String(d.id));
      expect(ids).toContain(String(ravi.id));
    },
  );

  test(
    'TC_021: Verify that names with special or Hindi characters do not break the check',
    tags,
    async ({ request }) => {
      // 409 (similar to a driver of an earlier run) or 200: never a server error
      for (const name of [
        "Seamus O'Brien",
        "Seamus O'Briennn",
        'रवि कुमार',
        'Zoë Ånström-Łukasz',
      ]) {
        const result = await tryAdd(
          request,
          'A',
          newDriverDetails('A', { name }),
        );
        expect([200, 409], name + ': ' + result.body.message).toContain(
          result.status,
        );
      }
    },
  );
});

// ---------- REQ-03: same company, different role (admin/owner ↔ driver) ----------
// Admins ARE checked (409 "This user is already an admin in Station … share them as a driver …?"); owners
// are not (BUG-API-036)

// The conflict with an admin (a user, not a driver) of an answer
const adminConflict = (body) =>
  conflictsOf(body).find(
    (c) => c.conflicted_table === 'users' && c.role === 'admin',
  );
const ownerConflict = (body) =>
  conflictsOf(body).find((c) => c.role === 'owner' || c.user_type === 'owner');

test.describe('REQ-03 Same company, different role', () => {
  test(
    "TC_022, TC_028: Verify that an admin's email and phone cannot be added as a driver in the same company",
    tags,
    async ({ request }) => {
      const admin = await rehire.addAdmin(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: admin.email, phone: admin.phone }),
      );

      expectRefused(result);
      expect(result.body.message).toBe(
        'This user is already an admin in Station ' +
          stationOf('A') +
          '. Do you want to share them as a driver in this company as well?',
      );
      const conflict = adminConflict(result.body);
      expect(conflict.conflict_type).toBe('same_company');
      expect(conflict.matched_on).toEqual(
        expect.arrayContaining(['email', 'phone']),
      );
      // TC_028: the real details of the existing admin
      expect(conflict.name).toBe(admin.name);
      expect(conflict.email).toBe(admin.email);
    },
  );

  test(
    "TC_023, TC_089: Verify that the owner's email and phone cannot be added as a driver in the same company (BUG-API-036)",
    bugTags,
    async ({ request }) => {
      const owner = await ownerOf(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: owner.email, phone: owner.phone }),
      );

      expectRefused(result);
      expect(
        ownerConflict(result.body),
        'a conflict with the owner',
      ).toBeTruthy();
    },
  );

  test(
    "TC_029: Verify that only an admin's email is a conflict on the email only",
    tags,
    async ({ request }) => {
      const admin = await rehire.addAdmin(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: admin.email }),
      );

      expectRefused(result);
      expect(adminConflict(result.body)?.matched_on).toEqual(['email']);
    },
  );

  test(
    "TC_030: Verify that only an admin's phone is a conflict on the phone only",
    tags,
    async ({ request }) => {
      const admin = await rehire.addAdmin(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { phone: admin.phone }),
      );

      expectRefused(result);
      expect(adminConflict(result.body)?.matched_on).toEqual(['phone']);
    },
  );

  test(
    "TC_031: Verify that an admin's email and another driver's phone are both reported, each with the right person",
    tags,
    async ({ request }) => {
      const admin = await rehire.addAdmin(request, 'A');
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: admin.email, phone: ravi.phone }),
      );

      expectRefused(result);
      expect(adminConflict(result.body)?.matched_on).toEqual(['email']);
      expect(conflictWith(result.body, ravi.id)?.matched_on).toEqual(['phone']);
    },
  );

  test(
    "TC_032: Verify that editing a driver's email to the owner's email is refused",
    tags,
    async ({ request }) => {
      const owner = await ownerOf(request, 'A');
      const zara = await addDriver(request, 'A');

      // Without conflict_resolved, as before the conflict window's answer
      const response = await api.edit(request, await login('A'), zara.id, {
        station_code: zara.station_code,
        email: owner.email,
      });

      expect(response.status()).toBe(409);
      const [still] = await driversWithEmail(request, 'A', zara.email);
      expect(still, 'the driver keeps the old email').toBeTruthy();
    },
  );
});

// ---------- REQ-04: another company (another DSP) ----------

test.describe('REQ-04 Another company', () => {
  // In the app, a driver of another company is SAVED without app access ("added with access issue"); the
  // sheet says "user not added" (TC_035: question for the BA). The tests check the app's design.
  test(
    "TC_033: Verify that company A's admin added as a driver in company B is saved only without app access",
    tags,
    async ({ request }) => {
      const admin = await rehire.addAdmin(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { email: admin.email, phone: admin.phone }),
      );

      expect(result.status, result.body.message).toBe(200);
      const conflict = adminConflict(result.body);
      expect(conflict?.conflict_type).toBe('cross_company');
      expect(conflict?.conflict_kind).toBe('cross_company_admin');
      expect(result.body.data.allow_signin).toBe(false);
    },
  );

  test(
    "TC_023, TC_089: Verify that company A's owner added as a driver in company B is reported as a conflict (BUG-API-036)",
    bugTags,
    async ({ request }) => {
      const owner = await ownerOf(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { email: owner.email, phone: owner.phone }),
      );

      const conflict = ownerConflict(result.body);
      expect(
        conflict?.conflict_type,
        'a cross-company conflict with the owner',
      ).toBe('cross_company');
    },
  );

  test(
    "TC_035: Verify that company A's active driver is added in company B only without app access",
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { email: ravi.email, phone: ravi.phone }),
      );

      expect(result.status, result.body.message).toBe(200);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict, 'the conflict names the driver of A').toBeTruthy();
      expect(conflict.conflict_type).toBe('cross_company');
      expect(conflict.matched_on).toEqual(
        expect.arrayContaining(['email', 'phone']),
      );
      // "Conflicted driver will not get app access until resolved by Super Admin"
      expect(result.body.data.allow_signin).toBe(false);
      expect(result.body.data.signin_downgraded_due_to_conflict).toBe(true);
      // The driver in A is not changed
      const [inA] = await driversWithEmail(request, 'A', ravi.email);
      expect(inA.status).toBe('active');
    },
  );

  test(
    'TC_038: Verify that only the same email is a conflict in another company',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { email: ravi.email }),
      );

      expect(result.status, result.body.message).toBe(200);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict?.conflict_type).toBe('cross_company');
      expect(conflict?.matched_on).toEqual(['email']);
      expect(result.body.data.allow_signin).toBe(false);
    },
  );

  test(
    'TC_039: Verify that only the same phone is a conflict in another company',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { phone: ravi.phone }),
      );

      expect(result.status, result.body.message).toBe(200);
      const conflict = conflictWith(result.body, ravi.id);
      expect(conflict?.conflict_type).toBe('cross_company');
      expect(conflict?.matched_on).toEqual(['phone']);
      expect(result.body.data.allow_signin).toBe(false);
    },
  );

  test(
    'TC_040: Verify that the same transporter ID in another company is not a conflict',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { transporter_id: ravi.transporter_id }),
      );

      expect(result.status, result.body.message).toBe(200);
    },
  );

  test(
    'TC_041: Verify that the same name in another company is not a conflict',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { name: ravi.name }),
      );

      expect(result.status, result.body.message).toBe(200);
    },
  );

  test(
    "TC_042: Verify that a conflict with another company does not show that company's driver to the admin (BUG-API-037)",
    bugTags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const result = await tryAdd(
        request,
        'B',
        newDriverDetails('B', { email: ravi.email }),
      );

      // The sheet: only a generic message; the other company's name and user details are not in the answer
      // (the screen shows only "added with access issue", but the API answer has them all)
      const answer = JSON.stringify(result.body);
      expect(answer, "the other driver's name").not.toContain(ravi.name);
      expect(answer, "the other driver's phone").not.toContain(ravi.phone);
      expect(answer, "the other driver's transporter ID").not.toContain(
        ravi.transporter_id,
      );
      expect(answer, "the other company's name").not.toContain('Brothers');
    },
  );

  // OQ-15: does an inactive driver in another company block? Not decided yet
  test.fixme(
    'TC_043: Verify the conflict for a driver who is inactive in another company (OQ-15)',
    tags,
    async () => {},
  );
});

// ---------- REQ-12: activate / deactivate ----------

test.describe('REQ-12 Active and inactive', () => {
  test(
    'TC_110, TC_111: Verify that deactivating and activating a driver without a conflict works directly',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const user = await login('A');

      const off = await deactivate(request, 'A', ravi);
      expect(off.status()).toBe(200);
      const on = await api.setStatus(request, user, ravi.id, 'active');
      expect(on.status()).toBe(200);

      const [now] = await driversWithEmail(request, 'A', ravi.email);
      expect(now.status).toBe('active');
    },
  );
});

// ---------- REQ-17: global rules ----------

test.describe('REQ-17 Global rules', () => {
  test(
    'TC_137: Verify that the email is compared without upper/lower case',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const [local, domain] = ravi.email.split('@');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', {
          email: local.toUpperCase() + '@' + domain.toUpperCase(),
        }),
      );

      expectRefused(result);
      expect(conflictWith(result.body, ravi.id)).toBeTruthy();
    },
  );

  test(
    'TC_138: Verify that spaces around the email and phone are removed before the check',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      const byEmail = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: '  ' + ravi.email + '  ' }),
      );
      const byPhone = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { phone: ' ' + ravi.phone + ' ' }),
      );

      expect(byEmail.status, 'email with spaces').toBe(409);
      expect(byPhone.status, 'phone with spaces').toBe(409);
    },
  );

  for (const [label, format] of [
    ['+1 in front', (p) => '+1' + p],
    ['dashes', (p) => p.slice(0, 3) + '-' + p.slice(3, 6) + '-' + p.slice(6)],
    ['spaces', (p) => p.slice(0, 3) + ' ' + p.slice(3, 6) + ' ' + p.slice(6)],
  ]) {
    // "+1" in front is saved as a new number (BUG-API-038, to confirm: OQ-13 phone normalisation)
    const plusOne = label === '+1 in front';
    test(
      'TC_139: Verify that the same phone written with ' +
        label +
        ' is the same number' +
        (plusOne ? ' (BUG-API-038)' : ''),
      plusOne ? bugTags : tags,
      async ({ request }) => {
        const ravi = await addDriver(request, 'A');

        const result = await tryAdd(
          request,
          'A',
          newDriverDetails('A', { phone: format(ravi.phone) }),
        );

        // A refused phone format (400) is also fine: the number is never saved twice
        expect([400, 409], result.body.message).toContain(result.status);
      },
    );
  }

  test(
    'TC_140: Verify that a plus alias of an email is a different email',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');
      const [local, domain] = ravi.email.split('@');

      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: local + '+1@' + domain }),
      );

      expect(result.status, result.body.message).toBe(200);
    },
  );

  test(
    'TC_136: Verify that two companies adding the same new person at the same time create only one driver',
    tags,
    async ({ request }) => {
      const person = newDriverDetails('A');
      const inB = {
        ...person,
        station_code: newDriverDetails('B').station_code,
      };

      const [a, b] = await Promise.all([
        tryAdd(request, 'A', person),
        tryAdd(request, 'B', inB),
      ]);

      // In the app a driver of another company is saved without app access: so at most one of the two may
      // be saved as a normal driver (no conflict, app access possible)
      const clean = [a, b].filter(
        (r) => r.status === 200 && conflictsOf(r.body).length === 0,
      );
      expect(clean, 'saved twice without a conflict').toHaveLength(1);
    },
  );

  test(
    'TC_135: Verify that the conflict rules are checked by the server, not only the screen',
    tags,
    async ({ request }) => {
      const ravi = await addDriver(request, 'A');

      // The same request a script would send, with the details of an existing driver
      const result = await tryAdd(
        request,
        'A',
        newDriverDetails('A', { email: ravi.email, phone: ravi.phone }),
      );

      expectRefused(result);
      expect(await driversWithEmail(request, 'A', ravi.email)).toHaveLength(1);
    },
  );
});
