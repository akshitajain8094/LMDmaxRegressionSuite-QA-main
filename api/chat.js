// In-app chat (Chat in the web app), on the server MESSAGING_BASE_URL. It has two tabs:
// - 'paya': "Paya Chat", the station's shared chat (the requirement calls it "DSP Shortcode Chat").
//   Every admin of the station sees the same conversations; messages are sent as the station.
// - 'individual': "Individual Chat", the admin's own conversations.
const endpoints = require('./endpoints');
const addToReport = require('./report');
const loginAsTestUser = require('./auth');
const { loginAs } = require('./auth');

// The chat tests have their own station, owner and driver (CHAT_* in .env), because the second admin and
// the promoted admin are not on the test station. Without CHAT_* they use the test user and the test station.
const chatStation = () =>
  process.env.CHAT_STATION_ID || process.env.TEST_STATION_ID;

// The owner of the chat station ("Admin A", the admin who deletes); logs in once per worker
let chatOwner;
async function loginAsChatOwner() {
  if (!process.env.CHAT_OWNER_EMAIL) return loginAsTestUser();
  chatOwner ??= await loginAs(
    'CHAT_OWNER',
    process.env.CHAT_OWNER_EMAIL,
    process.env.CHAT_OWNER_PASSWORD,
    chatStation(),
  );
  return chatOwner;
}

// Another user of the chat station, e.g. 'ADMIN_B' (ADMIN_B_EMAIL and ADMIN_B_PASSWORD)
async function loginToChatStation(who) {
  return loginAs(
    who,
    process.env[who + '_EMAIL'],
    process.env[who + '_PASSWORD'],
    chatStation(),
  );
}

// The "data" of a chat answer. If the server did not answer 200 with data, stops the test with a clear message
// (for example "Sending a message failed: status 503 ..."), instead of a "Cannot read properties" error later.
async function dataOf(response, what) {
  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    // not JSON, e.g. an HTML error page
  }
  if (response.status() !== 200 || !body.data) {
    throw new Error(
      what + ' failed: status ' + response.status() + ' ' + text.slice(0, 200),
    );
  }
  return body.data;
}

// Opens one chat tab as a user (from loginAsChatOwner() or loginToChatStation()). Every other function takes its result.
async function openChat(request, user, tab) {
  const headers = {
    'x-access-token': user.token,
    'x-access-user': user.account_id,
    // Like the web app (UI tests do not get these from playwright.config.js)
    'app-type': '2',
    Origin: process.env.UI_BASE_URL,
  };
  if (tab === 'paya') {
    // The shared chat needs a second login: the station's chat token
    const tokenResponse = await request.get(
      process.env.MESSAGING_BASE_URL + endpoints.chatToken,
      { headers },
    );
    const token = await dataOf(tokenResponse, 'The Paya Chat login');
    headers['x-authorization-chat-user'] = 'Bearer ' + token.accessToken;
  }
  const prefix =
    tab === 'paya'
      ? '/lmd/twms/company-chat/' + chatStation() + '/'
      : '/lmd/twms/';
  return {
    request,
    tab,
    headers,
    url: (path) => process.env.MESSAGING_BASE_URL + prefix + path,
  };
}

// Gives the id of the conversation with a person (e.g. a test driver), and starts one if there is none yet
async function findRoom(chat, name) {
  const params = {
    type: 'all',
    offset: 0,
    limit: 10,
    keyword: name,
    station_id: chatStation(),
    role_ids: '',
  };
  const list = await chat.request.get(chat.url(endpoints.chatList), {
    headers: chat.headers,
    params,
  });
  const rooms = (await dataOf(list, 'The chat list')).filter(
    (room) => room.room_type === 'private' && room.room_name === name,
  );
  if (rooms.length > 0) return rooms[0].room_id;

  // No conversation yet: start one, as clicking the person and sending a first message does
  const candidates = await chat.request.get(
    chat.url(endpoints.chatCandidates),
    {
      headers: chat.headers,
      params,
    },
  );
  const person = (
    await dataOf(candidates, 'The list of people to chat with')
  ).find((candidate) => candidate.room_name === name);
  if (!person) throw new Error(name + ' cannot be chatted with in ' + chat.tab);
  const created = await chat.request.post(chat.url(endpoints.chatCreateRoom), {
    headers: chat.headers,
    multipart: {
      type: 'private',
      members: JSON.stringify([Number(person.user_id)]),
      message: 'QA automation: first message',
      chat_type: chat.tab === 'paya' ? 'company' : 'individual',
    },
  });
  return (await dataOf(created, 'Starting a chat with ' + name)).chat_room_id;
}

// Sends a text message; gives the message id
async function sendText(chat, roomId, text) {
  const response = await chat.request.post(
    chat.url(endpoints.chatSendMessage),
    {
      headers: { ...chat.headers, 'x-idem-key': crypto.randomUUID() },
      multipart: { message: text, chat_room_id: roomId, mentions: '[]' },
    },
  );
  return (await dataOf(response, 'Sending a message')).id;
}

// Uploads a file (an image or another file) and sends it as a message; gives the message id and the file's link.
// file: { name, mimeType, buffer }, the form Playwright uses for uploads
async function sendFile(chat, roomId, file) {
  const upload = await chat.request.put(
    process.env.MESSAGING_BASE_URL + endpoints.chatUploadFile,
    { headers: chat.headers, multipart: { file } },
  );
  const uploaded = await dataOf(upload, 'Uploading ' + file.name);
  const response = await chat.request.post(
    chat.url(endpoints.chatSendMessage),
    {
      headers: { ...chat.headers, 'x-idem-key': crypto.randomUUID() },
      multipart: {
        message: '',
        chat_room_id: roomId,
        mentions: '[]',
        attachments: JSON.stringify([uploaded]),
      },
    },
  );
  return {
    id: (await dataOf(response, 'Sending ' + file.name)).id,
    url: uploaded.url,
  };
}

// Deletes a message for everyone (hover → Delete → Delete); gives the server's answer (the test checks it)
async function deleteMessage(chat, roomId, messageId) {
  return chat.request.patch(chat.url(endpoints.chatDeleteMessage), {
    headers: chat.headers,
    data: { chat_room_id: roomId, id: messageId },
  });
}

// The preview of a conversation in the chat list: its last message { id, content, attachments, is_deleted, deleted_by }
async function getPreview(chat, roomId) {
  const response = await chat.request.get(
    chat.url(endpoints.chatHead + roomId),
    {
      headers: chat.headers,
    },
  );
  await addToReport(response);
  return (await dataOf(response, 'Reading the chat list row'))[0].last_message;
}

// One message as it is shown in the conversation { id, content, attachments, is_deleted, deleted_by, authority }
async function getMessage(chat, roomId, messageId) {
  const response = await chat.request.get(
    chat.url(endpoints.chatMessages + roomId),
    {
      headers: chat.headers,
      params: { offset: 0, limit: 20 },
    },
  );
  await addToReport(response);
  return (await dataOf(response, 'Reading the conversation')).find(
    (message) => String(message.id) === String(messageId),
  );
}

module.exports = {
  openChat,
  findRoom,
  sendText,
  sendFile,
  deleteMessage,
  loginAsChatOwner,
  loginToChatStation,
  getPreview,
  getMessage,
};
