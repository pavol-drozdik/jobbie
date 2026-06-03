import type { PostHogExternalDto } from './external-analytics.dto';
import { fetchWithTimeout } from './fetch-timeout.util';
import { toGoogleDate } from '../analytics-date-range.util';

function posthogApiHost(): string {
  const raw =
    process.env.POSTHOG_HOST?.trim() || 'https://eu.i.posthog.com';
  return raw
    .replace(/\/$/, '')
    .replace('eu.i.posthog.com', 'eu.posthog.com')
    .replace('us.i.posthog.com', 'us.posthog.com');
}

export function isPosthogConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PERSONAL_API_KEY?.trim() &&
      process.env.POSTHOG_PROJECT_ID?.trim(),
  );
}

function hogqlDate(iso: string): string {
  return toGoogleDate(iso);
}

async function runHogql(
  projectId: string,
  apiKey: string,
  query: string,
): Promise<unknown> {
  const host = posthogApiHost();
  const res = await fetchWithTimeout(
    `${host}/api/projects/${encodeURIComponent(projectId)}/query/`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { kind: 'HogQLQuery', query },
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PostHog HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    throw new Error('PostHog returned invalid JSON.');
  }
  return json;
}

function extractScalar(result: unknown): number {
  const o = result as {
    results?: unknown[][];
    columns?: string[];
  };
  const cell = o.results?.[0]?.[0];
  const n = typeof cell === 'number' ? cell : Number(cell);
  return Number.isFinite(n) ? n : 0;
}

function extractDaily(result: unknown): { day: string; value: number }[] {
  const o = result as { results?: unknown[][] };
  if (!Array.isArray(o.results)) return [];
  return o.results
    .map((row) => {
      const day = String(row?.[0] ?? '');
      const value = Number(row?.[1]);
      return { day, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((r) => r.day.length > 0);
}

export async function fetchPosthogMetrics(
  fromIso: string,
  toIso: string,
): Promise<PostHogExternalDto> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY!.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID!.trim();
  const from = hogqlDate(fromIso);
  const to = hogqlDate(toIso);

  const usersQuery = `
    SELECT count(DISTINCT person_id) AS users
    FROM events
    WHERE timestamp >= toDateTime('${from} 00:00:00')
      AND timestamp < toDateTime('${to} 23:59:59')
  `;
  const pageviewsQuery = `
    SELECT count() AS pageviews
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDateTime('${from} 00:00:00')
      AND timestamp < toDateTime('${to} 23:59:59')
  `;
  const dailyQuery = `
    SELECT toDate(timestamp) AS day, count() AS pageviews
    FROM events
    WHERE event = '$pageview'
      AND timestamp >= toDateTime('${from} 00:00:00')
      AND timestamp < toDateTime('${to} 23:59:59')
    GROUP BY day
    ORDER BY day
  `;

  const [usersRes, pageviewsRes, dailyRes] = await Promise.all([
    runHogql(projectId, apiKey, usersQuery),
    runHogql(projectId, apiKey, pageviewsQuery),
    runHogql(projectId, apiKey, dailyQuery),
  ]);

  return {
    users: extractScalar(usersRes),
    pageviews: extractScalar(pageviewsRes),
    daily_pageviews: extractDaily(dailyRes),
  };
}

export function posthogDashboardLink(): string | null {
  if (!isPosthogConfigured()) return null;
  const host = posthogApiHost();
  const projectId = process.env.POSTHOG_PROJECT_ID!.trim();
  return `${host}/project/${projectId}`;
}
