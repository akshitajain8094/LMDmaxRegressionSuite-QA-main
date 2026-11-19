// Rehire & conflict handling: when an admin adds a driver whose email, phone or transporter ID is already used,
// Add Driver (POST /lmd/usrsrv/drivers/v1/driver) answers 409 with the conflict instead of saving:
//   data.conflicted[]: one entry per existing user it clashes with: conflict_type ('same_company' or
//   'cross_company'), conflict_kind (e.g. 'driver_same_station'), matched_on (['email', 'phone', ...]),
//   role / user_type, status ('active' / 'inactive'), id, company_id
// A similar name (fuzzy match) answers 409 "Similar drivers found" with data.fuzzy_matches[].
// "Company" in the requirement = a DSP (company_ownership_id). The tests use two DSPs (REHIRE_* in .env):
// A = Brothers (station ABC), B = earthhh (station TTT). Requests to the Super Admin are never sent.
const { test } = require('@playwright/test');
const { faker } = require('@faker-js/faker');
const { loginAs } = require('./auth');
const endpoints = require('./endpoints');
const addToReport = require('./report');

// Logs in to company 'A' or 'B' (its owner and station). Logs in once per worker and company.
const logins = {};
async function login(company) {
  const who = 'REHIRE_' + company;
  logins[company] ??= await loginAs(
    who,
    process.env[who + '_EMAIL'],
    process.env[who + '_PASSWORD'],
    process.env[who + '_STATION_ID'],
  );
  return logins[company];
}

const stationOf = (company) => process.env['REHIRE_' + company + '_STATION_ID'];

// The owner of company 'A' or 'B': { id, name, email, phone } (from "Go To Profile")
const owners = {};
async function ownerOf(request, company) {
  if (owners[company]) return owners[company];
  const user = await login(company);
  const response = await request.get(endpoints.profile, {
    headers: headersOf(user),
  });
  const body = await bodyOf(response);
  if (response.status() !== 200 || !body.data) {
    throw new Error(
      'Reading the owner of company ' + company + ': ' + response.status(),
    );
  }
  owners[company] = {
    id: String(user.user_id),
    name: body.data.name,
    email: process.env['REHIRE_' + company + '_EMAIL'],
    phone: body.data.phone,
  };
  return owners[company];
}

const headersOf = (user) => ({
  'x-access-token': user.token,
  'x-access-user': user.account_id,
});

// The body of an answer (success, message, data); {} when it is not JSON
async function bodyOf(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// New driver details nobody has yet: realistic name, a yopmail inbox and a 555 phone (no real person gets
// an email or SMS), an Amazon-like transporter ID. fields replace any of them.
let counter = 0;
function newDriverDetails(company, fields = {}) {
  counter += 1;
  const run = String(Date.now()).slice(-6) + String(counter).padStart(2, '0');
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: firstName + ' ' + lastName,
    transporter_id:
      'AQR' + run + faker.string.alphanumeric({ length: 3, casing: 'upper' }),
    email:
      'qa.rehire.' +
      (firstName + '.' + lastName).toLowerCase().replace(/[^a-z.]/g, '') +
      '.' +
      run +
      '@yopmail.com',
    // Random: drivers of earlier runs keep their phones (inactive), a time-based number would repeat
    phone: '555' + faker.string.numeric({ length: 7, allowLeadingZeros: true }),
    netradyne_id: '',
    address: '1 QA Street, Kansas City, MO 64106',
    hire_date: today,
    status: 'active',
    date_of_birth: null,
    work_anniversary: today,
    station_code: [stationOf(company)],
    ...fields,
  };
}

// Addresses that are not in api/endpoints.js
const paths = {
  addAdmin: '/lmd/usrsrv/users/v2/admin',
  promotion: '/lmd/usrsrv/users/v1/user_promotion',
};

// The fields the web app sends when a popup updates an existing driver (Reactivate / Update & Resolve)
const rehireFields = (d) => ({
  name: d.name,
  transporter_id: d.transporter_id,
  email: d.email,
  phone: d.phone,
  hire_date: d.hire_date,
  status: 'active',
  station_code: d.station_code,
});

// The raw calls: each returns the response, so a test can check any status
const api = {
  add: (request, user, details) =>
    request.post(endpoints.addDriver, {
      headers: headersOf(user),
      data: details,
    }),
  // Edit (driver profile → Edit → Save). The conflict window's "go on" sends conflict_resolved: true;
  // without it, the server answers a clash with 409.
  edit: (request, user, id, fields) =>
    request.patch(endpoints.editDriver + id, {
      headers: headersOf(user),
      data: fields,
    }),
  // The rehire popup "This driver already exists … inactive driver account" → Reactivate & Resolve: the old
  // record gets the new details and becomes active (no new driver)
  reactivate: (request, user, id, details) =>
    request.patch(endpoints.editDriver + id, {
      headers: headersOf(user),
      data: { ...rehireFields(details), skip_similar_driver: true },
    }),
  // The similar-names popup → pick a driver → Update & Resolve: that driver gets the new details
  updateSimilar: (request, user, id, details) =>
    request.patch(endpoints.editDriver + id, {
      headers: headersOf(user),
      data: {
        ...rehireFields(details),
        skip_similar_driver: true,
        is_bypass_conflict: true,
      },
    }),
  // Edit Driver with sign-in ("LMD Drive App" access): refused while a cross-company conflict is open
  grantSignin: (request, user, id, stationCode) =>
    request.patch(endpoints.editDriver + id, {
      headers: headersOf(user),
      data: { station_code: stationCode, allow_signin: true },
    }),
  // Settings → Admins → Add Admin
  addAdmin: (request, user, details) =>
    request.post(paths.addAdmin, { headers: headersOf(user), data: details }),
  // Leaderboard row menu → Promote As An Admin (or the Add Admin popup → Update & Promote As Admin) →
  // "Set password for admin role" → Confirm. driver: { id, userid } from the driver list.
  promote: (request, user, driver, stationCode, password = 'QaRehire@123') =>
    request.post(paths.promotion, {
      headers: headersOf(user),
      data: {
        action: 'promoted',
        user: driver.userid,
        id: driver.id,
        password,
        station_code: stationCode,
        share_existing_user: true,
      },
    }),
  // Settings → Admins → Remove from admin role → Remove Admin Role
  demote: (request, user, userId, stationCode) =>
    request.post(paths.promotion, {
      headers: headersOf(user),
      data: { action: null, user: userId, station_code: stationCode },
    }),
  setStatus: (request, user, id, status) =>
    request.patch(endpoints.driverStatusUpdate, {
      headers: headersOf(user),
      data: { status, id: [id], type: 'single' },
    }),
  list: (request, user) =>
    request.get(endpoints.driverList, {
      headers: headersOf(user),
      params: { limit: '1000', offset: '0' },
    }),
};

// Drivers saved during a test: made inactive by cleanUp() (a driver cannot be deleted)
const saved = [];

// Adds a driver that must be saved (200) and returns it ({ id, ...details }); stops the test otherwise
async function addDriver(request, company, fields = {}) {
  const user = await login(company);
  let details = newDriverDetails(company, fields);
  let response = await api.add(request, user, details);
  // A random name can be "similar" to a driver of an earlier run: try other names (unless the test chose one)
  for (let i = 0; i < 3 && !fields.name && response.status() === 409; i++) {
    if ((await bodyOf(response)).message !== 'Similar drivers found') break;
    details = newDriverDetails(company, fields);
    response = await api.add(request, user, details);
  }
  await addToReport(response);
  const body = await bodyOf(response);
  if (response.status() !== 200) {
    throw new Error(
      'Adding test driver ' +
        details.name +
        ' to company ' +
        company +
        ' failed: status ' +
        response.status() +
        ' ' +
        (body.message || ''),
    );
  }
  saved.push({ company, id: body.data.id, name: details.name });
  return { ...details, id: body.data.id };
}

// Sends Add Driver and returns { status, body }. A driver saved by mistake (a missing check) is noted for
// cleanUp(), so it is made inactive after the test.
async function tryAdd(request, company, details) {
  const response = await api.add(request, await login(company), details);
  await addToReport(response);
  const body = await bodyOf(response);
  if (response.status() === 200 && body.data?.id) {
    saved.push({ company, id: body.data.id, name: details.name });
  }
  return { status: response.status(), body };
}

// Makes a driver inactive like the web app's status switch: the reason first, then the status
async function deactivate(request, company, driver) {
  const user = await login(company);
  const reason = await request.post(endpoints.saveInactiveDriver, {
    headers: headersOf(user),
    params: { driver_id: driver.id },
    multipart: {
      inactiveData: JSON.stringify({
        driver_name: driver.name,
        inactive_date: new Date().toISOString().slice(0, 10),
        reason_type: 'business_decision',
        reasons: ['QA automation test driver'],
        note: 'Added and deactivated by the Rehire conflict tests (rehire-conflicts.spec.js)',
      }),
    },
  });
  await addToReport(reason);
  const response = await api.setStatus(request, user, driver.id, 'inactive');
  await addToReport(response);
  return response;
}

// ---------- Bulk upload (Other Actions → Bulk Upload → Drivers) ----------
// The web app reads the xlsx itself and sends the rows as JSON: each field is { value, error, helperText }.
// The answer (no "data"): message "N driver(s) created successfully. N skipped (duplicate conflicts). N
// skipped (fuzzy matches).", conflicts[] and fuzzy_conflicts[] (one entry per held-back row).

// Emails of drivers a bulk upload may have created: made inactive by cleanUp()
const bulkEmails = [];

const cell = (value) => ({ value, error: false, helperText: '' });
// One row as the web app sends it, from newDriverDetails()
const bulkRow = (d, i) => ({
  name: cell(d.name),
  email: cell(d.email),
  phone: cell(d.phone),
  transporter_id: cell(d.transporter_id),
  address: cell(d.address || ''),
  status: cell(d.status || 'active'),
  hire_date: cell(d.hire_date),
  birth_date: cell(''),
  work_anniversary: cell(''),
  station_code: cell(d.station_code),
  id: i + 1,
});

// Uploads drivers (newDriverDetails objects) to a company; returns { status, body }
async function bulkUpload(request, company, drivers) {
  for (const d of drivers) bulkEmails.push({ company, email: d.email });
  const response = await request.post(endpoints.addDriver + '/upload', {
    headers: headersOf(await login(company)),
    data: { type: 'driver', data: drivers.map(bulkRow) },
  });
  await addToReport(response);
  return { status: response.status(), body: await bodyOf(response) };
}

// "3 driver(s) created successfully. 1 skipped (duplicate conflicts). 1 skipped (fuzzy matches)." → numbers
function bulkCounts(message = '') {
  const n = (re) => Number((message.match(re) || [])[1] || 0);
  return {
    created: n(/(\d+) driver\(s\) created/),
    duplicates: n(/(\d+) skipped \(duplicate/),
    fuzzy: n(/(\d+) skipped \(fuzzy/),
  };
}

// ---------- Admins ----------

// New admin details nobody has yet (yopmail, random 555 phone, a valid password)
function newAdminDetails(company, fields = {}) {
  const n = faker.string.numeric({ length: 7, allowLeadingZeros: true });
  return {
    name: faker.person.fullName() + ' QA Admin',
    email: 'qa.rehire.admin.' + n + '@yopmail.com',
    phone: '555' + faker.string.numeric({ length: 7, allowLeadingZeros: true }),
    password: 'QaRehire@123',
    station_code: [stationOf(company)],
    ...fields,
  };
}

// Admins (and promotions) made during a test: removed from the admin role by cleanUp()
const admins = [];
// Notes an admin to remove after the test (by email: the user id is looked up then)
const trackAdmin = (company, email) => admins.push({ company, email });

// Sends Add Admin and returns { status, body }; a saved admin is noted for clean-up
async function tryAddAdmin(request, company, details) {
  const response = await api.addAdmin(request, await login(company), details);
  await addToReport(response);
  const body = await bodyOf(response);
  // A new admin answers 204 (no body)
  if (response.ok()) trackAdmin(company, details.email);
  return { status: response.status(), body };
}

// Adds an admin that must be saved and returns its details; stops the test otherwise
async function addAdmin(request, company, fields) {
  const details = newAdminDetails(company, fields);
  const result = await tryAddAdmin(request, company, details);
  if (result.status >= 300) {
    throw new Error(
      'Adding test admin to company ' +
        company +
        ' failed: ' +
        result.status +
        ' ' +
        result.body.message,
    );
  }
  return details;
}

// The users (admins, owners, drivers with a login) of a company with this email
async function usersWithEmail(request, company, email) {
  const response = await request.get('/lmd/prfsrv/perf-user/v3/users', {
    headers: headersOf(await login(company)),
  });
  const body = await bodyOf(response);
  return (body.data ?? []).filter(
    (u) => (u.email || '').toLowerCase() === email.toLowerCase(),
  );
}

// Makes every driver saved by the tests inactive (after each test)
async function cleanUp(request) {
  while (admins.length) {
    const { company, email } = admins.pop();
    for (const u of await usersWithEmail(request, company, email)) {
      if (u.role !== 'driver' && u.role !== 'owner') {
        await api.demote(request, await login(company), u.id, [
          stationOf(company),
        ]);
      }
    }
  }
  while (bulkEmails.length) {
    const { company, email } = bulkEmails.pop();
    for (const d of await driversWithEmail(request, company, email)) {
      if (d.status === 'active') {
        saved.push({ company, id: d.id, name: d.name });
      }
    }
  }
  while (saved.length) {
    const driver = saved.pop();
    await deactivate(request, driver.company, driver);
  }
}

// The conflicts of an Add Driver answer, and the one with a given existing user (by id). Two shapes:
// - 409 (same company: refused): data.conflicted[]
// - 200 (another company: saved WITHOUT app access, "added with access issue"): data.conflicts[].conflicted[]
const conflictsOf = (body) => [
  ...(body.data?.conflicted ?? []),
  ...(body.data?.conflicts ?? []).flatMap((c) => c.conflicted ?? []),
];
const conflictWith = (body, id) =>
  conflictsOf(body).find((c) => String(c.id) === String(id));

// ---------- Super Admin ----------
// The Super Admin site (SUPER_ADMIN_URL) → Conflict Requests. The tests act ONLY on requests they raised
// themselves (raiseRequest below), never on other people's requests, and never use Clear Data.
const superAdminPaths = {
  login: '/lmd/usrsrv/users/v1/super_admin/login',
  requests: '/lmd/usrsrv/users/v1/conflicted-requests/',
  count: '/lmd/usrsrv/users/v1/conflicted-requests/count',
  create: '/lmd/usrsrv/users/v1/conflicted-requests', // the admin's "Send Request To Super Admin"
  resolve: '/lmd/usrsrv/users/v1/super-admin/resolve-conflict', // Quick-Accept, Update & Resolve, Cancel
};

// Logs in as the Super Admin (once per worker); the token works with x-access-token + x-access-user
let superAdmin;
async function loginAsSuperAdmin(request) {
  if (superAdmin) return superAdmin;
  const response = await request.post(superAdminPaths.login, {
    data: {
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    },
  });
  const body = await bodyOf(response);
  if (response.status() !== 200 || !body.data?.token) {
    throw new Error('Super Admin login failed: status ' + response.status());
  }
  superAdmin = { token: body.data.token, account_id: body.data.account_id };
  return superAdmin;
}

// The Super Admin calls, as the web app sends them (seen 2026-11-05)
const superAdminApi = {
  list: (request, user, offset = 0) =>
    request.get(superAdminPaths.requests, {
      headers: headersOf(user),
      params: { limit: 20, offset },
    }),
  get: (request, user, id) =>
    request.get(superAdminPaths.requests + id, { headers: headersOf(user) }),
  count: (request, user) =>
    request.get(superAdminPaths.count, { headers: headersOf(user) }),
  // Quick-Accept → Confirm: the new driver gets sign-in, the existing driver is made inactive
  quickAccept: (request, user, req) =>
    request.patch(superAdminPaths.resolve, {
      headers: headersOf(user),
      data: {
        conflicted_request_id: req.id,
        resolution_type: 'quick',
        operation: 'edit',
        subject: {
          table: 'drivers',
          id: req.newDriver.id,
          action: 'grant_signin',
        },
        data: {
          status: 'active',
          email: req.newDriver.email,
          phone: req.newDriver.phone,
        },
        counterpart: {
          table: 'drivers',
          id: req.existingDriver.id,
          action: 'inactivate',
        },
      },
    }),
  // UPDATE & RESOLVE: new email / phone / status for the existing account
  updateAndResolve: (request, user, req, fields) =>
    request.patch(superAdminPaths.resolve, {
      headers: headersOf(user),
      data: {
        data: {
          email: req.existingDriver.email,
          phone: req.existingDriver.phone,
          status: 'active',
          ...fields,
        },
        conflicted_entities: [
          { conflicted_table: 'drivers', ids: [req.existingDriver.id] },
        ],
        request_type: req.requestType,
        conflicted_request_id: req.id,
        resolution_type: 'manual',
      },
    }),
  // Cancel Request (no confirmation in the app): the request becomes DECLINED
  cancel: (request, user, req) =>
    request.patch(superAdminPaths.resolve, {
      headers: headersOf(user),
      data: { conflicted_request_id: req.id, action: 'declined' },
    }),
};

// Requests to the Super Admin are only sent when ALLOW_SUPER_ADMIN_REQUESTS=yes (QA's rule, 2026-11-06: no
// request may reach the Super Admin in a normal run). Otherwise the test that needs one is skipped.
function requireSuperAdminRequests() {
  test.skip(
    process.env.ALLOW_SUPER_ADMIN_REQUESTS !== 'yes',
    'Sends a request to the Super Admin: only with ALLOW_SUPER_ADMIN_REQUESTS=yes',
  );
}

// The admin's "Send Request To Super Admin" for a driver saved with an access issue (the body the web app sends)
function sendRequest(request, company, newDriver, existingIds, requestType) {
  requireSuperAdminRequests();
  return login(company).then((user) =>
    request.post(superAdminPaths.create, {
      headers: headersOf(user),
      data: [
        {
          data: {
            email: newDriver.email,
            name: newDriver.name,
            phone: newDriver.phone,
            subject_type: 'driver',
            driver_id: newDriver.id,
            transporter_id: newDriver.transporter_id,
          },
          request_type: requestType,
          conflicted_entities: [
            { conflicted_table: 'drivers', ids: existingIds },
          ],
        },
      ],
    }),
  );
}

// Requests raised by the tests that are still open: cancelled after each test (cleanUpRequests)
const openRequests = [];

// Raises one of OUR requests like the web app: a new QA driver in company A, the same person (same email and
// phone) added in company B → saved with an access issue → Send Request To Super Admin. Returns
// { id, existingDriver (A), newDriver (B), requestType }.
async function raiseRequest(request) {
  requireSuperAdminRequests();
  const existingDriver = await addDriver(request, 'A');
  let details;
  let added;
  // A random name can be "similar" to a driver of company B: try other names
  for (let i = 0; i < 3; i++) {
    details = newDriverDetails('B', {
      email: existingDriver.email,
      phone: existingDriver.phone,
    });
    added = await tryAdd(request, 'B', details);
    if (added.body.message !== 'Similar drivers found') break;
  }
  if (added.status !== 200 || !conflictWith(added.body, existingDriver.id)) {
    throw new Error(
      'Company B did not save the driver with an access issue: ' +
        added.status +
        ' ' +
        added.body.message,
    );
  }
  const newDriver = { ...details, id: added.body.data.id };
  const requestType = [
    'signin_grant_conflict',
    'email_conflict',
    'phone_conflict',
  ];
  const response = await sendRequest(
    request,
    'B',
    newDriver,
    [existingDriver.id],
    requestType,
  );
  await addToReport(response);
  const body = await bodyOf(response);
  if (response.status() !== 200 || !body.data?.ids?.length) {
    throw new Error(
      'Send Request failed: ' + response.status() + ' ' + body.message,
    );
  }
  const req = { id: body.data.ids[0], existingDriver, newDriver, requestType };
  openRequests.push(req);
  return req;
}

// Cancels the test's own requests that are still pending (after each test)
async function cleanUpRequests(request) {
  const sa = openRequests.length ? await loginAsSuperAdmin(request) : null;
  while (openRequests.length) {
    const req = openRequests.pop();
    const now = await bodyOf(await superAdminApi.get(request, sa, req.id));
    if (now.data?.conflict_status === 'PENDING') {
      await superAdminApi.cancel(request, sa, req);
    }
  }
}

// A request raised by these tests (their drivers' emails start with "qa.rehire."): the view-only tests skip
// them, because the action tests change them at the same time
const isOwnRequest = (r) =>
  String(
    r.email || r.detail?.sentFrom?.details?.requestedEmail || '',
  ).startsWith('qa.rehire.');

// The first request (newest first, up to `pages` pages of 20) that matches; undefined when none does
async function findRequest(request, match, pages = 10) {
  const sa = await loginAsSuperAdmin(request);
  for (let page = 0; page < pages; page++) {
    const body = await bodyOf(await superAdminApi.list(request, sa, page * 20));
    const found = (body.data ?? []).find(match);
    if (found || !body.data?.length) return found;
  }
  return undefined;
}

// One request as the Super Admin sees it (data of GET .../conflicted-requests/<id>)
async function requestOf(request, id) {
  const response = await superAdminApi.get(
    request,
    await loginAsSuperAdmin(request),
    id,
  );
  await addToReport(response);
  return (await bodyOf(response)).data;
}

// Is a driver of the company's list (by email)? A refused Add Driver must not add one
async function driversWithEmail(request, company, email) {
  const response = await api.list(request, await login(company));
  const body = await bodyOf(response);
  return (body.data ?? []).filter(
    (d) => (d.email || '').toLowerCase() === email.toLowerCase(),
  );
}

module.exports = {
  api,
  login,
  stationOf,
  ownerOf,
  bodyOf,
  newDriverDetails,
  addDriver,
  tryAdd,
  deactivate,
  cleanUp,
  conflictsOf,
  conflictWith,
  driversWithEmail,
  headersOf,
  newAdminDetails,
  trackAdmin,
  tryAddAdmin,
  addAdmin,
  bulkUpload,
  bulkCounts,
  usersWithEmail,
  loginAsSuperAdmin,
  superAdminApi,
  requireSuperAdminRequests,
  sendRequest,
  raiseRequest,
  cleanUpRequests,
  isOwnRequest,
  findRequest,
  requestOf,
};
