const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');

// OTP login API ("Sign In With OTP"): POST /lmd/usrsrv/users/v1/login/otp → verify/otp (resend/otp)
// Reported Issue #1 of the sheet: an unregistered user must not get an OTP, nor log in with one.
// Only addresses that reach nobody are used: an OTP to the test user would send a real email (see the coverage doc).

// ---------- Reported Issue #1: unregistered user ----------

test(
  'TC-01: Verify that an unregistered email gets no OTP (TC_LOGIN_133)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, {
      data: { field: 'unreg_perf01@yopmail.com' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('user not found');
    // No token: the next step (Verify) cannot start
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-02: Verify that an unregistered mobile number gets no OTP (TC_LOGIN_134)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, {
      data: { field: '5550001234' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('user not found');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-03: Verify that upper case and spaces do not get an OTP for an unregistered email (TC_LOGIN_142)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, {
      data: { field: ' UNREG_PERF01@YOPMAIL.COM ' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('user not found');
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-04: Verify that Verify OTP gives no login for an unregistered email (TC_LOGIN_136)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLoginVerify, {
      data: {
        token: 'invalid-token',
        identifier: 'unreg_perf01@yopmail.com',
        otp: '000000',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-05: Verify that Resend OTP gives no OTP for an unregistered email',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLoginResend, {
      data: { token: 'invalid-token', identifier: 'unreg_perf01@yopmail.com' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeFalsy();
  },
);

// ---------- Missing or invalid input (400) ----------

test(
  'TC-06: Verify that an invalid email returns "invalid email"',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, {
      data: { field: 'abc@' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('invalid email');
  },
);

test(
  'TC-07: Verify that an empty email or mobile number is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, {
      data: { field: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"field" is not allowed to be empty');
  },
);

test(
  'TC-08: Verify that a missing email or mobile number is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLogin, { data: {} });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"field" is required');
  },
);

test(
  'TC-09: Verify that Verify OTP without its details is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.otpLoginVerify, {
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"identifier" is required');
  },
);
