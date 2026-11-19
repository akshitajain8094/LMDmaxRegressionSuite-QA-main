# LMDmax Regression Suite

Automated tests for the LMDmax web app and its API. They run on the **staging** environment.

- **API tests** send requests straight to the server (like Postman or curl) and check the answers.
- **UI tests** open Chrome, use the web app like a person would, and check what is on the screen.

The tests use [Playwright](https://playwright.dev), a free testing tool, and are written in
JavaScript. You do not need to be a programmer: most new tests are made by copying an existing test
and changing a few values.

## Words used in this guide

| Word          | Meaning                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **API**       | The server the web app talks to. Each API has an address, e.g. `/dashboard/v1/dashboard_data`. |
| **Test**      | A short script that does one thing (e.g. log in with a wrong password) and checks the result.  |
| **Assertion** | One check inside a test, written `expect(...)`. If it is not true, the test fails.             |
| **Tag**       | A label on a test, e.g. `@smoke`. Used to run a group of tests.                                |
| **Report**    | A web page that shows which tests passed or failed, and why.                                   |
| **CI**        | GitHub runs the tests by itself (on every pull request, every day, ...). See [CI](#ci).        |
| **Known bug** | A bug we found that is not fixed yet. Its tests fail on purpose until it is fixed.             |

## Setup (once)

1. Install [Node.js 22](https://nodejs.org) and [VS Code](https://code.visualstudio.com).
2. Open this folder in VS Code. Open a terminal (**Terminal → New Terminal**) and run:

   ```bash
   npm install                       # downloads the tools this project needs
   npx playwright install chromium   # downloads the browser for UI tests
   cp .env.example .env.staging      # creates your settings file
   ```

3. Open `.env.staging` and fill in `LOGIN_EMAIL` and `LOGIN_PASSWORD` (the test user). Keep
   `TEST_STATION_ID=541`: the tests are written for the data of station DYY1.
   This file holds a password, so git ignores it. Never share it.
4. When VS Code offers to install the recommended extensions (ESLint, Prettier, Playwright),
   click **Install**.
5. In VS Code, open the **Testing** view (the flask icon on the left). In its **Playwright** panel,
   check that **Run global setup on each run** is ticked. Then every run from VS Code starts with a
   fresh login, like in the terminal (see [Login once per run](#login-once-per-run)).

## Run the tests

| Command                   | What it runs                                                           |
| ------------------------- | ---------------------------------------------------------------------- |
| `npm test`                | All tests (API + UI), except `@adds-data`                              |
| `npm run test:api`        | API tests only, except `@adds-data`                                    |
| `npm run test:ui`         | UI tests only, except `@adds-data`                                     |
| `npm run test:headed`     | UI tests, with the browser visible on your screen, except `@adds-data` |
| `npm run test:smoke`      | Tests tagged `@smoke`                                                  |
| `npm run test:pr`         | Tests tagged `@pr`                                                     |
| `npm run test:regression` | Tests tagged `@regression` (every test)                                |
| `npm run test:knownbug`   | Tests tagged `@knownbug` (they fail on purpose)                        |

To run only part of the tests:

- One file: `npx playwright test tests/api/login/login.spec.js`
- One test: `npx playwright test tests/api/login/login.spec.js -g "TC-05"` (`-g` = "title contains")
- A test tagged `@adds-data`, on purpose (it adds data): name its file, e.g.
  `npx playwright test tests/ui/write-up-journey.spec.js --headed`
- The deleted-message chat tests (`@adds-data`): `npx playwright test --project=ui-chat`. They are in
  their own projects, `api-chat` and `ui-chat`, because the API and the UI file change the same
  conversations of the test driver: `ui-chat` starts when `api-chat` has finished. See
  [chat-deleted-message-coverage.md](docs/chat-deleted-message-coverage.md).
- In VS Code: click the green ▶ next to a test (needs the Playwright extension).

> **Right now 118 tests fail on purpose.** They show open bugs (see [Known bugs](#known-bugs)). Any
> **other** failure is new and needs a look. Run `npm run test:knownbug` to see only these:
>
> - **chat:** deleted message preview (API) TC-11 to TC-13; chat deleted message (UI) TC-06
> - **login (API):** login TC-21; forgot password TC-02 and TC-09; control tower TC-04
> - **login (UI):** login TC-04, TC-10, TC-18, TC-24 and TC-28; sign-in options TC-04 and TC-05;
>   session TC-07
> - **dashboard:** dashboard data TC-15, dashboard drivers TC-21 to TC-23, dashboard weekly TC-15
>   and TC-16, daily insights TC-17 to TC-20, weekly insights TC-12 to TC-19
> - **graph-data:** DSP scorecard graph TC-15 to TC-20, driver compare graph TC-14 to TC-19, driver
>   current graph TC-14 to TC-18; attendance, attendance extras, rescue and Netradyne dashboards
>   TC-13 and TC-14; delivery, EOC and e-Mentor dashboards TC-11 and TC-12; quality dashboard TC-11
>   to TC-13
> - **drivers:** add driver TC-16 to TC-21; driver lifecycle TC-14 and TC-15; driver lifecycle journeys
>   TC-05 to TC-12
> - **e-signature:** write-up journeys TC-05 and TC-06; acknowledgement journeys TC-03
> - **call-outs:** call-out TC-08 to TC-10, TC-16, TC-17, TC-20 and TC-21; call-out journeys TC-06
> - **leaderboard:** leaderboard dashboard TC-10
> - **rescues:** rescue TC-05 to TC-07, TC-13 to TC-15, TC-18 and TC-19; rescue journeys TC-04 to
>   TC-06
> - **settings:** threshold journeys TC-02 and TC-03
> - **scorecard:** driver scorecard TC-06, TC-07, TC-11 to TC-13, TC-18, TC-19 and TC-26; driver
>   scorecard journeys TC-06

Tests run at the same time (in parallel), so a full run takes about a minute.

## Read the results

The terminal shows ✓ (passed) or ✘ (failed) for each test, then the error of each failed test:

```
✘ TC-15: Verify that missing start and end are rejected (BUG-API-001) @regression @knownbug
    Expected: 400
    Received: 200
```

**Expected** is what the test wanted. **Received** is what the app really returned.

Every run also creates two reports (web pages):

| Report          | Open it with     | Good for                                            |
| --------------- | ---------------- | --------------------------------------------------- |
| Playwright HTML | `npm run report` | Each test with its steps and its error              |
| Allure          | `npm run allure` | An overview with charts, handy to share with others |

For a failed test, both reports also have a **screenshot** (UI tests) and a **trace**: a
step-by-step replay of the test. Open the trace and click through the steps to see what happened.
The report opens in your browser. Press `Ctrl+C` in the terminal when you are done with it.

Every API test also has an **API call** attachment (in Allure: open the test → **Test body** →
**API call**): the address with its parameters, the status and the answer. Tokens and personal
data (email, phone, address, date of birth) are shown as `*** hidden ***`.

## Folders

```
tests/api/login/      Login API tests (login, session = logout, otp-login, forgot-password,
                      control-tower)
tests/api/dashboard/  Dashboard API tests (dashboard-data, dashboard-drivers, dashboard-data-weekly,
                      daily-insights, weekly-insights)
tests/api/graph-data/ Graph API tests, one file per API: dsp-scorecard-graph,
                      driver-compare-scorecard-graph, driver-current-scorecard-graph and the
                      8 dashboards (attendance, attendance-extras, rescue, netradyne, delivery,
                      quality, eoc, e-mentor)
tests/api/leaderboard/ Leaderboard API tests (leaderboard-dashboard, leaderboard-insights)
tests/api/drivers/    Driver API tests (add-driver, driver-lifecycle, driver-lifecycle-journeys)
tests/api/e-signature/ Write-up and acknowledgement (E-Signature) API tests (write-up,
                      write-up-journeys, acknowledgement-journeys)
tests/api/call-outs/  Call-out API tests (call-out, call-out-journeys)
tests/api/rescues/    Rescue API tests (rescue, rescue-journeys)
tests/api/settings/   Settings API tests: Set Threshold (thresholds, threshold-journeys) and
                      Rate your Drivers (driver-ratings)
tests/api/scorecard/  Driver scorecard API tests: the Weekly tab of the driver page and the Driver
                      Rating History (driver-scorecard, driver-scorecard-journeys)
tests/api/chat/       In-app chat API tests: deleted message preview (deleted-message-preview)
tests/ui/             UI tests (login.spec.js, sign-in-options.spec.js, session.spec.js,
                      dashboard.spec.js, write-up-journey.spec.js, call-out-journey.spec.js,
                      driver-suspension-journey.spec.js, rescue-journey.spec.js,
                      driver-scorecard-journey.spec.js, chat-deleted-message.spec.js)
api/endpoints.js      The address of every API, in one place
api/auth.js           loginAsTestUser(): the test user's login; loginAs(): another user's login
                      (e.g. a second admin), with the test station selected
api/chat.js           The in-app chat (Paya Chat, Individual Chat): send, upload, delete, read
api/schema.js         getSchemaErrors(): compares a response with its schema
api/report.js         addToReport(): adds an API call to the report, with secrets hidden
api/dates.js          daysAgo(): a day as the API expects it ("YYYY-MM-DD"), e.g. yesterday
schemas/              The expected shape of each API response (see "Schema tests")
pages/                One file per screen: its elements and actions (LoginPage.js,
                      ProfileMenu.js, InAppChatPage.js, ESignaturePage.js, SignWriteUpPage.js,
                      CallOutsPage.js, LeaderboardPage.js, RescuePage.js, DriverWeeklyPage.js)
test-files/           Files the tests upload (the driver's signature image)
docs/known-bugs/      Details of every known bug
docs/login-test-coverage.md  Which test checks each case of the login test sheet (TC_LOGIN_xxx)
docs/chat-deleted-message-coverage.md  The same for the deleted-message sheet, with the driver-app
                      checklist for manual testing
.env.example          Template for your settings file
.env.staging          Your settings: addresses and test login (never commit or share it)
playwright.config.js  Playwright settings: where the tests are, browser, reports
global-setup.js       Before each run: deletes the old Allure results, logs in once, selects the station
.github/workflows/    CI settings (see "CI")

playwright-report/, allure-results/, test-results/   Made by each run (reports, screenshots,
                                                     traces). Git ignores them.
```

## How a test is written

This is a complete test from `tests/api/login/login.spec.js`:

```js
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
```

A test has three parts:

1. **Title:** the test ID and what it checks.
2. **Tags:** the groups the test belongs to (see [Tags](#tags)).
3. **Steps:** everything inside `async ({ request }) => { ... }`. `request` is Playwright's tool
   for calling APIs. UI tests get `page` instead: a browser tab.

The steps send a POST request to the login API with a JSON body, add the call to the report, then
check the answer.
`process.env.LOGIN_EMAIL` is the `LOGIN_EMAIL` value from your `.env.staging` file.
Each `expect(...)` line is one check. The first check that is not true stops the test and marks it
failed.

| Code                                                   | Meaning                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `await`                                                | Wait for this step to finish. Needed before requests, page actions and `expect(page)`.                                          |
| `request.post(address, { data })`                      | Send a POST request with a JSON body                                                                                            |
| `request.patch(address, { data })`                     | Send a PATCH request: change existing data (e.g. a driver's status)                                                             |
| `request.delete(address, { headers, params })`         | Send a DELETE request: remove data, e.g. a call-out (`params` say which one)                                                    |
| `daysAgo(2)`                                           | The day 2 days ago as `YYYY-MM-DD` (from `api/dates.js`). Each call-out test uses its own day                                   |
| `'client-time-zone': 'America/New_York'`               | In `headers`: the time zone of the manager's browser, as the web app sends it                                                   |
| `test.describe.configure({ mode: 'default' })`         | At the top of a file: its tests run one after another, not at the same time (e.g. because they all change the same test driver) |
| `list.data.filter((item) => item.driver_id === 38267)` | A new list with only the items that match, e.g. Jordan Whitaker's call-outs                                                     |
| `for (const item of list) { ... }`                     | Do the steps inside `{ }` once for every item of `list`, e.g. delete each call-out                                              |
| `page.reload()`                                        | Load the page again in a UI test, to see what the server saved                                                                  |
| `toContainText('Sick')` / `toHaveCount(0)`             | UI checks: the text contains `Sick` / nothing on the page matches (e.g. the row is gone)                                        |
| `multipart: { ... }`                                   | Send the fields as a form (like a web form), not as JSON                                                                        |
| `file: { name, mimeType, buffer }`                     | Inside `multipart`: upload a file, e.g. the driver's signature image (`fs.readFileSync` reads it)                               |
| `browser.newPage({ viewport: ... })`                   | A second browser window in a UI test, e.g. the driver's phone next to the manager                                               |
| `faker.person.firstName()`                             | A realistic first name, different every run (from the faker library)                                                            |
| `body.data.find((driver) => driver.id === '38267')`    | The driver with id `38267` from the list (only that one, so a failure does not print the others)                                |
| `toBe(null)`                                           | Has no value yet (e.g. a new driver has no rating)                                                                              |
| `request.get(address, { headers, params })`            | Send a GET request. `params` are added to the address after `?`                                                                 |
| `await addToReport(response);`                         | Add the call (address, status, answer) to the report, with secrets hidden                                                       |
| `response.status()`                                    | The status code: 200 OK, 400 bad input, 401 not logged in, 404 not found                                                        |
| `const body = await response.json();`                  | Read the JSON answer. Then `body.data.token` is the `token` inside `data`.                                                      |
| `expect(a).toBe(b)`                                    | `a` must be equal to `b`                                                                                                        |
| `toEqual([...])`                                       | Like `toBe`, but for lists                                                                                                      |
| `toBeTruthy()` / `toBeFalsy()`                         | Has a value / has no value (missing, `null`, `false`, `0` or `''`)                                                              |
| `toHaveProperty('dcr')`                                | The object has a field called `dcr`                                                                                             |
| `toBeGreaterThan(0)`                                   | Must be more than 0                                                                                                             |
| `Array.isArray(body.data)`                             | `true` if `body.data` is a list                                                                                                 |
| `body.data.quality[0]`                                 | The first item of the list `quality` (`[1]` is the second, ...)                                                                 |
| `typeof x`                                             | The kind of value `x` is: `'number'`, `'string'`, `'boolean'`, ...                                                              |
| `body.data['202634']`                                  | The value named `202634` (names made of digits need `['...']` instead of a dot)                                                 |
| `toHaveLength(10)`                                     | The list has exactly 10 items                                                                                                   |
| `body.data.map((driver) => driver.rank)`               | A new list with only the `rank` of every item in `body.data`, e.g. `[null, 2, 3]`                                               |
| `expect(list).toContain(1)`                            | The list contains the value `1`                                                                                                 |
| `expect(text).not.toContain('abc')`                    | The text must **not** contain `abc`                                                                                             |
| `toBeCloseTo(10, 5)`                                   | Almost equal to 10: the same up to 5 decimals (adding decimals can give `9.999999999999998`)                                    |
| `list.some((item) => ...)`                             | `true` if at least one item of the list matches                                                                                 |
| `condition ? a : b`                                    | If the condition is true, `a`, else `b`. E.g. change only the FICO score and keep every other metric as it is                   |
| `{ ...metric, values: [...] }`                         | A copy of `metric` with new `values` (the other fields stay the same)                                                           |
| `expect(value, 'rating of driver 38267')`              | The text is shown when the check fails, so you know which item failed                                                           |
| `toMatchObject({ ... })`                               | The object has at least these fields and values. `expect.any(Number)` = any number                                              |
| `/dashboard/`                                          | A pattern that means "contains the word dashboard"                                                                              |
| `// ...`                                               | A comment: a note for people, ignored when the test runs                                                                        |

## Add an API test

1. If the API is new, add its address to `api/endpoints.js`, e.g. `driverList: '/driver/v1/list',`.
2. Tests are grouped by area in `tests/api/` (`login/`, `dashboard/`), one file per API (e.g.
   `dashboard/dashboard-drivers.spec.js`). Open the file of your API. For a new area, create a
   new folder with a test file, e.g. `tests/api/drivers/drivers.spec.js`, and copy the `require` lines from the top of an existing
   test file. (`require` loads another file, so this file can use it. `npm run lint` tells you if
   one is not used, so you can delete it.)
3. Copy the existing test that is most like yours and paste it at the end of the file:
   - a POST with a JSON body: TC-05 in `tests/api/login/login.spec.js`
   - an API that needs login: TC-01 in `tests/api/dashboard/dashboard-data.spec.js`
4. Change the ID (the next free number in that file), the title, the tags, the request and the
   expected values.
5. Run it: `npx playwright test tests/api/drivers/drivers.spec.js -g "TC-01"`.

### APIs that need login

Most APIs need two headers, both taken from the login response:

| Header           | Value                   |
| ---------------- | ----------------------- |
| `x-access-token` | `token` from login      |
| `x-access-user`  | `account_id` from login |

`loginAsTestUser()` (in `api/auth.js`) gives back the login of the test user. The test then sends
both headers itself:

```js
const user = await loginAsTestUser();

const response = await request.get(endpoints.dashboardData, {
  headers: { 'x-access-token': user.token, 'x-access-user': user.account_id },
  params: { start: '2025-09-01', end: '2026-08-31' },
});
await addToReport(response);
```

This is the same request as this curl:

```bash
curl 'https://staging-api.fleet.lmdmax.com/dashboard/v1/dashboard_data?start=2025-09-01&end=2026-08-31' \
  -H 'x-access-token: <token from login>' \
  -H 'x-access-user: <account_id from login>'
```

Every API request also sends the headers `app-type`, `client-time-zone` and `Origin`, like the web
app does. They are set once in `playwright.config.js`.

### Login once per run

Before the first test starts, `global-setup.js`:

1. logs in once as the test user, and
2. selects station DYY1 (`TEST_STATION_ID=541`), like **Select Station** in the web app.

Every test then reuses this login through `loginAsTestUser()`. Why:

- **Staging allows 200 logins per 10 minutes** (ENV-001). A full run now uses about 20 logins
  (the one above, the login API tests and the UI tests) instead of about 150.
- **A login opens the station the account used last.** The test account can open 5 stations, and
  the expected values in the tests (drivers, weeks, write-ups) are from station DYY1. If someone
  picks another station in the web app with this account, the tests would get other data.
  Selecting the station first makes every run use the same data (ENV-002).

If the login or the station selection fails, no test runs and the terminal shows why (see
[When something goes wrong](#when-something-goes-wrong)).

> **Tip:** to see exactly what the web app sends, log in, open DevTools → **Network** tab,
> right-click a request → **Copy as cURL**. Swagger is not always right: some parameter names and
> paths are wrong (BUG-API-011, BUG-API-012). Always check the real request before writing tests.
> In Swagger, click **Authorize** and fill **both** fields: `x-access-token` and `x-access-user`.

## Add a UI test

UI tests use **page files** in `pages/`. A page file says where the elements of one screen are
(e.g. the email box) and which actions a user can do there (e.g. `login(email, password)`).
Tests then read like steps: `await loginPage.login(...)`.

1. If the screen is new, create `pages/<Screen>Page.js` by copying `pages/LoginPage.js`.
   To find the elements, run `npx playwright codegen https://staging.performance.lmdmax.com`.
   Click around in the browser that opens, and Playwright writes the matching code for you.
2. Copy `tests/ui/dashboard.spec.js` to a new file in `tests/ui/`. Change the title, the tags and
   the steps. Keep the "Log in first" lines: every UI test starts logged out.
   For a journey of two people (a manager and a driver), open a second window with
   `browser.newPage()`, like `tests/ui/write-up-journey.spec.js`. To check what the server saved,
   reload the page (`page.reload()`), like `tests/ui/call-out-journey.spec.js`.
3. Run it and watch the browser: `npx playwright test tests/ui/<file>.spec.js --headed`.

## Rules for every test

- **A test must work on its own.** Tests run at the same time and in any order, so a test must
  never depend on another test. Only the login is shared (see
  [Login once per run](#login-once-per-run)).
- **Write `await`** before requests, page actions (`page.goto`, `click`, `fill`) and
  `expect(page)`. `npm run lint` finds a missing `await` before `expect`, but **not** before page
  actions.
- **Every test has** a TC ID that is unique in its file, a title that starts with
  "Verify that ...", and tags.
- **Never leave `test.only` in a file.** It makes Playwright run only that test. `npm run lint`
  reports it as an error.
- **Never let personal data into the reports.** When a check fails, Playwright prints the value it
  checked, and the CI reports can be downloaded by anyone with access to the repo. For a list of
  people (drivers, users), first take only the field you need, then check it:
  `const ranks = body.data.map((driver) => driver.rank);` then `expect(ranks).toContain(1);`.
  Never `expect(body.data)` on a whole list of people.
- **Most tests must not save data.** A driver or a signed write-up, for example, cannot be deleted
  in the web app. A test that has to add data gets the `@adds-data` tag, uses realistic values (a
  faker name, a yopmail email, a phone with area code 555, the test driver Jordan Whitaker) and
  cleans up what it can (deactivates a driver, deletes an unsigned write-up, a call-out or a
  rescue). A test that saves data on a day uses its own day (`daysAgo(...)`), so tests running at the
  same time never touch the same day. The call-out tests use station DYY1's call-out types Sick, Personal Emergency,
  Car Trouble, No Call No Show and Paid Time Off (added for the tests on 2026-09-25). The driver
  lifecycle tests change their own test drivers, Riley Thompson (API tests) and Morgan Ellis (UI
  test), and put them back the way they were. The rescue tests use the test driver Casey Brooks as
  the rescuer of Jordan Whitaker. The threshold journeys change the station's Scorecard thresholds for
  a moment and put them back at once, one test after another. The driver scorecard tests only read:
  they use driver 36363, a staging driver of DYY1 with scorecards in weeks 31, 32 and 34 of 2026.
  Other tests send the details of an existing driver (Jordan Whitaker, added through the web app), so
  a missing check answers "already exists" instead of saving a driver.

## Tags

| Tag           | When it runs                                                        | Which tests                                                                                                                                                                                                                                   |
| ------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@smoke`      | Every push to `main`: "is the app alive?"                           | The main happy path of each feature                                                                                                                                                                                                           |
| `@pr`         | Every pull request: fast but meaningful                             | Happy paths, schema, key negative cases                                                                                                                                                                                                       |
| `@regression` | Every day, and before a release                                     | Every test                                                                                                                                                                                                                                    |
| `@knownbug`   | Only when you ask for it                                            | Tests that fail because of an open bug                                                                                                                                                                                                        |
| `@adds-data`  | Every day (it is also `@regression`), or when you run it on purpose | Tests that save data: drivers, signed write-ups and signed acknowledgements (they stay), call-outs and rescues (deleted at the end of the test), thresholds (put back at once). `npm test`, `test:api`, `test:ui` and `test:headed` skip them |

Tags go in the second part of a test, e.g. `{ tag: ['@regression', '@pr'] }`. Every test gets
`@regression`. `npm run test:pr` runs every test that has `@pr` among its tags.

## Known bugs

A known-bug test checks the **correct** behaviour, so it **fails** until the bug is fixed. It is
never skipped: when the developers fix the bug, the test starts to pass and tells us.

A known-bug test has the bug ID at the end of its title and the `@knownbug` tag:

```js
test(
  'TC-15: Verify that missing start and end are rejected (BUG-API-001)',
  { tag: ['@regression', '@knownbug'] },
  async ({ request }) => {
```

**Found a new bug?**

1. Add it to `docs/known-bugs/api-bugs.md` or `docs/known-bugs/ui-bugs.md` (each file ends with a
   template).
2. Write it so that everybody can understand it, also a BA who does not know the code: simple
   words, a summary, the steps on the screen (menu → page → button), the expected result, the actual
   result and the business impact. Requests and answers go under "Technical details".
3. Write a test for the correct behaviour. Add `@knownbug` to its tags and the bug ID to its title.

**A bug was fixed?** Run `npm run test:knownbug`, or only the bug's tests, for example
`npx playwright test --grep "BUG-API-022"`. For each test that now passes, remove `@knownbug` and the
bug ID from it. Then set the bug's **Status** to Fixed in the docs.

Open bugs: [API bugs](docs/known-bugs/api-bugs.md) · [UI bugs](docs/known-bugs/ui-bugs.md)

## Schema tests

A **schema** describes the expected shape of an API response: which fields must be there
(`required`) and what kind of value each one holds (`type`: `string`, `number`, `boolean`,
`object` or `array`). The schemas are in `schemas/`.

TC-02 of each API test file compares the real response with its schema:

```js
expect(getSchemaErrors(body, loginSchema)).toBe('No errors');
```

If a field is missing or has the wrong type, the test fails and lists every difference
(`-` is what the test expected, `+` is what it found):

```
- No errors
+ response/data/safety/Braking/total must be number
+ response/data/team must have required property 'rescue'
```

When the API changes **on purpose**, update the schema file.

## Code quality (ESLint and Prettier)

- **ESLint** finds mistakes, like a missing `await` or a forgotten `test.only`.
- **Prettier** lays out the code the same way everywhere (spaces, quotes, line breaks).

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run lint`         | Find mistakes                               |
| `npm run lint:fix`     | Fix the mistakes ESLint can fix by itself   |
| `npm run format`       | Lay out all files with Prettier             |
| `npm run format:check` | Check the layout, without changing any file |

With the recommended VS Code extensions, a file is laid out automatically every time you save it.
Before you push, run `npm run lint` and `npm run format:check`: CI runs both and stops if one
fails. Fix every **error**. **Warnings** are advice.

## CI

`.github/workflows/tests.yml` tells GitHub what to run: first lint and the format check, then the
tests.

| When                                         | Tests         |
| -------------------------------------------- | ------------- |
| Pull request to `main`                       | `@pr`         |
| Push to `main`                               | `@smoke`      |
| Every day at 08:00 IST                       | `@regression` |
| Manually: **Actions → Tests → Run workflow** | You choose    |

- The daily `@regression` run includes the known-bug tests, so it stays red until they are fixed.
- On CI a failed test is run one more time before it counts as failed.
- CI reports have the same traces and API calls as on your computer. A trace can contain the
  test user's token or password, so **keep the repo private**: anyone with access to the repo can
  download the reports.
- **Reports:** open the run → **Artifacts** → download `reports-<number>` and unzip it. Then
  double-click `allure-report/index.html` or `playwright-report/index.html`.
- **Login:** the repo secrets `LOGIN_EMAIL` and `LOGIN_PASSWORD`
  (**Settings → Secrets and variables → Actions**). The addresses and the station are in the
  workflow file.

## Other environments

Create `.env.<name>` from `.env.example` (e.g. `.env.qa`) with the addresses, login and station of
that environment, then run with `TEST_ENV=<name>`:

```bash
TEST_ENV=qa npm test
```

## When something goes wrong

| Message                                                      | What to do                                                                                      |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `LOGIN_EMAIL not set. Create .env.staging from .env.example` | Do steps 2 and 3 of [Setup](#setup-once)                                                        |
| `Login failed with status 401 ...`                           | The test user cannot log in: check `LOGIN_EMAIL` and `LOGIN_PASSWORD` in `.env.staging`         |
| `Login failed with status 429 ...`                           | Too many logins: staging allows 200 per 10 minutes (ENV-001). Wait 10 minutes, then run again   |
| `Could not select station ...`                               | Check `TEST_STATION_ID` in `.env.staging` (`541` = station DYY1)                                |
| Add driver TC-01: `409` `"Similar drivers found"`            | faker picked a name close to an existing driver's name. Run the test again: it picks a new name |
| `Executable doesn't exist ...`                               | Run `npx playwright install chromium`                                                           |
| A UI test fails and you cannot see why                       | Run it with `--headed`, or open its trace                                                       |
