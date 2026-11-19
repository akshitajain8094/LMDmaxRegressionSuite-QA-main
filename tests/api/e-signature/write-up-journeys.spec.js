// SCENARIOS: write-up journeys (driver profile -> E-Signature -> Write-Up)
// API only, no browser: each step sends the same request the web app sends when the manager or the driver
// clicks. The driver's steps are sent without login, like the link page the driver opens from the SMS.
//
// TC-01 The driver signs
//   1. Manager sends a write-up by SMS (type "Seatbelt")     CHECK: saved as "sent"
//   2. Driver opens the link                                 CHECK: shows the title, the type and "sent"
//   3. Driver signs (a signature image) and submits          CHECK: 200
//   4. Manager opens the write-up                            CHECK: "signed", with the signature and the date
//   5. Dashboard: today's write-up report                    CHECK: lists the write-up
//   6. Leaderboard                                           CHECK: Jordan's Write-Ups count is above 0
// TC-02 The driver refuses
//   1. Manager sends a write-up (type "Speeding")            CHECK: 200
//   2. Driver refuses on the link page, with a reason        CHECK: "Success"
//   3. Manager opens the write-up                            CHECK: "refused_to_sign", refused by the driver,
//                                                                   the reason is kept, no signature
// TC-03 The driver refuses in person, the manager records it
//   1. Manager sends a write-up (type "Distracted Driving")  CHECK: 200
//   2. Manager clicks "Refuse To Sign"                       CHECK: "Success"
//   3. Manager opens the write-up                            CHECK: "refused_to_sign", refused by the manager
// TC-04 The manager edits, re-sends and deletes a write-up that is not signed yet
//   1. Manager sends a write-up (type "Following Distance")  CHECK: 200
//   2. Manager edits the notes (Edit -> Update)              CHECK: the new notes are saved, still "sent"
//   3. Manager re-sends the link (View -> Re-Send Link)      CHECK: "Success"
//   4. Manager deletes it                                    CHECK: "Report deleted successfully."
//   5. Manager's list of Jordan's write-ups                  CHECK: the write-up is gone
// TC-05 Known bug BUG-API-016: the driver signs a write-up, then the manager deletes it through the API.
//   CHECK: the API refuses (the web app has no Delete for signed write-ups). Today it deletes it.
// TC-06 Known bug BUG-API-017: the manager edits the notes of a write-up.
//   CHECK: "updated_at" changes. Today it keeps the time the write-up was created.
//
// Driver: Jordan Whitaker (id 38267), a test driver whose phone and email reach no real person.
// Every test adds a write-up (daily regression only: @adds-data). TC-04 and TC-06 delete theirs, and TC-05 too
// while BUG-API-016 is open. The signed and refused ones stay (TC-01 to TC-03): the web app cannot delete them.

const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');

// The signature the driver draws on the link page (a JPEG, like the web app sends)
const signatureFile = path.join(
  __dirname,
  '../../../test-files/driver-signature.jpeg',
);

// ---------- Journeys ----------

test(
  'TC-01: Verify that a write-up signed by the driver shows as signed for the manager and in the write-up report',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Manager: sends the write-up by SMS (E-Signature -> Write-Up -> Send)
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            // The web app makes a random key for the driver's link
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes:
              '<p>Netradyne recorded the driver without a seatbelt for 12 minutes on route DYY1-14.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);

    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    expect(created.message).toBe('Success');
    expect(created.failed_records).toEqual([]);
    expect(created.data[0].status).toBe('sent');
    const writeUpId = created.data[0]._id;

    // 2. Driver: opens the link from the SMS (no login) and sees the write-up
    const formResponse = await request.get(endpoints.signForm, {
      params: { data_id: writeUpId },
    });
    await addToReport(formResponse);

    expect(formResponse.status()).toBe(200);
    const form = await formResponse.json();
    expect(form.data.title).toBe('Seatbelt violation on route DYY1-14');
    expect(form.data.violation).toEqual(['Seatbelt']);
    expect(form.data.status).toBe('sent');

    // 3. Driver: signs and submits (no login)
    const signResponse = await request.post(endpoints.signForm, {
      multipart: {
        file: {
          name: 'driver_sign.jpeg',
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync(signatureFile),
        },
        driver_id: '38267',
        driver_name: 'Jordan Whitaker',
        company_id: '541',
        data_id: writeUpId,
      },
    });
    await addToReport(signResponse);
    expect(signResponse.status()).toBe(200);

    // 4. Manager: the write-up is signed, with the driver's signature and the date
    const writeUpResponse = await request.get(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(writeUpResponse);

    expect(writeUpResponse.status()).toBe(200);
    const writeUp = await writeUpResponse.json();
    expect(writeUp.data.status).toBe('signed');
    expect(writeUp.data.driver_sign_url).toBeTruthy();
    expect(writeUp.data.driver_sign_date).toBeTruthy();

    // 5. Dashboard: the write-up report of today lists it
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { start: today, end: today, report_name: 'writeupReport' },
    });
    await addToReport(reportResponse);

    expect(reportResponse.status()).toBe(200);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).toContain(writeUpId);

    // 6. Leaderboard: Jordan Whitaker's Write-Ups column counts it
    const leaderboardResponse = await request.get(
      endpoints.leaderboardDashboard,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(leaderboardResponse);

    const leaderboard = await leaderboardResponse.json();
    const jordan = leaderboard.data.find((driver) => driver.id === '38267');
    expect(jordan.writeup).toBeGreaterThan(0);
  },
);

test(
  'TC-02: Verify that a write-up refused by the driver shows the reason to the manager',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Manager: sends the write-up by SMS
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Speeding on route DYY1-22',
            violation: ['Speeding'],
            notes:
              '<p>Netradyne recorded 3 speeding events above 10 mph on route DYY1-22.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Speeding on route DYY1-22.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);

    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    const writeUpId = created.data[0]._id;

    // 2. Driver: refuses on the link page with a reason (no login)
    const refuseResponse = await request.patch(endpoints.signFormRefuse, {
      data: {
        data_id: writeUpId,
        driver_id: '38267',
        refused_reason:
          'I was not driving on route DYY1-22 that day. I was helping another driver with a rescue.',
      },
    });
    await addToReport(refuseResponse);

    expect(refuseResponse.status()).toBe(200);
    const refused = await refuseResponse.json();
    expect(refused.message).toBe('Success');

    // 3. Manager: the write-up is refused by the driver, with the driver's reason
    const writeUpResponse = await request.get(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(writeUpResponse);

    expect(writeUpResponse.status()).toBe(200);
    const writeUp = await writeUpResponse.json();
    expect(writeUp.data.status).toBe('refused_to_sign');
    expect(writeUp.data.refused_by).toBe('38267');
    expect(writeUp.data.refused_reason).toBe(
      'I was not driving on route DYY1-22 that day. I was helping another driver with a rescue.',
    );
    expect(writeUp.data.driver_sign_url).toBe(null);
  },
);

test(
  'TC-03: Verify that the manager can mark a write-up as refused when the driver refuses in person',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Manager: sends the write-up by SMS
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Distracted driving on route DYY1-31',
            violation: ['Distracted Driving'],
            notes:
              '<p>Netradyne recorded the driver using a phone while driving on route DYY1-31.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Distracted driving on route DYY1-31.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);

    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    const writeUpId = created.data[0]._id;

    // 2. Manager: "Refuse To Sign" in the driver's E-Signature list
    const refuseResponse = await request.patch(endpoints.eSignatureRefuse, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: { data_id: writeUpId, driver_id: '38267' },
    });
    await addToReport(refuseResponse);

    expect(refuseResponse.status()).toBe(200);
    const refused = await refuseResponse.json();
    expect(refused.message).toBe('Success');

    // 3. Manager: the write-up is refused, and the refusal is recorded as the manager's
    const writeUpResponse = await request.get(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(writeUpResponse);

    expect(writeUpResponse.status()).toBe(200);
    const writeUp = await writeUpResponse.json();
    expect(writeUp.data.status).toBe('refused_to_sign');
    expect(writeUp.data.refused_by).toBe(user.account_id);
  },
);

test(
  'TC-04: Verify that the manager can edit, re-send and delete a write-up that is not signed yet',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Manager: sends the write-up by SMS
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Following distance on route DYY1-08',
            violation: ['Following Distance'],
            notes:
              '<p>Netradyne recorded 2 following distance events on route DYY1-08.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Following distance on route DYY1-08.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);

    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    const writeUpId = created.data[0]._id;

    // 2. Manager: edits the notes (Edit -> Update), like the web app it sends the whole write-up again
    const updateResponse = await request.post(
      endpoints.eSignatureUpdate + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
        multipart: {
          e_sign_data: JSON.stringify({
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Following distance on route DYY1-08',
            violation: ['Following Distance'],
            notes:
              '<p>Netradyne recorded 4 following distance events on route DYY1-08. The dispatcher coached the driver.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Following distance on route DYY1-08.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
            company_id: '541',
          }),
          channels: JSON.stringify(['sms']),
        },
      },
    );
    await addToReport(updateResponse);
    expect(updateResponse.status()).toBe(200);

    const editedResponse = await request.get(endpoints.eSignature + writeUpId, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(editedResponse);
    const edited = await editedResponse.json();
    expect(edited.data.notes).toContain('The dispatcher coached the driver.');
    expect(edited.data.status).toBe('sent');

    // 3. Manager: View -> Re-Send Link
    const resendResponse = await request.post(endpoints.eSignatureResend, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      data: {
        _id: writeUpId,
        channels: ['sms'],
        email: 'jordan.whitaker.qa@yopmail.com',
      },
    });
    await addToReport(resendResponse);

    expect(resendResponse.status()).toBe(200);
    const resent = await resendResponse.json();
    expect(resent.message).toBe('Success');

    // 4. Manager: deletes it (possible while it is not signed)
    const deleteResponse = await request.delete(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(deleteResponse);

    expect(deleteResponse.status()).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.message).toBe('Report deleted successfully.');

    // 5. Manager: the write-up is no longer in the driver's list
    const listResponse = await request.get(endpoints.eSignatureReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267' },
    });
    await addToReport(listResponse);

    const list = await listResponse.json();
    const listIds = list.data.map((writeUpItem) => writeUpItem._id);
    expect(listIds).not.toContain(writeUpId);
  },
);

// ---------- Known bugs: these fail until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-05: Verify that a signed write-up cannot be deleted (BUG-API-016)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Sign & Signal violation on route DYY1-05',
            violation: ['Sign & Signal'],
            notes:
              '<p>Netradyne recorded a stop sign violation on route DYY1-05.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Sign & Signal violation on route DYY1-05.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);
    const created = await createResponse.json();
    const writeUpId = created.data[0]._id;

    const signResponse = await request.post(endpoints.signForm, {
      multipart: {
        file: {
          name: 'driver_sign.jpeg',
          mimeType: 'image/jpeg',
          buffer: fs.readFileSync(signatureFile),
        },
        driver_id: '38267',
        driver_name: 'Jordan Whitaker',
        company_id: '541',
        data_id: writeUpId,
      },
    });
    await addToReport(signResponse);
    expect(signResponse.status()).toBe(200);

    // The web app shows Delete only for write-ups that are not signed; the API must refuse too.
    // While the bug is open this delete works, which also cleans up the test write-up.
    const deleteResponse = await request.delete(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(deleteResponse);

    const deleted = await deleteResponse.json();
    expect(deleted.success).toBe(false);
  },
);

test(
  'TC-06: Verify that editing a write-up changes its "updated_at" time (BUG-API-017)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const today = new Date().toISOString().slice(0, 10);

    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Parking ticket on route DYY1-17',
            violation: ['Parking Tickets'],
            notes:
              '<p>The driver received a parking ticket on route DYY1-17.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Parking ticket on route DYY1-17.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);
    const created = await createResponse.json();
    const writeUpId = created.data[0]._id;
    const createdAt = created.data[0].updated_at;

    const updateResponse = await request.post(
      endpoints.eSignatureUpdate + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
        multipart: {
          e_sign_data: JSON.stringify({
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: today,
            report_type: 'write-up',
            title: 'Parking ticket on route DYY1-17',
            violation: ['Parking Tickets'],
            notes:
              '<p>The driver received a parking ticket on route DYY1-17. The ticket was paid by the company.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Parking ticket on route DYY1-17.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
            company_id: '541',
          }),
          channels: JSON.stringify(['sms']),
        },
      },
    );
    await addToReport(updateResponse);
    expect(updateResponse.status()).toBe(200);

    const editedResponse = await request.get(endpoints.eSignature + writeUpId, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(editedResponse);
    const edited = await editedResponse.json();

    // Clean up first (a write-up that is not signed can be deleted), then check
    const deleteResponse = await request.delete(
      endpoints.eSignature + writeUpId,
      {
        headers: {
          'x-access-token': user.token,
          'x-access-user': user.account_id,
        },
      },
    );
    await addToReport(deleteResponse);

    expect(edited.data.notes).toContain('The ticket was paid by the company.');
    expect(edited.data.updated_at).not.toBe(createdAt);
  },
);
