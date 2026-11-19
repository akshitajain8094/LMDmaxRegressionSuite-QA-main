const { test, request: playwrightRequest } = require('@playwright/test');
const endpoints = require('./endpoints');

// Gives a test the login of the test user (token and account_id)
async function loginAsTestUser() {
  // Shown as one step "Log in as the test user" in the reports
  return test.step('Log in as the test user', async () => {
    // global-setup.js logged in once for the whole run: every test reuses that login
    return {
      token: process.env.TEST_USER_TOKEN,
      account_id: process.env.TEST_USER_ACCOUNT_ID,
    };
  });
}

// Logs in as another user (e.g. a second admin) and selects a station (the test station unless given), like global-setup.js.
// who: the name of the user in the report and in the error, e.g. 'ADMIN_B'
async function loginAs(
  who,
  email,
  password,
  stationId = process.env.TEST_STATION_ID,
) {
  return test.step('Log in as ' + who, async () => {
    const api = await playwrightRequest.newContext({
      baseURL: process.env.API_BASE_URL,
      extraHTTPHeaders: { 'app-type': '2', Origin: process.env.UI_BASE_URL },
    });
    const login = await api.post(endpoints.login, {
      data: { email, password },
    });
    if (login.status() !== 200) {
      throw new Error(
        who +
          ' cannot log in (status ' +
          login.status() +
          '). Check ' +
          who +
          '_EMAIL and ' +
          who +
          '_PASSWORD.',
      );
    }
    const loginData = (await login.json()).data;
    const station = await api.get(endpoints.selectStation + stationId, {
      headers: {
        'x-access-token': loginData.token,
        'x-access-user': loginData.account_id,
      },
    });
    if (station.status() !== 200) {
      throw new Error(
        who +
          ' has no access to station ' +
          stationId +
          ' (status ' +
          station.status() +
          '). An owner must add this user to the station.',
      );
    }
    const stationData = (await station.json()).data;
    await api.dispose();
    return {
      token: stationData.token,
      account_id: stationData.account_id,
      user_id: loginData.user_id, // the user's id in the chat (deleted_by, my_id)
    };
  });
}

module.exports = loginAsTestUser;
module.exports.loginAs = loginAs;
