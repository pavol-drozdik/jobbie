import type { ClarityExternalDto } from './external-analytics.dto';
import { fetchWithTimeout } from './fetch-timeout.util';

const CACHE_TTL_MS = 45 * 60 * 1000;

type CacheEntry = { expires: number; data: ClarityExternalDto };

let clarityCache: CacheEntry | null = null;

export function isClarityConfigured(): boolean {
  return Boolean(process.env.CLARITY_API_TOKEN?.trim());
}

function sumMetricInformation(
  blocks: unknown[],
  metricName: string,
  field: string,
): number {
  let total = 0;
  for (const block of blocks) {
    const b = block as { metricName?: string; information?: Record<string, unknown>[] };
    if (b.metricName !== metricName || !Array.isArray(b.information)) continue;
    for (const info of b.information) {
      const v = info[field];
      const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
      if (Number.isFinite(n)) total += n;
    }
  }
  return total;
}

function avgMetricInformation(
  blocks: unknown[],
  metricName: string,
  field: string,
): number | null {
  let sum = 0;
  let count = 0;
  for (const block of blocks) {
    const b = block as { metricName?: string; information?: Record<string, unknown>[] };
    if (b.metricName !== metricName || !Array.isArray(b.information)) continue;
    for (const info of b.information) {
      const v = info[field];
      const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : Number(v);
      if (Number.isFinite(n)) {
        sum += n;
        count += 1;
      }
    }
  }
  return count > 0 ? sum / count : null;
}

export async function fetchClarityMetrics(options: {
  fromIso: string;
  toIso: string;
  warnings: string[];
}): Promise<ClarityExternalDto> {
  const now = Date.now();
  if (clarityCache && clarityCache.expires > now) {
    return clarityCache.data;
  }

  const to = new Date(options.toIso);
  const from = new Date(options.fromIso);
  const daysRequested = Math.ceil(
    (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
  );

  let numOfDays = Math.min(3, Math.max(1, daysRequested));
  if (daysRequested > 3) {
    options.warnings.push(
      'Microsoft Clarity API vracia len posledných 1–3 dní; zobrazené KPI sú za posledné 3 dni.',
    );
    numOfDays = 3;
  }

  const token = process.env.CLARITY_API_TOKEN!.trim();
  const url = `https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=${numOfDays}`;
  const res = await fetchWithTimeout(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Clarity HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  let blocks: unknown[];
  try {
    blocks = JSON.parse(text) as unknown[];
  } catch {
    throw new Error('Clarity returned invalid JSON.');
  }
  if (!Array.isArray(blocks)) {
    throw new Error('Clarity response shape unexpected.');
  }

  const sessions = sumMetricInformation(blocks, 'Traffic', 'totalSessionCount');
  const engagementSeconds = avgMetricInformation(
    blocks,
    'Engagement Time',
    'activeTime',
  );
  const rage_clicks = sumMetricInformation(
    blocks,
    'Rage Click Count',
    'subTotal',
  );
  const dead_clicks = sumMetricInformation(
    blocks,
    'Dead Click Count',
    'subTotal',
  );

  const data: ClarityExternalDto = {
    sessions,
    engagement_seconds: engagementSeconds,
    rage_clicks: rage_clicks > 0 ? rage_clicks : null,
    dead_clicks: dead_clicks > 0 ? dead_clicks : null,
    api_days_covered: numOfDays,
  };

  clarityCache = { expires: now + CACHE_TTL_MS, data };
  return data;
}

export function clarityDashboardLink(): string | null {
  if (!isClarityConfigured()) return null;
  return 'https://clarity.microsoft.com/projects';
}
