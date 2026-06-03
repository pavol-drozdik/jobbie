import http from 'k6/http';
import { check, sleep } from 'k6';
import { resolveFrontendUrl } from './lib/config.js';

const FRONTEND_URL = resolveFrontendUrl();

/** Light HTTP checks against the Nuxt app (SSR/HTML), not a real browser. */
export const options = {
  vus: 10,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<4000'],
  },
};

export default function () {
  const home = http.get(FRONTEND_URL, { tags: { name: 'home' } });
  check(home, {
    'home 200': (r) => r.status === 200,
    'home has body': (r) => (r.body || '').length > 200,
  });
  sleep(2);
  const find = http.get(`${FRONTEND_URL}/pracovne-ponuky`, { tags: { name: 'find' } });
  check(find, {
    'find 2xx': (r) => r.status >= 200 && r.status < 400,
  });
  sleep(3);
}
