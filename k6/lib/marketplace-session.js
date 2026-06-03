import http from 'k6/http';
import { check, sleep } from 'k6';
import {
  resolveApiBaseUrl,
  buildAuthHeaders,
  sleepRandomSeconds,
  readEnvFloat,
} from './config.js';

/**
 * Parses first job `id` from a JSON array body, or uses SAMPLE_JOB_ID.
 * @param {string} body
 * @returns {string | null}
 */
function resolveJobIdFromLatestBody(body) {
  const fromEnv = (__ENV.SAMPLE_JOB_ID || '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const arr = JSON.parse(body);
    if (!Array.isArray(arr) || arr.length === 0) {
      return null;
    }
    const id = arr[0].id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * @param {boolean} realistic
 */
function thinkBetweenBrowseSteps(realistic) {
  if (realistic) {
    sleepRandomSeconds(
      readEnvFloat(__ENV.K6_THINK_AFTER_DETAIL_MIN_SEC, 10),
      readEnvFloat(__ENV.K6_THINK_AFTER_DETAIL_MAX_SEC, 24),
    );
    return;
  }
  sleep(2);
}

/**
 * @param {boolean} realistic
 */
function thinkAfterFeatured(realistic) {
  if (realistic) {
    sleepRandomSeconds(
      readEnvFloat(__ENV.K6_THINK_AFTER_FEATURED_MIN_SEC, 6),
      readEnvFloat(__ENV.K6_THINK_AFTER_FEATURED_MAX_SEC, 16),
    );
    return;
  }
  sleep(1);
}

/**
 * @param {boolean} realistic
 */
function thinkAfterTrending(realistic) {
  if (realistic) {
    sleepRandomSeconds(
      readEnvFloat(__ENV.K6_THINK_AFTER_TRENDING_MIN_SEC, 5),
      readEnvFloat(__ENV.K6_THINK_AFTER_TRENDING_MAX_SEC, 14),
    );
    return;
  }
}

/**
 * @param {boolean} realistic
 */
function thinkEndOfIteration(realistic) {
  if (realistic) {
    sleepRandomSeconds(
      readEnvFloat(__ENV.K6_THINK_END_MIN_SEC, 18),
      readEnvFloat(__ENV.K6_THINK_END_MAX_SEC, 42),
    );
    return;
  }
  sleep(3);
}

/**
 * Simulates a read-heavy job marketplace session against the Nest API.
 * @param {object} params
 * @param {boolean} [params.includeThrottledList] — GET /api/jobs?q=… hits per-route throttle (200/min); use false for high-VU runs.
 * @param {boolean} [params.realisticDelays] — Long randomized sleeps + start jitter so many VUs stay under typical API rate limits.
 */
export function runMarketplaceSession(params = {}) {
  const includeThrottledList = params.includeThrottledList === true;
  const realistic = params.realisticDelays === true;
  const base = resolveApiBaseUrl();
  const headers = buildAuthHeaders();
  const paramsHttp = { headers, tags: { group: 'marketplace' } };

  if (realistic) {
    const jitterMax = readEnvFloat(__ENV.K6_START_JITTER_MAX_SEC, 32);
    sleep(Math.random() * jitterMax);
  }

  const healthRes = http.get(`${base}/health`, {
    ...paramsHttp,
    tags: { name: 'health' },
  });
  check(healthRes, { 'health 200': (r) => r.status === 200 });

  if (realistic) {
    sleepRandomSeconds(0.3, 1.8);
  }

  const latestRes = http.get(`${base}/api/jobs/latest?limit=10`, {
    ...paramsHttp,
    tags: { name: 'jobs_latest' },
  });
  check(latestRes, { 'latest 200': (r) => r.status === 200 });

  if (realistic) {
    sleepRandomSeconds(0.2, 1.4);
  }

  const jobId = resolveJobIdFromLatestBody(latestRes.body || '');
  if (jobId) {
    const detailRes = http.get(`${base}/api/jobs/${jobId}`, {
      ...paramsHttp,
      tags: { name: 'job_detail' },
    });
    check(detailRes, { 'detail 200': (r) => r.status === 200 });
  }

  thinkBetweenBrowseSteps(realistic);

  const featuredRes = http.get(`${base}/api/jobs/featured?limit=12`, {
    ...paramsHttp,
    tags: { name: 'jobs_featured' },
  });
  check(featuredRes, { 'featured 2xx': (r) => r.status >= 200 && r.status < 300 });

  thinkAfterFeatured(realistic);

  const trendingRes = http.get(`${base}/api/jobs/trending?limit=12`, {
    ...paramsHttp,
    tags: { name: 'jobs_trending' },
  });
  check(trendingRes, { 'trending 2xx': (r) => r.status >= 200 && r.status < 300 });

  if (realistic) {
    thinkAfterTrending(realistic);
  }

  if (includeThrottledList) {
    const searchRes = http.get(`${base}/api/jobs?q=developer&limit=20`, {
      ...paramsHttp,
      tags: { name: 'jobs_list_search' },
    });
    check(searchRes, {
      'list search 2xx': (r) => r.status >= 200 && r.status < 300,
    });
    if (realistic) {
      sleepRandomSeconds(
        readEnvFloat(__ENV.K6_THINK_AFTER_SEARCH_MIN_SEC, 6),
        readEnvFloat(__ENV.K6_THINK_AFTER_SEARCH_MAX_SEC, 16),
      );
    }
  }

  thinkEndOfIteration(realistic);
}
