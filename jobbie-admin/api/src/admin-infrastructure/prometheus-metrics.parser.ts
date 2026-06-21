/**
 * Minimal Prometheus text exposition parser for selected Node.js / app gauges.
 */
export type ParsedAppMetrics = {
  rss_bytes?: number;
  heap_used_bytes?: number;
  eventloop_lag_s?: number;
  http_requests_total?: number;
};

function parseMetricValue(line: string): number | null {
  const space = line.lastIndexOf(' ');
  if (space <= 0) return null;
  const raw = line.slice(space + 1).trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function metricBaseName(line: string): string | null {
  const space = line.indexOf(' ');
  if (space <= 0) return null;
  let name = line.slice(0, space);
  const brace = name.indexOf('{');
  if (brace >= 0) name = name.slice(0, brace);
  return name;
}

export function parsePrometheusAppMetrics(text: string): ParsedAppMetrics {
  const out: ParsedAppMetrics = {};
  let httpTotal = 0;
  let httpHasAny = false;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const name = metricBaseName(line);
    if (!name) continue;
    const value = parseMetricValue(line);
    if (value === null) continue;

    switch (name) {
      case 'process_resident_memory_bytes':
        out.rss_bytes = value;
        break;
      case 'nodejs_heap_size_used_bytes':
        out.heap_used_bytes = value;
        break;
      case 'nodejs_eventloop_lag_seconds':
        out.eventloop_lag_s = value;
        break;
      case 'jobbie_http_requests_total':
        httpTotal += value;
        httpHasAny = true;
        break;
      default:
        break;
    }
  }

  if (httpHasAny) {
    out.http_requests_total = httpTotal;
  }

  return out;
}
