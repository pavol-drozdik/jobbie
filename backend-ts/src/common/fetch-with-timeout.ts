import {
  outboundFetchDurationSeconds,
  outboundFetchErrorsTotal,
} from '../observability/metrics';

function parseEnvTimeoutMs(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Default timeout for outbound HTTP from the API (Typesense, Turnstile, Twilio, etc.). */
export const DEFAULT_OUTBOUND_FETCH_TIMEOUT_MS = parseEnvTimeoutMs(
  process.env.HTTP_TIMEOUT_MS,
  15_000,
);

export function resolveOutboundTimeoutMs(
  overrideMs?: number,
  integrationOverrideEnv?: string,
): number {
  if (overrideMs != null && overrideMs > 0) {
    return overrideMs;
  }
  if (integrationOverrideEnv) {
    const fromIntegration = parseEnvTimeoutMs(
      process.env[integrationOverrideEnv],
      DEFAULT_OUTBOUND_FETCH_TIMEOUT_MS,
    );
    if (process.env[integrationOverrideEnv]) {
      return fromIntegration;
    }
  }
  return DEFAULT_OUTBOUND_FETCH_TIMEOUT_MS;
}

export type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
  /** Prometheus label `target` (e.g. typesense, turnstile). Omit to skip metrics. */
  metricsTarget?: string;
};

/**
 * `fetch` with `AbortSignal.timeout` so hung upstream calls do not block workers indefinitely.
 */
export async function fetchWithTimeout(
  url: string,
  init: FetchWithTimeoutInit = {},
): Promise<Response> {
  const timeoutMs = resolveOutboundTimeoutMs(init.timeoutMs);
  const { timeoutMs: _omit, metricsTarget, ...rest } = init;
  const started = Date.now();
  try {
    const response = await fetch(url, {
      ...rest,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (metricsTarget) {
      outboundFetchDurationSeconds.observe(
        { target: metricsTarget },
        (Date.now() - started) / 1000,
      );
    }
    return response;
  } catch (err) {
    if (metricsTarget) {
      outboundFetchErrorsTotal.inc({ target: metricsTarget });
      outboundFetchDurationSeconds.observe(
        { target: metricsTarget },
        (Date.now() - started) / 1000,
      );
    }
    throw err;
  }
}
