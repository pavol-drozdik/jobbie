export type VpsDisk = {
  mount: string
  total_bytes: number
  used_bytes: number
  available_bytes: number
  used_percent: number
}

export type VpsContainerStats = {
  Name?: string
  ID?: string
  CPUPerc?: string
  MemUsage?: string
  MemPerc?: string
  NetIO?: string
  BlockIO?: string
}

export type VpsComposePs = {
  Name?: string
  Service?: string
  State?: string
  Status?: string
  Health?: string
}

export type VpsHostMetrics = {
  hostname: string
  uptime_seconds: number
  cpu_count: number
  load_1: number
  load_5: number
  load_15: number
  cpu_per_core?: number[]
  memory_total_bytes: number
  memory_available_bytes: number
  memory_used_bytes: number
  disk_root: VpsDisk | null
  disk_typesense: VpsDisk | null
  containers: VpsContainerStats[]
  compose_ps: VpsComposePs[]
}

export type VpsApiHealth = {
  health_ok: boolean
  latency_ms: number
}

export type VpsAppMetrics = {
  rss_bytes?: number
  heap_used_bytes?: number
  eventloop_lag_s?: number
  http_requests_total?: number
}

export type VpsEnvironment = {
  id: 'staging' | 'production'
  label: string
  configured: {
    ssh: boolean
    health: boolean
    metrics: boolean
  }
  collected_at: string
  errors: {
    ssh?: string
    health?: string
    metrics?: string
  }
  host: VpsHostMetrics | null
  api: VpsApiHealth | null
  app_metrics: VpsAppMetrics | null
}

export type AdminInfrastructure = {
  environments: VpsEnvironment[]
}

export type InfraMetricsRange = '1h' | '24h' | '2w' | '1m'

export type VpsMetricsHistoryPoint = {
  t: string
  load_pct: number
  mem_pct: number
  max_core_pct?: number
  cpu_per_core?: number[]
}

export type VpsMetricsHistory = {
  env_id: 'staging' | 'production'
  range: InfraMetricsRange
  points: VpsMetricsHistoryPoint[]
  coverage_from: string | null
  coverage_to: string | null
}
