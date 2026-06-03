/**
 * Representative API flows for performance baseline (k6).
 *
 *   k6 run --env-file k6/.env k6/performance-baseline.js
 *
 * Optional:
 *   API_JWT, EMPLOYER_JOB_ID, APPLICANTS_JOB_ID_10|100|1000, CHAT_ROOM_ID
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const baseUrl = (__ENV.BASE_URL || 'http://localhost:8000').replace(/\/$/, '').replace(/\/api$/, '');
const apiJwt = __ENV.API_JWT || '';
const employerJobId = __ENV.EMPLOYER_JOB_ID || '';
const chatRoomId = __ENV.CHAT_ROOM_ID || '';

const jobsListTrend = new Trend('baseline_jobs_list', true);
const searchTrend = new Trend('baseline_search', true);
const applicantsTrend = new Trend('baseline_applicants', true);
const chatRoomsTrend = new Trend('baseline_chat_rooms', true);
const authMeTrend = new Trend('baseline_auth_me', true);

export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      vus: Number(__ENV.K6_BASELINE_VUS || 3),
      duration: __ENV.K6_BASELINE_DURATION || '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

function headers() {
  const h = { Accept: 'application/json' };
  if (apiJwt) {
    h.Authorization = apiJwt.startsWith('Bearer ') ? apiJwt : `Bearer ${apiJwt}`;
  }
  return h;
}

export default function () {
  group('health', () => {
    const res = http.get(`${baseUrl}/health`);
    check(res, { 'health ok': (r) => r.status === 200 });
  });

  group('jobs_list_anon', () => {
    const res = http.get(`${baseUrl}/api/jobs?limit=20`, { headers: headers() });
    jobsListTrend.add(res.timings.duration);
    check(res, { 'jobs 200': (r) => r.status === 200 });
  });

  if (apiJwt) {
    group('auth_me', () => {
      const res = http.get(`${baseUrl}/api/auth/me`, { headers: headers() });
      authMeTrend.add(res.timings.duration);
      check(res, { 'auth me': (r) => r.status === 200 });
    });

    group('jobs_list_auth', () => {
      const res = http.get(`${baseUrl}/api/jobs?limit=20`, { headers: headers() });
      jobsListTrend.add(res.timings.duration);
      check(res, { 'jobs auth 200': (r) => r.status === 200 });
    });

    group('search', () => {
      const res = http.get(`${baseUrl}/api/search/jobs?limit=20&q=`, { headers: headers() });
      searchTrend.add(res.timings.duration);
      check(res, { 'search 200': (r) => r.status === 200 });
    });

    group('chat_rooms', () => {
      const res = http.get(`${baseUrl}/api/chat/rooms?limit=50`, { headers: headers() });
      chatRoomsTrend.add(res.timings.duration);
      check(res, { 'chat rooms': (r) => r.status === 200 });
      if (res.status === 200 && !chatRoomId) {
        try {
          const rooms = res.json();
          if (Array.isArray(rooms) && rooms[0]?.id) {
            http.get(`${baseUrl}/api/chat/rooms/${rooms[0].id}/messages?limit=50`, {
              headers: headers(),
            });
          }
        } catch {
          // ignore
        }
      }
    });

    if (employerJobId) {
      group('employer_applicants', () => {
        const res = http.get(
          `${baseUrl}/api/employer/jobs/${employerJobId}/applicants?limit=50`,
          { headers: headers() },
        );
        applicantsTrend.add(res.timings.duration);
        check(res, { 'applicants': (r) => r.status === 200 });
      });
    }
  }

  sleep(Number(__ENV.K6_BASELINE_SLEEP_SEC || 2));
}
