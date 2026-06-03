import ws from 'k6/ws';
import { check } from 'k6';
import {
  resolveApiBaseUrl,
  buildAuthHeaders,
  httpBaseToWsBase,
  sleepRandomSeconds,
  readEnvFloat,
} from './lib/config.js';
import { buildChatTextContent } from './lib/chat-http.js';
import {
  encodeEventPacket,
  parseSocketIoPacket,
  stripEngineMessagePrefix,
} from './lib/socket-io-wire.js';

/**
 * Socket.IO (Engine.IO v4) over WebSocket: join_room, typing_start/stop, message.
 * JWT: `Authorization: Bearer …` on the WS upgrade (same as PWA `useRealtimeSocket`).
 *
 * Requires `API_JWT` and `CHAT_ROOM_ID`.
 */
export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '2m', target: 40 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.8'],
  },
};

const CONNECT_MS = 20000;

/**
 * @param {string} msg
 * @returns {boolean}
 */
function isEngineOpenPacket(msg) {
  if (!msg.startsWith('0{')) {
    return false;
  }
  try {
    const o = JSON.parse(msg.slice(1));
    return Boolean(o && Array.isArray(o.upgrades));
  } catch {
    return false;
  }
}

export default function () {
  const base = resolveApiBaseUrl();
  const roomId = (__ENV.CHAT_ROOM_ID || '').trim();
  const auth = buildAuthHeaders();
  if (!auth.Authorization || !roomId) {
    check(null, { 'API_JWT and CHAT_ROOM_ID set': () => false });
    return;
  }
  const wsRoot = httpBaseToWsBase(base);
  const url = `${wsRoot}/socket.io/?EIO=4&transport=websocket`;
  let engineOpen = false;
  let nsOpen = false;
  let joinAck = false;
  let typingStartAck = false;
  let typingStopAck = false;
  let messageAck = false;
  const res = ws.connect(
    url,
    { headers: auth },
    (socket) => {
      socket.setTimeout(() => {
        socket.close();
      }, CONNECT_MS);
      socket.on('message', (raw) => {
        const msg = String(raw);
        if (msg === '2' || msg === '2probe') {
          socket.send(msg === '2probe' ? '3probe' : '3');
          return;
        }
        if (isEngineOpenPacket(msg)) {
          engineOpen = true;
          socket.send('40');
          return;
        }
        if (!msg.startsWith('4')) {
          return;
        }
        const inner = stripEngineMessagePrefix(msg);
        if (inner.startsWith('0{')) {
          try {
            const o = JSON.parse(inner.slice(1));
            if (!o.upgrades) {
              nsOpen = true;
              socket.send(
                encodeEventPacket(1, ['join_room', { room_id: roomId }]),
              );
            }
          } catch {
            /* noop */
          }
          return;
        }
        const parsed = parseSocketIoPacket(inner);
        if (!parsed) {
          return;
        }
        if (parsed.kind === 'ack') {
          if (parsed.ackId === 1) {
            const row = parsed.data[0];
            joinAck = Boolean(row && row.ok === true);
            if (joinAck) {
              socket.send(
                encodeEventPacket(2, ['typing_start', { room_id: roomId }]),
              );
            }
            return;
          }
          if (parsed.ackId === 2) {
            const row = parsed.data[0];
            typingStartAck = Boolean(row && row.ok === true);
            if (typingStartAck) {
              socket.send(
                encodeEventPacket(3, ['typing_stop', { room_id: roomId }]),
              );
            }
            return;
          }
          if (parsed.ackId === 3) {
            const row = parsed.data[0];
            typingStopAck = Boolean(row && row.ok === true);
            if (typingStopAck) {
              const content = buildChatTextContent(
                `k6 socket vu${__VU} ${Date.now()}`,
              );
              socket.send(
                encodeEventPacket(4, [
                  'message',
                  { room_id: roomId, content },
                ]),
              );
            }
            return;
          }
          if (parsed.ackId === 4) {
            const row = parsed.data[0];
            messageAck = Boolean(row && row.ok === true);
            socket.close();
            return;
          }
          return;
        }
        if (parsed.kind === 'event' && parsed.data[0] === 'message') {
          /* broadcast echo; optional */
        }
      });
    },
  );
  check(res, { 'ws status 101': (r) => r && r.status === 101 });
  check(null, { 'engine open': () => engineOpen });
  check(null, { 'namespace open': () => nsOpen });
  check(null, { 'join_room ack ok': () => joinAck });
  check(null, { 'typing_start ack ok': () => typingStartAck });
  check(null, { 'typing_stop ack ok': () => typingStopAck });
  check(null, { 'message ack ok': () => messageAck });
  sleepRandomSeconds(
    readEnvFloat(__ENV.K6_CHAT_THINK_MIN_SEC, 6),
    readEnvFloat(__ENV.K6_CHAT_THINK_MAX_SEC, 22),
  );
}
