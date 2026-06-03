import { sleep } from 'k6';

/**
 * Sleeps a uniformly random duration in [minSec, maxSec] (inclusive-ish on the lower bound).
 * Use between HTTP steps to de-synchronize VUs and mimic human think time.
 * @param {number} minSec
 * @param {number} maxSec
 */
export function sleepRandomSeconds(minSec, maxSec) {
  const lo = Math.min(minSec, maxSec);
  const hi = Math.max(minSec, maxSec);
  sleep(lo + Math.random() * (hi - lo));
}

/**
 * Parses a positive float from env, or returns `fallback`.
 * @param {string | undefined} raw
 * @param {number} fallback
 * @returns {number}
 */
export function readEnvFloat(raw, fallback) {
  const n = Number.parseFloat(String(raw ?? '').trim());
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}

/**
 * API origin without trailing slash. Strips a trailing `/api` so you can paste
 * the same value as `NUXT_PUBLIC_API_BASE_URL` from the PWA.
 * @returns {string}
 */
export function resolveApiBaseUrl() {
  let base = (__ENV.BASE_URL || '').trim().replace(/\/+$/, '');
  if (!base) {
    base = 'http://localhost:3001';
  }
  if (base.toLowerCase().endsWith('/api')) {
    base = base.replace(/\/api$/i, '');
  }
  return base;
}

/**
 * Nuxt public origin (no trailing slash).
 * @returns {string}
 */
export function resolveFrontendUrl() {
  return (__ENV.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Optional Bearer JWT (Supabase access token).
 * @returns {Record<string, string>}
 */
export function buildAuthHeaders() {
  const token = (__ENV.API_JWT || '').trim();
  if (!token) {
    return {};
  }
  const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return { Authorization: value };
}

/**
 * @returns {string}
 */
export function httpBaseToWsBase(httpBase) {
  if (httpBase.startsWith('https://')) {
    return `wss://${httpBase.slice('https://'.length)}`;
  }
  if (httpBase.startsWith('http://')) {
    return `ws://${httpBase.slice('http://'.length)}`;
  }
  return httpBase;
}
