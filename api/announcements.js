// Announcements (Announcements in the web app's menu), on the performance server: /lmd/prfsrv/announcements/v1.
// An admin of a station sends an announcement to its drivers (all of them or selected ones); drivers see it in
// the LMD Driver app, can comment and acknowledge it. Sending one sends a push notification and an SMS.
const { loginAs } = require('./auth');
const addToReport = require('./report');

const base = '/lmd/prfsrv/announcements/v1';

// The announcement tests have their own station and test driver (ANN_* in .env): every announcement goes only
// to this driver ("Selected drivers"), so no other driver gets an SMS. On staging: DYY6 and Chad Elnahal.
const station = () => process.env.ANN_STATION_ID;
const driverName = () => process.env.ANN_DRIVER_NAME;

// Logs in to the announcement station. who: 'ANN_OWNER' (the creating admin, "Admin A"), 'ADMIN_B' or
// 'PROMOTED_ADMIN' (other admins of the station). Logs in once per worker and user.
const logins = {};
async function login(who = 'ANN_OWNER') {
  logins[who] ??= await loginAs(
    who,
    process.env[who + '_EMAIL'],
    process.env[who + '_PASSWORD'],
    station(),
  );
  return logins[who];
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

// The "data" of an answer. If the server did not answer 200 with data, stops the test with a clear message
async function dataOf(response, what) {
  await addToReport(response);
  const body = await bodyOf(response);
  if (response.status() !== 200 || !body.data) {
    throw new Error(
      what +
        ' failed: status ' +
        response.status() +
        ' ' +
        JSON.stringify(body).slice(0, 200),
    );
  }
  return body.data;
}

// The test driver: { id (user id, used in user_ids), driver_id, name }, from the station's users
let testDriver;
async function findTestDriver(request, user) {
  if (testDriver) return testDriver;
  const response = await request.get('/lmd/prfsrv/perf-user/v3/users', {
    headers: headersOf(user),
  });
  const users = await dataOf(response, 'Reading the users of the station');
  const driver = users.find(
    (u) => u.role === 'driver' && !u.is_deleted && u.name === driverName(),
  );
  if (!driver) {
    throw new Error(
      'Test driver "' +
        driverName() +
        '" not found on station ' +
        station() +
        '. Check ANN_DRIVER_NAME.',
    );
  }
  testDriver = {
    id: String(driver.id),
    driver_id: driver.driver_id,
    name: driver.name,
  };
  return testDriver;
}

// The body the web app sends for "Review & send": only to the test driver unless other fields are given.
// comment_mode: 'everyone', 'driver_owner_admin_reply' (the app's "Drivers comment, admins reply") or 'off'.
async function announcementBody(request, user, fields = {}) {
  const driver = await findTestDriver(request, user);
  return {
    title: 'QA announcement ' + Date.now(),
    description: 'QA automation announcement. Please ignore.',
    audience_type: 'selected',
    user_ids: [driver.id],
    comment_mode: 'everyone',
    acknowledgement_enabled: false,
    attachment_ids: [],
    request_id: crypto.randomUUID(), // the same request_id twice = one announcement (double click)
    ...fields,
  };
}

// The raw calls: each returns the response, so a test can check any status
const api = {
  list: (request, user, query = {}) =>
    request.get(base + '/list', {
      headers: headersOf(user),
      params: { limit: 20, sort: 'newest', ...query },
    }),
  create: (request, user, body) =>
    request.post(base + '/create', { headers: headersOf(user), data: body }),
  // body: the create body (its request_id is not used) plus notify_drivers and reset_acknowledgements.
  // Every save gets a new request_id, unless requestId is given (the same requestId twice = a double click).
  update: (request, user, id, body, requestId = crypto.randomUUID()) =>
    request.patch(base + '/update/' + id, {
      headers: headersOf(user),
      data: {
        notify_drivers: false,
        reset_acknowledgements: false,
        ...body,
        request_id: requestId,
      },
    }),
  remove: (request, user, id) =>
    request.delete(base + '/' + id, { headers: headersOf(user) }),
  overview: (request, user, id) =>
    request.get(base + '/' + id + '/overview', { headers: headersOf(user) }),
  activity: (request, user, id, query = {}) =>
    request.get(base + '/' + id + '/activity', {
      headers: headersOf(user),
      params: { filter: 'all', limit: 20, ...query },
    }),
  history: (request, user, id) =>
    request.get(base + '/' + id + '/history', {
      headers: headersOf(user),
      params: { limit: 20 },
    }),
  // file: { name, mimeType, buffer }
  upload: (request, user, file) =>
    request.post(base + '/attachments', {
      headers: headersOf(user),
      multipart: { files: file },
    }),
  download: (request, user, id, attachmentId) =>
    request.get(
      base + '/' + id + '/attachments/' + attachmentId + '/download',
      {
        headers: user ? headersOf(user) : {},
      },
    ),
  addComment: (request, user, id, text, replyToId) =>
    request.post(base + '/' + id + '/comments', {
      headers: headersOf(user),
      data: replyToId ? { text, reply_to_id: replyToId } : { text },
    }),
  deleteComment: (request, user, id, commentId) =>
    request.delete(base + '/' + id + '/comments/' + commentId, {
      headers: headersOf(user),
    }),
};

// Uploads a file and returns its attachment ({ attachment_id, file_name, ... })
async function upload(request, user, file) {
  const data = await dataOf(
    await api.upload(request, user, file),
    'Uploading ' + file.name,
  );
  return data[0];
}

// Sends an announcement (to the test driver unless fields say otherwise) and returns its id
async function create(request, user, fields) {
  const body = await announcementBody(request, user, fields);
  const data = await dataOf(
    await api.create(request, user, body),
    'Sending an announcement',
  );
  return { id: data.announcement_id, body, sent_to: data.sent_to };
}

const overview = async (request, user, id) =>
  dataOf(await api.overview(request, user, id), 'Reading announcement ' + id);
const activity = async (request, user, id, query) =>
  dataOf(
    await api.activity(request, user, id, query),
    'Reading the activity of ' + id,
  );
const history = async (request, user, id) =>
  dataOf(await api.history(request, user, id), 'Reading the history of ' + id);
const addComment = async (request, user, id, text, replyToId) =>
  dataOf(
    await api.addComment(request, user, id, text, replyToId),
    'Posting a comment',
  );

// Deletes an announcement after a test; an announcement that is already gone is fine. Only its creator may
// delete it (403 "Only the admin who created this announcement can delete it"), so each test admin is tried.
async function cleanUp(request, id) {
  const admins = ['ANN_OWNER', 'ADMIN_B', 'PROMOTED_ADMIN'].filter(
    (who) => process.env[who + '_EMAIL'],
  );
  for (const who of admins) {
    const response = await api.remove(request, await login(who), id);
    if (response.status() !== 403) return;
  }
}

module.exports = {
  api,
  login,
  bodyOf,
  dataOf,
  findTestDriver,
  announcementBody,
  upload,
  create,
  overview,
  activity,
  history,
  addComment,
  cleanUp,
};
