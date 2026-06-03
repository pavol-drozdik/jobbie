import { runMarketplaceSession } from './lib/marketplace-session.js';

/** Flat concurrent load (~75 VUs for ~5 minutes). Watch host RAM/CPU during the run. */
export const options = {
  vus: 75,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
  },
};

export default function () {
  runMarketplaceSession({
    includeThrottledList: false,
    realisticDelays: true,
  });
}
