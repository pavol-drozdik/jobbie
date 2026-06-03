import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
  name: 'jobbie_http_requests_total',
  help: 'Total HTTP API requests (NestJS)',
  labelNames: ['method', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'jobbie_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path_group'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const outboundFetchDurationSeconds = new Histogram({
  name: 'jobbie_outbound_fetch_duration_seconds',
  help: 'Outbound HTTP client duration (Typesense, Turnstile, Twilio, etc.)',
  labelNames: ['target'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [metricsRegistry],
});

export const outboundFetchErrorsTotal = new Counter({
  name: 'jobbie_outbound_fetch_errors_total',
  help: 'Outbound HTTP client failures (timeout or network)',
  labelNames: ['target'],
  registers: [metricsRegistry],
});

export const profileAuthCacheHitsTotal = new Counter({
  name: 'jobbie_profile_auth_cache_hits_total',
  help: 'Profile auth cache hits',
  labelNames: ['layer'],
  registers: [metricsRegistry],
});

export const profileAuthCacheMissesTotal = new Counter({
  name: 'jobbie_profile_auth_cache_misses_total',
  help: 'Profile auth cache misses',
  registers: [metricsRegistry],
});

export const profileAuthCacheInvalidationsTotal = new Counter({
  name: 'jobbie_profile_auth_cache_invalidations_total',
  help: 'Profile auth cache invalidations',
  registers: [metricsRegistry],
});

export const feedCacheEntriesGauge = new Counter({
  name: 'jobbie_feed_cache_evictions_total',
  help: 'Feed engagement in-memory cache evictions',
  registers: [metricsRegistry],
});

export const bullJobDurationSeconds = new Histogram({
  name: 'jobbie_bull_job_duration_seconds',
  help: 'BullMQ background job duration',
  labelNames: ['job_name'],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
  registers: [metricsRegistry],
});

export const stripeWebhookDurationSeconds = new Histogram({
  name: 'jobbie_stripe_webhook_duration_seconds',
  help: 'Stripe webhook handler duration',
  labelNames: ['event_type'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [metricsRegistry],
});

export const cvDbShellScanCappedTotal = new Counter({
  name: 'jobbie_cv_db_shell_scan_capped_total',
  help: 'Employer CV database list hit MAX_SHELL_SCAN cap',
  registers: [metricsRegistry],
});

export const applicantListDurationSeconds = new Histogram({
  name: 'jobbie_applicant_list_duration_seconds',
  help: 'Employer applicants list handler duration',
  labelNames: ['source'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

/**
 * Collapse path to a small cardinality label (first segments of the route).
 */
export function pathGroupForMetrics(path: string, maxSegments = 4): string {
  const clean = path.split('?')[0] || '/';
  const parts = clean.split('/').filter(Boolean);
  const slice = parts.slice(0, maxSegments);
  if (slice.length === 0) {
    return '/';
  }
  return `/${slice.join('/')}`;
}
