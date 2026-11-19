const { test, expect } = require('@playwright/test');
const endpoints = require('../../../api/endpoints');
const addToReport = require('../../../api/report');

// Logout and sessions: POST /lmd/usrsrv/users/v1/user/logout (profile menu → Log Out)
// Each test logs in on its own: logging out the shared login of api/auth.js would log out every other test.

// Logs in and gives back the headers of this new session
async function newSession(request) {
  const response = await request.post(endpoints.login, {
    data: {
      email: process.env.LOGIN_EMAIL,
      password: process.env.LOGIN_PASSWORD,
    },
  });
  expect(response.status(), 'login').toBe(200);
  const body = await response.json();
  return {
    'x-access-token': body.data.token,
    'x-access-user': body.data.account_id,
  };
}

test(
  'TC-01: Verify that logout ends the session (TC_LOGIN_132)',
  { tag: ['@smoke', '@regression', '@pr'] },
  async ({ request }) => {
    const headers = await newSession(request);

    const response = await request.post(endpoints.logout, { headers });
    await addToReport(response);

    expect(response.status()).toBe(204);
  },
);

test(
  'TC-02: Verify that the token of a logged-out session is refused (TC_LOGIN_120)',
  { tag: ['@regression', '@pr'] },
  async ({ request }) => {
    const headers = await newSession(request);
    const before = await request.get(endpoints.profile, { headers });
    expect(before.status(), 'profile before logout').toBe(200);

    await request.post(endpoints.logout, { headers });

    // The users part of the server and the dashboard both refuse the old token
    const profile = await request.get(endpoints.profile, { headers });
    await addToReport(profile);
    expect(profile.status()).toBe(401);
    expect((await profile.json()).message).toBe(
      'Failed to authenticate token at Lv1',
    );

    const dashboard = await request.get(endpoints.dashboardData, {
      headers,
      params: { start: '2026-10-01', end: '2026-10-02' },
    });
    await addToReport(dashboard);
    expect(dashboard.status()).toBe(401);
  },
);

test(
  'TC-03: Verify that logging out a second time with the same token is refused',
  { tag: ['@regression'] },
  async ({ request }) => {
    const headers = await newSession(request);
    await request.post(endpoints.logout, { headers });

    const response = await request.post(endpoints.logout, { headers });
    await addToReport(response);

    expect(response.status()).toBe(401);
  },
);

test(
  'TC-04: Verify that logout without a token returns 401',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.post(endpoints.logout);
    await addToReport(response);

    // Answer in another form than the rest of the server: SUG-API-007
    expect(response.status()).toBe(401);
  },
);

test(
  'TC-05: Verify that the same user can be logged in twice, and logout ends only one session (TC_LOGIN_124)',
  { tag: ['@regression'] },
  async ({ request }) => {
    // Like Chrome and Edge at the same time: two logins give two different tokens
    const first = await newSession(request);
    const second = await newSession(request);
    expect(first['x-access-token']).not.toBe(second['x-access-token']);

    await request.post(endpoints.logout, { headers: first });

    const firstProfile = await request.get(endpoints.profile, {
      headers: first,
    });
    const secondProfile = await request.get(endpoints.profile, {
      headers: second,
    });
    await addToReport(secondProfile);
    expect(firstProfile.status(), 'logged-out session').toBe(401);
    expect(secondProfile.status(), 'other session').toBe(200);

    await request.post(endpoints.logout, { headers: second });
  },
);

test(
  'TC-06: Verify that a made-up token cannot open the profile (TC_LOGIN_060)',
  { tag: ['@regression'] },
  async ({ request }) => {
    const response = await request.get(endpoints.profile, {
      headers: { 'x-access-token': 'invalid-token', 'x-access-user': '1' },
    });
    await addToReport(response);

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  },
);
