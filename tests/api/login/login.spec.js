const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');
const getSchemaErrors = require('../../../api/schema');
const loginSchema = require('../../../schemas/login.schema');

// Login API: POST /lmd/usrsrv/users/v1/user/perf_login

// ---------- Valid login ----------

test(
  'TC-01: Verify that login with valid credentials returns a token',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: process.env.LOGIN_EMAIL,
        password: process.env.LOGIN_PASSWORD,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.action).toBe('login');
    expect(body.data.email).toBe(process.env.LOGIN_EMAIL);
    expect(body.data.token).toBeTruthy();
    expect(body.data.account_id).toBeTruthy();
  },
);

test(
  'TC-02: Verify that login response matches the expected schema',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: process.env.LOGIN_EMAIL,
        password: process.env.LOGIN_PASSWORD,
      },
    });
    await addToReport(response);

    const body = await response.json();
    expect(getSchemaErrors(body, loginSchema)).toBe('No errors');
  },
);

test(
  'TC-03: Verify that email is not case-sensitive',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: process.env.LOGIN_EMAIL.toUpperCase(),
        password: process.env.LOGIN_PASSWORD,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.token).toBeTruthy();
  },
);

test(
  'TC-04: Verify that spaces around the email are ignored',
  { tag: ['@regression'] },
  async ({ request }) => {
    // Two spaces before and after the email
    const response = await request.post(endpoints.login, {
      data: {
        email: '  ' + process.env.LOGIN_EMAIL + '  ',
        password: process.env.LOGIN_PASSWORD,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.token).toBeTruthy();
  },
);

// ---------- Wrong credentials (401) ----------

test(
  'TC-05: Verify that wrong password returns "Invalid Credentials"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: process.env.LOGIN_EMAIL, password: 'WrongPassword@123' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid Credentials');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-06: Verify that unknown email returns "Invalid Credentials"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: 'no-such-user@example.com',
        password: process.env.LOGIN_PASSWORD,
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid Credentials');
  },
);

test(
  'TC-07: Verify that password is case-sensitive',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: process.env.LOGIN_EMAIL,
        password: process.env.LOGIN_PASSWORD.toLowerCase(),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid Credentials');
  },
);

// ---------- Missing or invalid input (400) ----------

test(
  'TC-08: Verify that empty email returns "email is not allowed to be empty"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: '', password: process.env.LOGIN_PASSWORD },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"email" is not allowed to be empty');
  },
);

test(
  'TC-09: Verify that empty password returns "password is not allowed to be empty"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: process.env.LOGIN_EMAIL, password: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"password" is not allowed to be empty');
  },
);

test(
  'TC-10: Verify that missing email returns "email is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { password: process.env.LOGIN_PASSWORD },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"email" is required');
  },
);

test(
  'TC-11: Verify that missing password returns "password is required"',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: process.env.LOGIN_EMAIL },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('"password" is required');
  },
);

test(
  'TC-12: Verify that empty request body returns "email is required"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"email" is required');
  },
);

test(
  'TC-13: Verify that invalid email format returns "Please enter valid email"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: 'not-an-email', password: process.env.LOGIN_PASSWORD },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Please enter valid email');
  },
);

test(
  'TC-14: Verify that SQL injection in login fields is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: "' OR 1=1 --", password: "' OR 1=1 --" },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeFalsy();
  },
);

// ---------- From the sheet "LMDmax Login – Test Cases" (TC_LOGIN_xxx, see docs/login-test-coverage.md) ----------

test(
  'TC-15: Verify that every invalid email format of the sheet returns "Please enter valid email" (TC_LOGIN_021)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const invalidEmails = [
      'abc',
      'abc@',
      '@yopmail.com',
      'abc@yopmail',
      'abc@@yopmail.com',
      'abc yopmail.com',
      'abc@.com',
    ];

    for (const email of invalidEmails) {
      const response = await request.post(endpoints.login, {
        data: { email, password: 'Test@123' },
      });
      await addToReport(response);

      expect(response.status(), 'status for ' + email).toBe(400);
      const body = await response.json();
      expect(body.message, 'message for ' + email).toBe(
        'Please enter valid email',
      );
    }
  },
);

test(
  'TC-16: Verify that an email of more than 255 characters is refused (TC_LOGIN_025)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: 'a'.repeat(250) + '@yopmail.com', password: 'Test@123' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Please enter valid email');
  },
);

test(
  'TC-17: Verify that a password of more than 200 characters returns "Invalid Credentials" (TC_LOGIN_039)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: process.env.LOGIN_EMAIL,
        password: 'P@1' + 'x'.repeat(200),
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid Credentials');
  },
);

test(
  'TC-18: Verify that unknown email and wrong password give the same answer (TC_LOGIN_024)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    // The answer must not tell whether an account exists
    const unknownEmail = await request.post(endpoints.login, {
      data: { email: 'notexist123@yopmail.com', password: 'Wrong@123' },
    });
    await addToReport(unknownEmail);
    const wrongPassword = await request.post(endpoints.login, {
      data: { email: process.env.LOGIN_EMAIL, password: 'Wrong@123' },
    });
    await addToReport(wrongPassword);

    expect(unknownEmail.status()).toBe(wrongPassword.status());
    const unknownBody = await unknownEmail.json();
    const wrongBody = await wrongPassword.json();
    expect(unknownBody.message).toBe(wrongBody.message);
  },
);

test(
  'TC-19: Verify that a password sent as an object (NoSQL injection) is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: { email: process.env.LOGIN_EMAIL, password: { $ne: '' } },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"password" must be a string');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-20: Verify that a script tag in the email is rejected',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.login, {
      data: {
        email: '<script>alert(1)</script>@yopmail.com',
        password: 'Test@123',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Please enter valid email');
  },
);

test(
  'TC-21: Verify that the password with a space before or after it is refused (TC_LOGIN_036) (BUG-API-026)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    for (const [where, password] of [
      ['space after', process.env.LOGIN_PASSWORD + ' '],
      ['space before', ' ' + process.env.LOGIN_PASSWORD],
    ]) {
      const response = await request.post(endpoints.login, {
        data: { email: process.env.LOGIN_EMAIL, password },
      });
      await addToReport(response);
      const body = await response.json();
      // While the bug is open this login works: end that session, so no extra session stays open
      await logOutIfLoggedIn(request, body);

      expect(response.status(), where).toBe(401);
      expect(body.message, where).toBe('Invalid Credentials');
    }
  },
);

// Ends the session of a login answer, if the login worked
async function logOutIfLoggedIn(request, loginBody) {
  if (!loginBody.data || !loginBody.data.token) return;
  await request.post(endpoints.logout, {
    headers: {
      'x-access-token': loginBody.data.token,
      'x-access-user': loginBody.data.account_id,
    },
  });
}
