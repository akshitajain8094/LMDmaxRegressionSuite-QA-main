// SCENARIOS: acknowledgement journeys (driver profile -> E-Signature -> Add Report -> Report Type "Acknowledgement").
// An acknowledgement is a document (e.g. a new policy) the driver must read and sign. It uses the same screens and
// APIs as a write-up, with report_type "ack". API only, no browser: each step sends the same request as the web app.
// Every test uses its own report date (the dashboard counts acknowledgements by that date).
//
// TC-01 The driver signs an acknowledgement
//   1. Manager sends an acknowledgement by SMS            CHECK: saved as "sent"
//   2. Manager's list of the driver's reports             CHECK: shows it as an acknowledgement, with its link
//   3. Dashboard: acknowledgements of that day            CHECK: total +1, unsigned +1
//   4. Driver opens the link (no login)                   CHECK: shows the title, "sent"
//   5. Driver signs (a signature image) and submits       CHECK: 200
//   6. Manager opens the acknowledgement                  CHECK: "signed", with the signature
//   7. Dashboard: acknowledgements of that day            CHECK: total +1, unsigned back as before
//   8. Dashboard: the acknowledgement report of that day  CHECK: lists it
// TC-02 The manager edits, then deletes, an acknowledgement that is not signed yet
//   1. Manager sends an acknowledgement
//   2. Manager edits the notes (Edit -> Update)           CHECK: the new notes are saved
//   3. Manager deletes it                                 CHECK: "Report deleted successfully."
//   4. Manager's list and the dashboard                   CHECK: it is gone, the day's total is back as before
// Known bug: it fails until the bug is fixed, and deletes its acknowledgement before its checks.
// TC-03 BUG-API-005: the report type is "ack" when the acknowledgement is opened, "acknowledgement" in the list
//                                                         CHECK: both the same
//
// Driver: Jordan Whitaker (id 38267), a test driver whose phone and email reach no real person.
// Daily regression only (@adds-data): TC-01 leaves one signed acknowledgement per run (it cannot be deleted in the
// web app, ENV-004); TC-02 and TC-03 delete theirs.

const { test, expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const daysAgo = require('../../../api/dates');

// The signature the driver draws on the link page (a JPEG, like the web app sends)
const signatureFile = path.join(
  __dirname,
  '../../../test-files/driver-signature.jpeg',
);

// ---------- Journeys ----------

test(
  'TC-01: Verify that an acknowledgement signed by the driver shows as signed and is counted on the dashboard',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    // The manager's login, sent with every request
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(0); // this test's own report date: today

    // Before: the dashboard's acknowledgements of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.acknowledgement;

    // 1. Manager: Add Report -> Report Type "Acknowledgement" -> details -> Send (by SMS)
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers,
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
            report_date: date,
            report_type: 'ack',
            title: 'Updated seatbelt policy',
            violation: ['Seatbelt'],
            notes:
              '<p>Please read the updated seatbelt policy: the seatbelt must be worn at all times while the vehicle is moving.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Updated seatbelt policy.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
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
    expect(created.data[0].status).toBe('sent');
    const acknowledgementId = created.data[0]._id;

    // 2. Manager's list of Jordan Whitaker's reports: an acknowledgement, with its link for the driver
    const listResponse = await request.get(endpoints.eSignatureReport, {
      headers,
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const inList = list.data.find((report) => report._id === acknowledgementId);
    expect(inList.report_type).toBe('acknowledgement');
    expect(inList.link).toContain('/e-signature/ack/');

    // 3. Dashboard: one more acknowledgement, and one more unsigned
    const dashboardSentResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardSentResponse);
    const dashboardSent = await dashboardSentResponse.json();
    const sent = dashboardSent.data.team.acknowledgement;
    expect(sent.total).toBe(before.total + 1);
    expect(sent.unsigned).toBe(before.unsigned + 1);

    // 4. Driver: opens the link from the SMS (no login)
    const formResponse = await request.get(endpoints.signForm, {
      params: { data_id: acknowledgementId },
    });
    await addToReport(formResponse);
    expect(formResponse.status()).toBe(200);
    const form = await formResponse.json();
    expect(form.data.title).toBe('Updated seatbelt policy');
    expect(form.data.status).toBe('sent');

    // 5. Driver: signs and submits (no login)
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
        data_id: acknowledgementId,
      },
    });
    await addToReport(signResponse);
    expect(signResponse.status()).toBe(200);

    // 6. Manager: the acknowledgement is signed, with the driver's signature
    const oneResponse = await request.get(
      endpoints.eSignature + acknowledgementId,
      { headers },
    );
    await addToReport(oneResponse);
    const one = await oneResponse.json();
    expect(one.data.status).toBe('signed');
    expect(one.data.driver_sign_url).toBeTruthy();

    // 7. Dashboard: still one more acknowledgement, but no longer unsigned
    const dashboardSignedResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardSignedResponse);
    const dashboardSigned = await dashboardSignedResponse.json();
    const signed = dashboardSigned.data.team.acknowledgement;
    expect(signed.total).toBe(before.total + 1);
    expect(signed.unsigned).toBe(before.unsigned);

    // 8. Dashboard: the acknowledgement report of that day (a click on the number) lists it
    const reportResponse = await request.get(endpoints.dashboardDrivers, {
      headers,
      params: { start: date, end: date, report_name: 'acknowledgmentReport' },
    });
    await addToReport(reportResponse);
    const report = await reportResponse.json();
    const reportIds = report.data.map((row) => row._id);
    expect(reportIds).toContain(acknowledgementId);
  },
);

test(
  'TC-02: Verify that the manager can edit and delete an acknowledgement that is not signed yet',
  { tag: ['@regression', '@adds-data'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(1); // this test's own report date

    // Before: the dashboard's acknowledgements of that day
    const dashboardBeforeResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardBeforeResponse);
    const dashboardBefore = await dashboardBeforeResponse.json();
    const before = dashboardBefore.data.team.acknowledgement;

    // 1. Manager: sends an acknowledgement
    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers,
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
            report_date: date,
            report_type: 'ack',
            title: 'Fuel card policy',
            violation: ['Seatbelt'],
            notes:
              '<p>Please read the fuel card policy before your next route.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Fuel card policy.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);
    expect(createResponse.status()).toBe(200);
    const created = await createResponse.json();
    const acknowledgementId = created.data[0]._id;

    // 2. Manager: Edit -> new notes -> Update (the web app sends the whole acknowledgement again)
    const updateResponse = await request.post(
      endpoints.eSignatureUpdate + acknowledgementId,
      {
        headers,
        multipart: {
          e_sign_data: JSON.stringify({
            status: 'sent',
            key:
              faker.string.alphanumeric(3) +
              '38267' +
              faker.string.alphanumeric(3),
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: date,
            report_type: 'ack',
            title: 'Fuel card policy',
            violation: ['Seatbelt'],
            notes:
              '<p>Please read the fuel card policy before your next route. It applies from 1 October.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Fuel card policy.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
            company_id: '541',
          }),
          channels: JSON.stringify(['sms']),
        },
      },
    );
    await addToReport(updateResponse);
    expect(updateResponse.status()).toBe(200);

    const editedResponse = await request.get(
      endpoints.eSignature + acknowledgementId,
      { headers },
    );
    await addToReport(editedResponse);
    const edited = await editedResponse.json();
    expect(edited.data.notes).toContain('It applies from 1 October.');

    // 3. Manager: deletes it (possible while it is not signed)
    const deleteResponse = await request.delete(
      endpoints.eSignature + acknowledgementId,
      { headers },
    );
    await addToReport(deleteResponse);
    expect(deleteResponse.status()).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.message).toBe('Report deleted successfully.');

    // 4. Manager's list and the dashboard: it is gone
    const listResponse = await request.get(endpoints.eSignatureReport, {
      headers,
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const listIds = list.data.map((report) => report._id);
    expect(listIds).not.toContain(acknowledgementId);

    const dashboardAfterResponse = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: date, end: date },
    });
    await addToReport(dashboardAfterResponse);
    const dashboardAfter = await dashboardAfterResponse.json();
    expect(dashboardAfter.data.team.acknowledgement.total).toBe(before.total);
  },
);

// ---------- Known bug: this fails until the bug is fixed (docs/known-bugs/api-bugs.md) ----------

test(
  'TC-03: Verify that an acknowledgement has the same report type in the list and when it is opened (BUG-API-005)',
  { tag: ['@regression', '@adds-data', '@knownbug'] },
  async ({ request }) => {
    const user = await loginAsTestUser();
    const headers = {
      'x-access-token': user.token,
      'x-access-user': user.account_id,
    };
    const date = daysAgo(2); // this test's own report date

    const createResponse = await request.post(endpoints.eSignatureCreate, {
      headers,
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
            report_date: date,
            report_type: 'ack',
            title: 'Vehicle inspection policy',
            violation: ['Seatbelt'],
            notes: '<p>Please read the vehicle inspection policy.</p>',
            email: 'jordan.whitaker.qa@yopmail.com',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Vehicle inspection policy.\n\nLink :- ${link}\n\nRegards,\nPAPAYA LMD',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(createResponse);
    const created = await createResponse.json();
    const acknowledgementId = created.data[0]._id;

    // Opened (View) and in the manager's list
    const oneResponse = await request.get(
      endpoints.eSignature + acknowledgementId,
      { headers },
    );
    await addToReport(oneResponse);
    const one = await oneResponse.json();

    const listResponse = await request.get(endpoints.eSignatureReport, {
      headers,
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(listResponse);
    const list = await listResponse.json();
    const inList = list.data.find((report) => report._id === acknowledgementId);

    // Clean up first (it is not signed, so it can be deleted), then check
    const deleteResponse = await request.delete(
      endpoints.eSignature + acknowledgementId,
      { headers },
    );
    await addToReport(deleteResponse);

    expect(one.data.report_type).toBe(inList.report_type);
  },
);
