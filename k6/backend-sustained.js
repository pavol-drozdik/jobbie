import { runMarketplaceSession } from './lib/marketplace-session.js';

/**
 * Ramp and hold concurrent VUs. Throttled list search is off by default
 * (set HIT_THROTTLED_LIST=1 for low VU runs only — see README).
 */
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2500'],
  },
};

export default function () {
  const hitList = __ENV.HIT_THROTTLED_LIST === '1';
  runMarketplaceSession({
    includeThrottledList: hitList,
    realisticDelays: true,
  });
}
