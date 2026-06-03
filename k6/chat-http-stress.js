import { runChatHttpSession } from './lib/chat-http.js';
import { sleepRandomSeconds, readEnvFloat } from './lib/config.js';

/**
 * Stress chat via REST (persists messages). Requires API_JWT and a room the user can access.
 * Set CHAT_ROOM_ID to skip an extra list call and target one room.
 */
export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '2m', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  runChatHttpSession({ markRead: false });
  sleepRandomSeconds(
    readEnvFloat(__ENV.K6_CHAT_THINK_MIN_SEC, 4),
    readEnvFloat(__ENV.K6_CHAT_THINK_MAX_SEC, 18),
  );
}
