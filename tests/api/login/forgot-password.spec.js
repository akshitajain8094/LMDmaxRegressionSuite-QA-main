const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');

// Forgot Password API ("Forgot Password?" on the sign-in screen):
// POST /lmd/usrsrv/users/v1/user/credentials/request → credentials/verify → credentials/reset
// Only addresses that reach nobody are used: a reset OTP to the test user would send a real email.

// ---------- Send OTP ----------

test(
  'TC-01: Verify that an unregistered email returns "user not found" (TC_LOGIN_077)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPassword, {
      data: { identifier: 'xyz_unreg_perf@yopmail.com' },
    });
    await addToReport(response);

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe('user not found');
    // No token: the next step (Verify) cannot start
    expect(body.data).toBeFalsy();
  },
);

test(
  'TC-02: Verify that the unregistered-email answer says it failed (TC_LOGIN_077) (BUG-API-027)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPassword, {
      data: { identifier: 'xyz_unreg_perf@yopmail.com' },
    });
    await addToReport(response);

    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-03: Verify that an invalid email returns "Invalid phone or email" (TC_LOGIN_078)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPassword, {
      data: { identifier: 'abc@' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe('Invalid phone or email');
  },
);

test(
  'TC-04: Verify that an empty email is refused (TC_LOGIN_078)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPassword, {
      data: { identifier: '' },
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"identifier" is not allowed to be empty');
  },
);

test(
  'TC-05: Verify that a missing email is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPassword, {
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"identifier" is required');
  },
);

// ---------- Verify OTP and Change Password ----------

test(
  'TC-06: Verify that a wrong OTP or token cannot verify the reset (TC_LOGIN_083)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPasswordVerify, {
      data: { otp: '000000', token: 'invalid-token' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-07: Verify that a wrong OTP or token cannot change the password (TC_LOGIN_083)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const response = await request.post(endpoints.resetPassword, {
      data: {
        otp: '000000',
        token: 'invalid-token',
        new_password: 'New@12345',
      },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);

test(
  'TC-08: Verify that Change Password without its details is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.resetPassword, {
      data: {},
    });
    await addToReport(response);

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('"token" is required');
  },
);

test(
  'TC-09: Verify that the wrong-OTP message is written correctly (BUG-API-014)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
    const response = await request.post(endpoints.forgotPasswordVerify, {
      data: { otp: '000000', token: 'invalid-token' },
    });
    await addToReport(response);

    const body = await response.json();
    // Today "Invalid  OTP", with two spaces
    expect(body.message).toBe('Invalid OTP');
  },
);
