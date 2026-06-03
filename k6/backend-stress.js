import { runMarketplaceSession } from './lib/marketplace-session.js';

/** Push load in staging; do not use includeThrottledList at high VU (429 risk). */
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<5000'],
  },
};

export default function () {
  runMarketplaceSession({
    includeThrottledList: false,
    realisticDelays: true,
  });
}
