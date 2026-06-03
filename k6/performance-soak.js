/**
 * Two-hour soak outline — run on staging only.
 *   k6 run --env-file k6/.env -e K6_SOAK_DURATION=2h k6/performance-soak.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/$/, '').replace(/\/api$/, '');

export const options = {
  vus: Number(__ENV.K6_SOAK_VUS || 10),
  duration: __ENV.K6_SOAK_DURATION || '30m',
  thresholds: {
    http_req_failed: ['rate<0.02'],
  },
};

export default function () {
  const res = http.get(`${baseUrl}/api/jobs?limit=10`);
  check(res, { ok: (r) => r.status === 200 });
  sleep(3 + Math.random() * 5);
}
