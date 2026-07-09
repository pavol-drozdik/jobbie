export const AUTOSCALE_RESERVE_RAM_MB = 2800;
export const AUTOSCALE_PER_REPLICA_RAM_MB = 1024;
export const AUTOSCALE_RESERVE_CPU = 1.5;
export const AUTOSCALE_ABSOLUTE_MAX = 8;

export type BackendCapacity = {
  current_scale: number;
  max_replicas: number;
  autoscale_enabled: boolean;
  redis_configured: boolean;
  deploy_lock: boolean;
  cpu_count?: number;
  mem_total_mb?: number;
};

export function computeMaxReplicas(
  cpuCount: number,
  memTotalMb: number,
  opts?: {
    reserveRamMb?: number;
    perReplicaRamMb?: number;
    reserveCpu?: number;
    absoluteMax?: number;
  },
): number {
  const reserveRamMb = opts?.reserveRamMb ?? AUTOSCALE_RESERVE_RAM_MB;
  const perReplicaRamMb = opts?.perReplicaRamMb ?? AUTOSCALE_PER_REPLICA_RAM_MB;
  const reserveCpu = opts?.reserveCpu ?? AUTOSCALE_RESERVE_CPU;
  const absoluteMax = opts?.absoluteMax ?? AUTOSCALE_ABSOLUTE_MAX;

  const maxByRam = Math.floor((memTotalMb - reserveRamMb) / perReplicaRamMb);
  const maxByCpu = Math.max(1, Math.floor(cpuCount - reserveCpu));
  let maxReplicas = Math.min(maxByRam, maxByCpu);
  if (!Number.isFinite(maxReplicas) || maxReplicas < 1) {
    maxReplicas = 1;
  }
  return Math.min(maxReplicas, absoluteMax);
}

export function parseBackendCapacityJson(stdout: string): BackendCapacity | null {
  const line = stdout
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('{'));
  if (!line) {
    return null;
  }
  try {
    const row = JSON.parse(line) as Record<string, unknown>;
    return {
      current_scale: toInt(row.current_scale, 1),
      max_replicas: toInt(row.max_replicas, 1),
      autoscale_enabled: row.autoscale_enabled === 1 || row.autoscale_enabled === true,
      redis_configured: row.redis_configured === 1 || row.redis_configured === true,
      deploy_lock: row.deploy_lock === 1 || row.deploy_lock === true,
      cpu_count: toOptionalInt(row.cpu_count),
      mem_total_mb: toOptionalInt(row.mem_total_mb),
    };
  } catch {
    return null;
  }
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function toOptionalInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
}
