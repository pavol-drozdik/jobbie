export type VpsDiskDto = {
  mount: string;
  total_bytes: number;
  used_bytes: number;
  available_bytes: number;
  used_percent: number;
};

export type VpsContainerStatsDto = {
  Name?: string;
  ID?: string;
  CPUPerc?: string;
  MemUsage?: string;
  MemPerc?: string;
  NetIO?: string;
  BlockIO?: string;
};

export type VpsComposePsDto = {
  Name?: string;
  Service?: string;
  State?: string;
  Status?: string;
  Health?: string;
};

export type VpsHostMetricsDto = {
  hostname: string;
  uptime_seconds: number;
  cpu_count: number;
  load_1: number;
  load_5: number;
  load_15: number;
  /** Instantaneous per-core utilization % (1s sample from /proc/stat). */
  cpu_per_core?: number[];
  memory_total_bytes: number;
  memory_available_bytes: number;
  memory_used_bytes: number;
  disk_root: VpsDiskDto | null;
  disk_typesense: VpsDiskDto | null;
  containers: VpsContainerStatsDto[];
  compose_ps: VpsComposePsDto[];
};

export type VpsApiHealthDto = {
  health_ok: boolean;
  latency_ms: number;
};

export type VpsAppMetricsDto = {
  rss_bytes?: number;
  heap_used_bytes?: number;
  eventloop_lag_s?: number;
  http_requests_total?: number;
};

export type VpsEnvironmentDto = {
  id: 'staging' | 'production';
  label: string;
  configured: {
    ssh: boolean;
    health: boolean;
    metrics: boolean;
  };
  collected_at: string;
  errors: {
    ssh?: string;
    health?: string;
    metrics?: string;
  };
  host: VpsHostMetricsDto | null;
  api: VpsApiHealthDto | null;
  app_metrics: VpsAppMetricsDto | null;
};

export type AdminInfrastructureDto = {
  environments: VpsEnvironmentDto[];
};

export type InfraMetricsRangeDto = '1h' | '24h' | '2w' | '1m';

export type VpsMetricsHistoryPointDto = {
  t: string;
  load_pct: number;
  mem_pct: number;
  max_core_pct?: number;
  cpu_per_core?: number[];
};

export type VpsMetricsHistoryDto = {
  env_id: 'staging' | 'production';
  range: InfraMetricsRangeDto;
  points: VpsMetricsHistoryPointDto[];
};
