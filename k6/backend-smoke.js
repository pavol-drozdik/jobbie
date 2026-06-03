import { runMarketplaceSession } from './lib/marketplace-session.js';

/** Single VU baseline: watch CPU/RAM on the host while this runs. */
export const options = {
  vus: 1,
  duration: '2m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  runMarketplaceSession({ includeThrottledList: true });
}
