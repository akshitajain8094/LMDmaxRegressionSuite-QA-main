// SMS / Twilio chat (Chat → SMS Chat in the web app) on the performance server. The SMS tests use the chat station
// and owner (CHAT_* in .env: AQWA, arth on staging). Sending reaches real phones, so every send, broadcast and group
// function refuses any driver that is not in SMS_DRIVERS (Chad Elnahal, janeil and jjiaa on staging: Chad's
// number is the QA RingCentral phone), plus SMS_INVALID_DRIVER_ID (a driver whose SMS fails) where a test needs it.
//
// What the web app calls (read from its code and while looking at the screen, 2026-11-18):
//   chat list         GET  /messages/v5/get_message_head?offset&limit&station_ids&filter&search
//                          each: type (drivers / broadcast / group), driver_id, name, phone, status, stations
//                          [{ station_id }], message, error (last SMS failed), unread_count, is_pinned
//                          (the web app shows the stations of the user together: on AQWA it sends 477 and 578)
//   filter counts     GET  /messages/v5/get_heads_count?station_ids   → { all, active, inactive, suspended,
//                          broadcast_lists, groups, last_30_days, last_driver_message, unread }
//   unread badge      GET  /messages/v5/sms-unread-count              → { unread }
//   one conversation  GET  /messages/v3/get_message?driver_id&offset&limit
//                          each: message, from, to, is_driver (true = the driver sent it, status "received"),
//                          status, twilio_error, broadcast_msg_id, reply_details { message_id, message, from } (a quoted reply)
//   send (1:1)        POST /messages/v3/send_message  multipart: message, to (driver id), reply_id?, attachment?
//                          header x-stations-check: the driver's station ids
//   new broadcast     POST /messages/v3/create_broadcast multipart: broadcastName, receiverList (JSON
//                          [{ driver_id, name, stations }]), message?, attachment?
//   broadcast message POST /messages/v3/broadcast multipart: message, broadcast_id, attachment?
//   broadcast         GET  /messages/v4/get_broadcast?broadcast_id    → { broadcast_name, to (members) }
//   its messages      GET  /messages/v3/get_broadcast_messages?broadcast_id&offset&limit
//                          each: total (members), to (the drivers it was sent to), delivered (who received it)
//                          The screen shows "Message sent to <delivered>/<total>".
//   one message       GET  /messages/v3/get_broadcast_delivery_status?broadcast_msg_id
//   rename / members  PATCH /messages/v3/edit_broadcast { broadcast_id, broadcastName | driverList }
//   retry             POST /messages/v3/resend_broadcast
//   delete broadcast  PATCH /messages/v3/delete_broadcast { list }
//   pin               PATCH /messages/v5/pin_chat { is_pinned, driver_id | broadcast_id | group_id }
//   group             POST group/v1/create_group { to, groupName } (204 created, 207 some refused),
//                     POST group/v1/message (message, group_id), GET group/v1/messages?group_id
const fs = require('fs');
const path = require('path');
const { loginAs } = require('./auth');
const addToReport = require('./report');

// The full address: the SMS tests run in a UI project, where `request` points at the web app (UI_BASE_URL), not the API
const apiBase = () => process.env.API_BASE_URL;
const base = (process.env.API_BASE_URL || '') + '/lmd/prfsrv';
const station = () => process.env.CHAT_STATION_ID;

// The drivers the tests may send SMS to: SMS_DRIVERS = "id:name,id:name,..." → [{ id, name }]
const testDrivers = () =>
  (process.env.SMS_DRIVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [id, ...name] = s.split(':');
      return { id: id.trim(), name: name.join(':').trim() };
    });
const allowedDrivers = () => testDrivers().map((d) => d.id);
const invalidDriver = () => (process.env.SMS_INVALID_DRIVER_ID || '').trim();
const ringCentralDriver = () => (process.env.SMS_RINGCENTRAL_DRIVER_ID || '').trim();

function checkRecipients(ids) {
  const ok = new Set([...allowedDrivers(), invalidDriver()].filter(Boolean));
  const others = ids.map(String).filter((id) => !ok.has(id));
  if (others.length) {
    throw new Error(
      'Refused: the SMS tests may only message SMS_DRIVERS / SMS_INVALID_DRIVER_ID, not ' + others.join(', '),
    );
  }
}

// Logs in as the chat owner on the chat station (once per worker)
let owner;
async function login() {
  owner ??= await loginAs('CHAT_OWNER', process.env.CHAT_OWNER_EMAIL, process.env.CHAT_OWNER_PASSWORD, station());
  return owner;
}
// The headers the web app sends with every API call (the UI project has no apiSettings.extraHTTPHeaders)
const headersOf = (user) => ({ 'x-access-token': user.token, 'x-access-user': user.account_id, 'app-type': '2', Origin: process.env.UI_BASE_URL });

async function getJson(request, user, url) {
  const response = await request.get(base + url, { headers: headersOf(user) });
  await addToReport(response);
  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON
  }
  return { status: response.status(), body, text };
}
const qs = (params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else if (v !== undefined && v !== null) q.append(k, String(v));
  }
  return q.toString();
};

// ---------- reading (no message is sent) ----------
const chatList = (request, user, { offset = 0, limit = 10, stations = [station()], filter, search } = {}) =>
  getJson(request, user, '/messages/v5/get_message_head?' + qs({ offset, limit, station_ids: stations, filter, search }));
const filterCounts = (request, user, stations = [station()]) =>
  getJson(request, user, '/messages/v5/get_heads_count?' + qs({ station_ids: stations }));
const unreadCount = (request, user) => getJson(request, user, '/messages/v5/sms-unread-count');
const conversation = (request, user, driverId, offset = 0, limit = 10) =>
  getJson(request, user, `/messages/v3/get_message?driver_id=${driverId}&offset=${offset}&limit=${limit}`);
const broadcast = (request, user, broadcastId) =>
  getJson(request, user, '/messages/v4/get_broadcast?broadcast_id=' + broadcastId);
const broadcastHead = (request, user, broadcastId) =>
  getJson(request, user, '/messages/v5/get_single_head?broadcast_id=' + broadcastId);
const broadcastMessages = (request, user, broadcastId, offset = 0, limit = 10) =>
  getJson(request, user, `/messages/v3/get_broadcast_messages?broadcast_id=${broadcastId}&offset=${offset}&limit=${limit}`);
const broadcastMessageStatus = (request, user, broadcastMsgId) =>
  getJson(request, user, '/messages/v3/get_broadcast_delivery_status?broadcast_msg_id=' + broadcastMsgId);
const group = (request, user, groupId) => getJson(request, user, '/group/v1/group?group_id=' + groupId);
const groupMessages = (request, user, groupId, offset = 0, limit = 10) =>
  getJson(request, user, `/group/v1/messages?group_id=${groupId}&offset=${offset}&limit=${limit}`);

// A driver's stations (for the x-stations-check header), from the chat list
async function stationsOf(request, user, driverId) {
  const { body } = await chatList(request, user, { limit: 50 });
  const head = (body.data ?? []).find((h) => String(h.driver_id) === String(driverId));
  return head?.stations?.map((s) => String(s.station_id ?? s)) ?? [station()];
}

// ---------- sending (real SMS: only to the allowed drivers) ----------
async function sendMessage(request, user, { driverId, message, replyId, file, stations }) {
  checkRecipients([driverId]);
  const multipart = { message, to: String(driverId) };
  if (replyId) multipart.reply_id = replyId;
  if (file) multipart.attachment = fileOf(file);
  const response = await request.post(base + '/messages/v3/send_message', {
    headers: { ...headersOf(user), 'x-stations-check': (stations ?? [station()]).join(',') },
    multipart,
  });
  await addToReport(response);
  return response;
}

// drivers: [{ id, name, stations }]. message is optional (the screen sends the first message with it).
async function createBroadcast(request, user, { name, drivers, message, file }) {
  checkRecipients(drivers.map((d) => d.id));
  const multipart = {
    // stations as plain id strings (["578"]); objects give 400 "Invalid receiverList format". The first message is
    // required: without it the server answers 400 "params missing".
    receiverList: JSON.stringify(drivers.map((d) => ({ driver_id: String(d.id), name: d.name, stations: (d.stations ?? []).map((s) => String(s.station_id ?? s)) }))),
  };
  if (name !== undefined) multipart.broadcastName = name;
  if (message) multipart.message = message;
  if (file) multipart.attachment = fileOf(file);
  const stations = [...new Set(drivers.flatMap((d) => (d.stations ?? []).map((s) => String(s.station_id ?? s))))];
  const response = await request.post(base + '/messages/v3/create_broadcast', {
    headers: { ...headersOf(user), 'x-stations-check': (stations.length ? stations : [station()]).join(',') },
    multipart,
  });
  await addToReport(response);
  return response;
}

async function sendBroadcastMessage(request, user, { broadcastId, message, file }) {
  const { body } = await broadcast(request, user, broadcastId);
  checkRecipients((body.data?.to ?? []).map((t) => t.to ?? t.driver_id ?? t));
  const multipart = { message, broadcast_id: broadcastId };
  if (file) multipart.attachment = fileOf(file);
  const response = await request.post(base + '/messages/v3/broadcast', { headers: headersOf(user), multipart });
  await addToReport(response);
  return response;
}

async function editBroadcast(request, user, data) {
  if (data.driverList) checkRecipients(data.driverList.map((d) => d.to ?? d.driver_id ?? d.id));
  const response = await request.patch(base + '/messages/v3/edit_broadcast', { headers: headersOf(user), data });
  await addToReport(response);
  return response;
}
async function resendBroadcast(request, user, data) {
  const response = await request.post(base + '/messages/v3/resend_broadcast', { headers: headersOf(user), data });
  await addToReport(response);
  return response;
}
async function deleteBroadcasts(request, user, broadcastIds) {
  const response = await request.patch(base + '/messages/v3/delete_broadcast', {
    headers: headersOf(user),
    data: { list: broadcastIds },
  });
  await addToReport(response);
  return response;
}
async function pin(request, user, { driverId, broadcastId, groupId, pinned = true }) {
  const data = { is_pinned: pinned };
  if (driverId) data.driver_id = driverId;
  if (broadcastId) data.broadcast_id = broadcastId;
  if (groupId) data.group_id = groupId;
  const response = await request.patch(base + '/messages/v5/pin_chat', { headers: headersOf(user), data });
  await addToReport(response);
  return response;
}
async function createGroup(request, user, { name, driverIds }) {
  checkRecipients(driverIds);
  const response = await request.post(base + '/group/v1/create_group', {
    headers: headersOf(user),
    data: { to: driverIds.map(String), groupName: name },
  });
  await addToReport(response);
  return response;
}
async function sendGroupMessage(request, user, { groupId, message }) {
  const response = await request.post(base + '/group/v1/message', {
    headers: headersOf(user),
    multipart: { message, group_id: groupId },
  });
  await addToReport(response);
  return response;
}
async function deleteGroup(request, user, groupId) {
  const response = await request.delete(base + '/group/v1/group?group_id=' + groupId, { headers: headersOf(user) });
  await addToReport(response);
  return response;
}

function fileOf(file) {
  const ext = path.extname(file).toLowerCase();
  const mimeType =
    { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webp': 'image/webp' }[ext] ||
    'application/octet-stream';
  return { name: path.basename(file), mimeType, buffer: fs.readFileSync(file) };
}

// Waits until fn() returns something truthy (the delivery status comes from Twilio a few seconds later)
async function waitFor(fn, { timeout = 60 * 1000, every = 3000 } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, every));
  }
  return last;
}

// The messages of a driver's conversation (newest first). Each: message, status ("queued", "sent", "delivered",
// "undelivered", "failed"), twilio_error (e.g. 30034), error_message, broadcast_msg_id (when it came from a broadcast)
async function messagesOf(request, user, driverId, limit = 20) {
  const { status, body } = await conversation(request, user, driverId, 0, limit);
  if (status !== 200) throw new Error(`conversation of ${driverId}: status ${status}`);
  return body.data ?? [];
}
// Waits until the message with this text (or of this broadcast message) has a final status; returns the message
async function finalStatus(request, user, driverId, { text, broadcastMsgId, timeout = 90 * 1000 }) {
  const done = ['delivered', 'undelivered', 'failed'];
  let found;
  await waitFor(async () => {
    const list = await messagesOf(request, user, driverId);
    found = list.find((m) => (text ? m.message === text : m.broadcast_msg_id === broadcastMsgId));
    return found && done.includes(found.status);
  }, { timeout });
  return found;
}

// Waits for an SMS FROM the driver (is_driver true, status "received") newer than `after` (a Date); returns it or
// undefined. Used by the cases where QA replies by hand from the driver's phone (RingCentral for Chad).
async function waitForDriverSms(request, user, driverId, { after, timeout = 3 * 60 * 1000 } = {}) {
  return waitFor(async () => {
    const list = await messagesOf(request, user, driverId, 10);
    return list.find((m) => m.is_driver && String(m.from) === String(driverId) && new Date(m.created_at) > after);
  }, { timeout, every: 5000 });
}

// A text of exactly n GSM-7 characters (for the 1,550 limit cases), starting with a unique tag
function gsmText(n, tag = 'QA ' + Date.now()) {
  const filler = ' abcdefghijklmnopqrstuvwxyz0123456789';
  let s = tag;
  while (s.length < n) s += filler;
  return s.slice(0, n);
}

module.exports = {
  login,
  apiBase,
  headersOf,
  testDrivers,
  allowedDrivers,
  invalidDriver,
  ringCentralDriver,
  chatList,
  filterCounts,
  unreadCount,
  conversation,
  messagesOf,
  finalStatus,
  broadcast,
  broadcastHead,
  broadcastMessages,
  broadcastMessageStatus,
  group,
  groupMessages,
  stationsOf,
  sendMessage,
  createBroadcast,
  sendBroadcastMessage,
  editBroadcast,
  resendBroadcast,
  deleteBroadcasts,
  pin,
  createGroup,
  sendGroupMessage,
  deleteGroup,
  waitFor,
  waitForDriverSms,
  gsmText,
};
