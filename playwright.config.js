const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Settings come from .env.staging (or .env.<TEST_ENV>). On CI they come from GitHub secrets.
const envName = process.env.TEST_ENV || 'staging';
const envFile = path.join(__dirname, '.env.' + envName);
if (fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
if (!process.env.LOGIN_EMAIL) {
  throw new Error(
    'LOGIN_EMAIL not set. Create .env.' + envName + ' from .env.example',
  );
}

// API tests: the server address and the headers the web app sends with every request
const apiSettings = {
  baseURL: process.env.API_BASE_URL, // the paths in api/endpoints.js are added to this
  extraHTTPHeaders: {
    'app-type': '2',
    'client-time-zone': 'Asia/Calcutta',
    Origin: process.env.UI_BASE_URL,
  },
};

// UI tests: UI journeys go through several screens (login, wizard, a second window). With the browser
// visible and many tests at the same time, the screens are slower: 90 s per test, 15 s per check.
const uiSettings = {
  timeout: 90 * 1000,
  expect: { timeout: 15 * 1000 },
  use: {
    ...devices['Desktop Chrome'], // a normal desktop Chrome window
    baseURL: process.env.UI_BASE_URL, // page.goto('/') opens this address
  },
};

// The chat tests that must run one after the other (see the projects below)
const chatTests = {
  api: '**/chat/deleted-message-preview.spec.js',
  ui: '**/chat-deleted-message.spec.js',
};

// The announcement tests: they send announcements on one station and check counts and "newest first",
// so they run one at a time, the UI file after the API file
const announcementTests = {
  api: '**/announcements/*.spec.js',
  ui: ['**/announcements.spec.js', '**/announcements/*.spec.js'], // the main file and the role file
};

// The Rehire & conflict tests: they add new drivers in two DSPs (REHIRE_* in .env), so they run only when
// asked for (--project=api-rehire / ui-rehire), not with the daily regression. The Super Admin tests in
// them only look (view only).
const rehireTests = { api: '**/rehire/*.spec.js', ui: '**/rehire/*.spec.js' };

// The report upload tests (Workflow): they upload into the same week of the report station (REPORT_* in .env)
// and cannot delete what they upload, so they run only when asked for (--project=api-reports / ui-reports), one
// test at a time and in the order of the file, the UI file after the API file.
const reportTests = { api: '**/reports/*.spec.js', ui: '**/reports/*.spec.js' };

// The SMS / Twilio chat tests (tests/ui/sms): some send real SMS (only to SMS_DRIVERS, and only with SMS_SEND=1),
// create a broadcast or group and change pins, so they run only when asked for (--project=ui-sms), one at a time.
const smsTests = '**/sms/*.spec.js';

module.exports = defineConfig({
  globalSetup: './global-setup.js', // before the run: clears old Allure results, logs in once, selects the station
  fullyParallel: true, // run tests at the same time, also the tests inside one file
  retries: process.env.CI ? 1 : 0, // on CI, run a failed test one more time
  reporter: [
    ['list'], // progress in the terminal
    ['html', { open: 'never' }], // Playwright report -> npm run report
    ['allure-playwright', { resultsDir: 'allure-results' }], // Allure report -> npm run allure
  ],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure', // step-by-step replay of a failed test (keep the repo private)
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      testIgnore: [chatTests.api, announcementTests.api, rehireTests.api, reportTests.api],
      use: apiSettings,
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      testIgnore: [chatTests.ui, ...announcementTests.ui, rehireTests.ui, reportTests.ui, smsTests],
      ...uiSettings,
    },
    // The deleted-message chat tests (API and UI) change the same conversations of the test driver Jordan
    // Whitaker, so they must not run at the same time: the UI file starts when the API file has finished.
    {
      name: 'api-chat',
      testDir: './tests/api',
      testMatch: chatTests.api,
      use: apiSettings,
    },
    {
      name: 'ui-chat',
      testDir: './tests/ui',
      testMatch: chatTests.ui,
      dependencies: ['api-chat'],
      ...uiSettings,
    },
    {
      name: 'api-announcements',
      testDir: './tests/api',
      testMatch: announcementTests.api,
      workers: 1,
      use: apiSettings,
    },
    {
      name: 'ui-announcements',
      testDir: './tests/ui',
      testMatch: announcementTests.ui,
      dependencies: ['api-announcements'],
      workers: 1,
      ...uiSettings,
    },
    {
      name: 'api-rehire',
      testDir: './tests/api',
      testMatch: rehireTests.api,
      use: apiSettings,
    },
    {
      name: 'ui-rehire',
      testDir: './tests/ui',
      testMatch: rehireTests.ui,
      ...uiSettings,
    },
    {
      name: 'api-reports',
      testDir: './tests/api',
      testMatch: reportTests.api,
      fullyParallel: false,
      workers: 1,
      timeout: 5 * 60 * 1000, // each upload reads the whole PDF on the server
      use: apiSettings,
    },
    {
      name: 'ui-reports',
      testDir: './tests/ui',
      testMatch: reportTests.ui,
      dependencies: ['api-reports'],
      fullyParallel: false,
      workers: 1,
      ...uiSettings,
      timeout: 5 * 60 * 1000,
    },
    {
      name: 'ui-sms',
      testDir: './tests/ui',
      testMatch: smsTests,
      fullyParallel: false,
      workers: 1,
      ...uiSettings,
      timeout: 3 * 60 * 1000, // waits for Twilio's delivery status
    },
  ],
});
