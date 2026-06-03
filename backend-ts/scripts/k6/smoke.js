/**
 * Staging smoke / load script for JOBBIE API (k6).
 *
 * Usage:
 *   k6 run -e BASE_URL=https://api.example.com scripts/k6/smoke.js
 *
 * Optional auth (cookie session after login):
 *   k6 run -e BASE_URL=http://localhost:8000 -e JB_AT=<jwt> scripts/k6/smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const jbAt = __ENV.JB_AT || '';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 25 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
};

function headers() {
  const h = { Accept: 'application/json' };
  if (jbAt) {
    h.Cookie = `jb_at=${jbAt}`;
  }
  return h;
}

export default function () {
  const resHealth = http.get(`${baseUrl}/health`, { headers: headers() });
  check(resHealth, { 'health 200': (r) => r.status === 200 });

  const resJobs = http.get(`${baseUrl}/api/jobs?limit=20`, { headers: headers() });
  check(resJobs, {
    'jobs list 200': (r) => r.status === 200,
    'jobs json array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  const resSearch = http.get(`${baseUrl}/api/search/jobs?limit=20&q=`, {
    headers: headers(),
  });
  check(resSearch, { 'search 200': (r) => r.status === 200 });

  sleep(1);
}
