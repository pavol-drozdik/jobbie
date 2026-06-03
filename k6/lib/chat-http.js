import http from 'k6/http';
import { check } from 'k6';
import { resolveApiBaseUrl, buildAuthHeaders } from './config.js';

/**
 * @param {string} body
 * @returns {string | null}
 */
function parseFirstRoomId(body) {
  const fromEnv = (__ENV.CHAT_ROOM_ID || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const arr = JSON.parse(body);
    if (!Array.isArray(arr) || arr.length === 0) {
      return null;
    }
    const id = arr[0].id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Text envelope matching the PWA (`useChatSocket` → POST /api/chat/messages).
 * @param {string} text
 * @returns {string}
 */
export function buildChatTextContent(text) {
  return JSON.stringify({ v: 1, kind: 'text', text });
}

/**
 * Authenticated chat REST flow: list rooms, load messages, send one text message.
 * Requires `API_JWT`. Uses `CHAT_ROOM_ID` when set; otherwise first room from the list.
 * @param {object} [opts]
 * @param {boolean} [opts.markRead] — PATCH …/read after send
 */
export function runChatHttpSession(opts = {}) {
  const markRead = opts.markRead === true;
  const base = resolveApiBaseUrl();
  const headers = {
    ...buildAuthHeaders(),
    'Content-Type': 'application/json',
  };
  const roomsRes = http.get(`${base}/api/chat/rooms?limit=20`, {
    headers,
    tags: { name: 'chat_rooms_list' },
  });
  check(roomsRes, { 'chat rooms 200': (r) => r.status === 200 });
  const roomId = parseFirstRoomId(roomsRes.body || '');
  if (!roomId) {
    check(null, { 'has chat room': () => false });
    return;
  }
  const messagesRes = http.get(
    `${base}/api/chat/rooms/${roomId}/messages?limit=30`,
    { headers, tags: { name: 'chat_messages_list' } },
  );
  check(messagesRes, { 'chat messages 200': (r) => r.status === 200 });
  const suffix = `vu${__VU}-${Date.now()}`;
  const payload = JSON.stringify({
    room_id: roomId,
    content: buildChatTextContent(`k6 load ${suffix}`),
  });
  const postRes = http.post(`${base}/api/chat/messages`, payload, {
    headers,
    tags: { name: 'chat_message_post' },
  });
  check(postRes, {
    'chat post 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  if (markRead) {
    const readRes = http.patch(
      `${base}/api/chat/rooms/${roomId}/read`,
      '{}',
      { headers, tags: { name: 'chat_room_read' } },
    );
    check(readRes, { 'chat read 200': (r) => r.status === 200 });
  }
}
