import type {
  VpsComposePsDto,
  VpsContainerStatsDto,
  VpsHostMetricsDto,
} from './admin-infrastructure.dto';

export type VpsBackendInstanceParsed = {
  name: string;
  container_id: string | null;
  status: string | null;
  health: string | null;
  cpu_percent: number | null;
  mem_usage: string | null;
  mem_percent: number | null;
};

const BACKEND_NAME_RE = /backend-\d+$/i;

export function isBackendContainerName(name: string | undefined): boolean {
  if (!name) {
    return false;
  }
  return BACKEND_NAME_RE.test(name);
}

export function isBackendComposeRow(row: VpsComposePsDto): boolean {
  if (row.Service === 'backend') {
    return true;
  }
  return isBackendContainerName(row.Name);
}

export function parseBackendInstances(
  host: VpsHostMetricsDto | null,
): VpsBackendInstanceParsed[] {
  if (!host) {
    return [];
  }

  const statsByName = new Map<string, VpsContainerStatsDto>();
  for (const row of host.containers) {
    if (row.Name) {
      statsByName.set(row.Name, row);
    }
  }

  const composeRows = host.compose_ps.filter(isBackendComposeRow);
  const names = new Set<string>();
  for (const row of composeRows) {
    if (row.Name) {
      names.add(row.Name);
    }
  }
  for (const row of host.containers) {
    if (isBackendContainerName(row.Name)) {
      names.add(row.Name!);
    }
  }

  return [...names]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => {
      const compose = composeRows.find((r) => r.Name === name);
      const stats = statsByName.get(name);
      return {
        name,
        container_id: stats?.ID ?? null,
        status: compose?.Status ?? compose?.State ?? null,
        health: compose?.Health ?? null,
        cpu_percent: parsePercent(stats?.CPUPerc),
        mem_usage: stats?.MemUsage ?? null,
        mem_percent: parsePercent(stats?.MemPerc),
      };
    });
}

export function validateBackendContainerName(name: string): boolean {
  return /^[-a-z0-9_.]+backend-[0-9]+$/i.test(name);
}

function parsePercent(raw?: string): number | null {
  if (!raw) {
    return null;
  }
  const n = Number.parseFloat(raw.replace('%', '').trim());
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.round(n * 10) / 10;
}
