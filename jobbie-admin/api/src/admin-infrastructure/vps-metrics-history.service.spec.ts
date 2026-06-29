import {
  clampCorePct,
  downsample,
  maxCorePct,
  VpsMetricsHistoryService,
} from './vps-metrics-history.service';

describe('VpsMetricsHistoryService', () => {
  it('dedupes samples inside the minimum interval', () => {
    const service = new VpsMetricsHistoryService();
    const host = {
      hostname: 'vps',
      uptime_seconds: 100,
      cpu_count: 2,
      load_1: 0.2,
      load_5: 0.1,
      load_15: 0.1,
      memory_total_bytes: 1000,
      memory_available_bytes: 500,
      memory_used_bytes: 500,
      disk_root: null,
      disk_typesense: null,
      containers: [],
      compose_ps: [],
    };
    const at = new Date('2026-06-29T12:00:00.000Z');

    service.recordSample('staging', host, at);
    service.recordSample('staging', host, new Date(at.getTime() + 60_000));

    const points = service.getHistory('staging', '1h', at);
    expect(points).toHaveLength(1);
    expect(points[0].load_pct).toBe(10);
    expect(points[0].mem_pct).toBe(50);
  });

  it('records max_core_pct when per-core samples exist', () => {
    const service = new VpsMetricsHistoryService();
    const host = {
      hostname: 'vps',
      uptime_seconds: 100,
      cpu_count: 4,
      load_1: 0.8,
      load_5: 0.5,
      load_15: 0.4,
      cpu_per_core: [12.5, 85.2, 3.1, 4.0],
      memory_total_bytes: 1000,
      memory_available_bytes: 500,
      memory_used_bytes: 500,
      disk_root: null,
      disk_typesense: null,
      containers: [],
      compose_ps: [],
    };
    const at = new Date('2026-06-29T12:00:00.000Z');
    service.recordSample('staging', host, at);
    const points = service.getHistory('staging', '1h', at);
    expect(points[0].max_core_pct).toBe(85.2);
    expect(points[0].cpu_per_core).toEqual([12.5, 85.2, 3.1, 4]);
  });

  it('clamps negative per-core samples on record', () => {
    const service = new VpsMetricsHistoryService();
    const host = {
      hostname: 'vps',
      uptime_seconds: 100,
      cpu_count: 2,
      load_1: 0.2,
      load_5: 0.1,
      load_15: 0.1,
      cpu_per_core: [-300, 42],
      memory_total_bytes: 1000,
      memory_available_bytes: 500,
      memory_used_bytes: 500,
      disk_root: null,
      disk_typesense: null,
      containers: [],
      compose_ps: [],
    };
    const at = new Date('2026-06-29T13:00:00.000Z');
    service.recordSample('staging', host, at);
    const points = service.getHistory('staging', '1h', at);
    expect(points[0].cpu_per_core).toEqual([0, 42]);
    expect(points[0].max_core_pct).toBe(42);
  });

  it('filters and downsamples history by range', () => {
    const service = new VpsMetricsHistoryService();
    const host = {
      hostname: 'vps',
      uptime_seconds: 100,
      cpu_count: 1,
      load_1: 1,
      load_5: 1,
      load_15: 1,
      memory_total_bytes: 100,
      memory_available_bytes: 0,
      memory_used_bytes: 100,
      disk_root: null,
      disk_typesense: null,
      containers: [],
      compose_ps: [],
    };
    const base = new Date('2026-06-29T12:00:00.000Z').getTime();
    for (let i = 0; i < 20; i++) {
      service.recordSample(
        'production',
        host,
        new Date(base + i * 5 * 60 * 1000),
      );
    }

    const points = service.getHistory(
      'production',
      '1h',
      new Date(base + 19 * 5 * 60 * 1000),
    );
    expect(points.length).toBeGreaterThan(0);
    expect(points.length).toBeLessThanOrEqual(13);
  });
});

describe('clampCorePct', () => {
  it('clamps invalid and out-of-range values to 0–100', () => {
    expect(clampCorePct(-300)).toBe(0);
    expect(clampCorePct(150)).toBe(100);
    expect(clampCorePct(42.456)).toBe(42.5);
    expect(clampCorePct(Number.NaN)).toBe(0);
  });
});

describe('maxCorePct', () => {
  it('returns highest core utilization', () => {
    expect(maxCorePct([10, 85.2, 3])).toBe(85.2);
    expect(maxCorePct([])).toBeUndefined();
    expect(maxCorePct(undefined)).toBeUndefined();
  });
});

describe('downsample', () => {
  const mk = (i: number) => ({
    t: new Date(i * 60_000).toISOString(),
    load_pct: i,
    mem_pct: i,
    load_1: i / 100,
  });

  it('returns input when under max points', () => {
    const points = [mk(1), mk(2), mk(3)];
    expect(downsample(points, 60_000, 10)).toEqual(points);
  });

  it('averages into buckets when over max points', () => {
    const points = Array.from({ length: 30 }, (_, i) => mk(i));
    const out = downsample(points, 60_000, 10);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out[0].load_pct).toBeGreaterThanOrEqual(0);
  });
});
