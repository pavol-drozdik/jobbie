import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import type { VpsHostMetricsDto } from './admin-infrastructure.dto';

export type InfraMetricsRange = '1h' | '24h' | '2w' | '1m';

export type VpsMetricsHistoryPoint = {
  t: string;
  load_pct: number;
  mem_pct: number;
  max_core_pct?: number;
  cpu_per_core?: number[];
};

type StoredPoint = VpsMetricsHistoryPoint & {
  load_1: number;
};

type HistoryStore = Partial<Record<'staging' | 'production', StoredPoint[]>>;

const RANGE_MS: Record<InfraMetricsRange, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '2w': 14 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
};

const BUCKET_MS: Record<InfraMetricsRange, number> = {
  '1h': 60 * 1000,
  '24h': 5 * 60 * 1000,
  '2w': 30 * 60 * 1000,
  '1m': 2 * 60 * 60 * 1000,
};

const RETENTION_MS = 35 * 24 * 60 * 60 * 1000;
const MIN_RECORD_INTERVAL_MS = 4 * 60 * 1000;
const MAX_POINTS = 240;

@Injectable()
export class VpsMetricsHistoryService implements OnModuleInit, OnModuleDestroy {
  private store: HistoryStore = {};
  private filePath: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor() {
    const configured = process.env.INFRA_METRICS_HISTORY_PATH?.trim();
    this.filePath =
      configured ||
      path.join(process.cwd(), '.data', 'infrastructure-history.json');
  }

  onModuleInit(): void {
    this.loadFromDisk();
  }

  onModuleDestroy(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.flushToDisk();
  }

  recordSample(
    envId: 'staging' | 'production',
    host: VpsHostMetricsDto,
    at = new Date(),
  ): void {
    const series = this.store[envId] ?? [];
    const last = series[series.length - 1];
    if (last) {
      const elapsed = at.getTime() - new Date(last.t).getTime();
      if (elapsed < MIN_RECORD_INTERVAL_MS) {
        return;
      }
    }

    const load_pct = host.cpu_count > 0 ? (host.load_1 / host.cpu_count) * 100 : 0;
    const mem_pct =
      host.memory_total_bytes > 0
        ? (host.memory_used_bytes / host.memory_total_bytes) * 100
        : 0;
    const max_core_pct = maxCorePct(host.cpu_per_core);
    const cpu_per_core = normalizeCoreSamples(host.cpu_per_core);

    const point: StoredPoint = {
      t: at.toISOString(),
      load_pct: round1(load_pct),
      mem_pct: round1(mem_pct),
      load_1: host.load_1,
      ...(max_core_pct != null ? { max_core_pct } : {}),
      ...(cpu_per_core ? { cpu_per_core } : {}),
    };

    series.push(point);
    this.store[envId] = this.pruneSeries(series);
    this.scheduleSave();
  }

  getHistory(
    envId: 'staging' | 'production',
    range: InfraMetricsRange,
    now = new Date(),
  ): VpsMetricsHistoryPoint[] {
    const series = this.store[envId] ?? [];
    const since = now.getTime() - RANGE_MS[range];
    const inRange = series.filter((p) => new Date(p.t).getTime() >= since);
    return downsample(inRange, BUCKET_MS[range], MAX_POINTS).map(
      ({ load_1: _load1, ...rest }) => rest,
    );
  }

  private pruneSeries(series: StoredPoint[]): StoredPoint[] {
    const cutoff = Date.now() - RETENTION_MS;
    return series.filter((p) => new Date(p.t).getTime() >= cutoff);
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as HistoryStore;
      if (!parsed || typeof parsed !== 'object') {
        return;
      }
      for (const key of ['staging', 'production'] as const) {
        const rows = parsed[key];
        if (Array.isArray(rows)) {
          this.store[key] = this.pruneSeries(
            rows.filter(isStoredPoint).map(sanitizeStoredPoint),
          );
        }
      }
    } catch {
      this.store = {};
    }
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) {
      return;
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushToDisk();
    }, 2000);
    this.saveTimer.unref?.();
  }

  private flushToDisk(): void {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.store), 'utf8');
    } catch {
      // Best-effort local cache; dashboard still works without persistence.
    }
  }
}

function isStoredPoint(value: unknown): value is StoredPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as StoredPoint;
  return (
    typeof row.t === 'string' &&
    Number.isFinite(row.load_pct) &&
    Number.isFinite(row.mem_pct) &&
    Number.isFinite(row.load_1)
  );
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function clampCorePct(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return round1(Math.min(100, Math.max(0, n)));
}

export function maxCorePct(cores?: number[]): number | undefined {
  if (!cores?.length) {
    return undefined;
  }
  const valid = cores.filter((n) => Number.isFinite(n));
  if (!valid.length) {
    return undefined;
  }
  return round1(Math.max(...valid));
}

function normalizeCoreSamples(cores?: number[]): number[] | undefined {
  if (!cores?.length) {
    return undefined;
  }
  const valid = cores.filter((n) => Number.isFinite(n));
  if (!valid.length) {
    return undefined;
  }
  return valid.map((n) => clampCorePct(n));
}

function sanitizeStoredPoint(point: StoredPoint): StoredPoint {
  if (!point.cpu_per_core?.length) {
    return point;
  }
  const cpu_per_core = point.cpu_per_core.map((n) => clampCorePct(n));
  const max_core_pct = maxCorePct(cpu_per_core);
  return {
    ...point,
    cpu_per_core,
    ...(max_core_pct != null ? { max_core_pct } : {}),
  };
}

function averageCores(bucket: StoredPoint[]): number[] | undefined {
  const withCores = bucket.filter((p) => p.cpu_per_core?.length);
  if (!withCores.length) {
    return undefined;
  }
  const coreCount = Math.max(...withCores.map((p) => p.cpu_per_core!.length));
  const averaged: number[] = [];
  for (let i = 0; i < coreCount; i += 1) {
    const values = withCores
      .map((p) => p.cpu_per_core![i])
      .filter((n) => Number.isFinite(n));
    averaged.push(
      values.length
        ? clampCorePct(values.reduce((sum, n) => sum + n, 0) / values.length)
        : 0,
    );
  }
  return averaged;
}

export function downsample(
  points: StoredPoint[],
  bucketMs: number,
  maxPoints: number,
): StoredPoint[] {
  if (points.length === 0) {
    return [];
  }
  if (points.length <= maxPoints) {
    return points;
  }

  const buckets = new Map<number, StoredPoint[]>();
  for (const point of points) {
    const ts = new Date(point.t).getTime();
    const key = Math.floor(ts / bucketMs) * bucketMs;
    const bucket = buckets.get(key) ?? [];
    bucket.push(point);
    buckets.set(key, bucket);
  }

  const averaged = [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, bucket]) => averageBucket(bucket));

  if (averaged.length <= maxPoints) {
    return averaged;
  }

  const stride = Math.ceil(averaged.length / maxPoints);
  return averaged.filter((_, i) => i % stride === 0);
}

function averageBucket(bucket: StoredPoint[]): StoredPoint {
  const load_pct =
    bucket.reduce((sum, p) => sum + p.load_pct, 0) / bucket.length;
  const mem_pct =
    bucket.reduce((sum, p) => sum + p.mem_pct, 0) / bucket.length;
  const load_1 =
    bucket.reduce((sum, p) => sum + p.load_1, 0) / bucket.length;
  const withMax = bucket.filter((p) => p.max_core_pct != null);
  const max_core_pct =
    withMax.length > 0
      ? round1(
          withMax.reduce((sum, p) => sum + (p.max_core_pct ?? 0), 0) /
            withMax.length,
        )
      : undefined;
  const cpu_per_core = averageCores(bucket);
  const mid = bucket[Math.floor(bucket.length / 2)];
  return {
    t: mid.t,
    load_pct: round1(load_pct),
    mem_pct: round1(mem_pct),
    load_1: round1(load_1),
    ...(max_core_pct != null ? { max_core_pct } : {}),
    ...(cpu_per_core ? { cpu_per_core } : {}),
  };
}
