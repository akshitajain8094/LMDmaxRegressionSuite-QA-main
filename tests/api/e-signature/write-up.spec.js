const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const loginAsTestUser = require('../../../api/auth');
const getSchemaErrors = require('../../../api/schema');
const eSignatureReportSchema = require('../../../schemas/e-signature-report.schema');

// Write-up APIs one by one (driver profile -> E-Signature): write-up types, the manager's list, and the
// checks of "Send" (POST /lmd/prfsrv/e-signature/v2/create). None of these tests saves a write-up:
// every "Send" below has one wrong value, so the API answers 400. The journeys are in write-up-journeys.spec.js.

// ---------- Write-up types and the manager's list ----------

test(
  'TC-01: Verify that the write-up types of the station are returned (the "Select Type" list)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.writeUpTypes, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { type: 'writeup' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Management data fetched successfully');
    expect(body.data[0].type).toBe('writeup');
    expect(body.data[0].company_id).toBe('541');
    // Some of the types a manager can pick
    expect(body.data[0].options).toContain('Seatbelt');
    expect(body.data[0].options).toContain('Speeding');
    expect(body.data[0].options).toContain('Distracted Driving');
  },
);

test(
  "TC-02: Verify that the manager's list shows the write-ups of a driver",
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.eSignatureReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Success');
    // Only this driver's write-ups (only the ids are checked, so a failure prints no content)
    const driverIds = body.data.map((writeUp) => writeUp.driver_id);
    const otherDriverIds = driverIds.filter((driverId) => driverId !== '38267');
    expect(otherDriverIds).toHaveLength(0);
  },
);

test(
  "TC-03: Verify that the manager's list matches the expected schema",
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.eSignatureReport, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, eSignatureReportSchema)).toBe('No errors');
  },
);

// ---------- "Send" with a wrong value (400): nothing is saved ----------

test(
  'TC-04: Verify that sending without a delivery channel returns "channels must contain at least one valid channel"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key: 'Kq738267Rt2',
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: '2026-09-25',
            report_type: 'write-up',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes: '<p>Netradyne recorded the driver without a seatbelt.</p>',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify([]),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      'channels must contain at least one valid channel',
    );
  },
);

test(
  'TC-05: Verify that an unknown delivery channel returns "Unsupported channels value"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key: 'Kq738267Rt2',
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: '2026-09-25',
            report_type: 'write-up',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes: '<p>Netradyne recorded the driver without a seatbelt.</p>',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['fax']),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Unsupported channels value: fax');
  },
);

test(
  'TC-06: Verify that sending without write-up data returns "Invalid e_sign_data"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: { channels: JSON.stringify(['sms']) },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Invalid e_sign_data: must be valid JSON.');
  },
);

test(
  'TC-07: Verify that an empty list of write-ups returns "array must contain at least one item"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid e_sign_data: array must contain at least one item.',
    );
  },
);

test(
  'TC-08: Verify that a write-up without a driver returns "missing required field(s): driver_id"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key: 'Kq738267Rt2',
            driver_name: 'Jordan Whitaker',
            report_date: '2026-09-25',
            report_type: 'write-up',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes: '<p>Netradyne recorded the driver without a seatbelt.</p>',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid data: item at index 0 is missing required field(s): driver_id.',
    );
  },
);

test(
  'TC-09: Verify that an unknown report type returns "Expected one of: write-up, ack"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key: 'Kq738267Rt2',
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: '2026-09-25',
            report_type: 'warning-letter',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes: '<p>Netradyne recorded the driver without a seatbelt.</p>',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid data: item at index 0 has invalid "report_type". Expected one of: write-up, ack.',
    );
  },
);

test(
  'TC-10: Verify that a report date that is not YYYY-MM-DD returns "invalid report_date"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
      multipart: {
        e_sign_data: JSON.stringify([
          {
            status: 'sent',
            key: 'Kq738267Rt2',
            driver_id: '38267',
            driver_name: 'Jordan Whitaker',
            report_date: '25-09-2026',
            report_type: 'write-up',
            title: 'Seatbelt violation on route DYY1-14',
            violation: ['Seatbelt'],
            notes: '<p>Netradyne recorded the driver without a seatbelt.</p>',
            message:
              'Hi Jordan Whitaker\n\nPlease e-sign the Seatbelt violation on route DYY1-14.\n\nLink :- ${link}',
            sent_from: 'message',
          },
        ]),
        channels: JSON.stringify(['sms']),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe(
      'Invalid data: item at index 0 has an invalid "report_date".',
    );
  },
);

// ---------- Login headers missing or wrong (401) ----------
// The "Send" body has no delivery channel, so nothing is saved even if the login check is missing

test(
  'TC-11: Verify that sending without x-access-token returns 401',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: { 'x-access-user': user.account_id },
      multipart: {
        e_sign_data: JSON.stringify([
          { status: 'sent', driver_id: '38267', report_type: 'write-up' },
        ]),
        channels: JSON.stringify([]),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  'TC-12: Verify that sending without x-access-user returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.post(endpoints.eSignatureCreate, {
      headers: { 'x-access-token': user.token },
      multipart: {
        e_sign_data: JSON.stringify([
          { status: 'sent', driver_id: '38267', report_type: 'write-up' },
        ]),
        channels: JSON.stringify([]),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, token or account_id missing');
  },
);

test(
  "TC-13: Verify that the manager's list with an invalid token returns 401",
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.eSignatureReport, {
      headers: {
        'x-access-token': 'invalid-token',
        'x-access-user': user.account_id,
      },
      params: { driver_id: '38267', station_id: '541' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Not Authorized, invalid token');
  },
);

// ---------- Wrong HTTP method ----------

test(
  'TC-14: Verify that GET on "Send" is not allowed',
  { tag: ['@regression'] },
  async ({ request }) => {
    const user = await loginAsTestUser();

    const response = await request.get(endpoints.eSignatureCreate, {
      headers: {
        'x-access-token': user.token,
        'x-access-user': user.account_id,
      },
    });
    await addToReport(response);

    // Ideally 405 Method Not Allowed (SUG-API-001)
    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('API Not Found');
  },
);
