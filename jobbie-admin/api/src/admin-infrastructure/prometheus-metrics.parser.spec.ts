import { parsePrometheusAppMetrics } from './prometheus-metrics.parser';

describe('parsePrometheusAppMetrics', () => {
  it('parses selected gauges and sums http request counters', () => {
    const text = `
# HELP process_resident_memory_bytes Resident memory size in bytes.
process_resident_memory_bytes 134217728
# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
nodejs_heap_size_used_bytes 45000000
nodejs_eventloop_lag_seconds 0.012
jobbie_http_requests_total{method="GET",status_code="200"} 120
jobbie_http_requests_total{method="POST",status_code="500"} 3
`;
    const parsed = parsePrometheusAppMetrics(text);
    expect(parsed.rss_bytes).toBe(134217728);
    expect(parsed.heap_used_bytes).toBe(45000000);
    expect(parsed.eventloop_lag_s).toBe(0.012);
    expect(parsed.http_requests_total).toBe(123);
  });

  it('ignores comments and unknown metrics', () => {
    const parsed = parsePrometheusAppMetrics('# comment only\n');
    expect(parsed).toEqual({});
  });
});
