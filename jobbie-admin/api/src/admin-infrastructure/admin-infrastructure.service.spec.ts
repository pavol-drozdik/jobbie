import { AdminInfrastructureService } from './admin-infrastructure.service';
import * as vpsConfig from './vps-environment.config';
import type { VpsEnvironmentConfig } from './vps-environment.config';

const stagingOnly: VpsEnvironmentConfig = {
  id: 'staging',
  label: 'Staging',
  ssh: {
    host: 'staging.test',
    user: 'deploy',
    keyPath: null,
    privateKey: 'key',
  },
  healthUrl: 'https://staging.test/health',
  metricsUrl: 'https://staging.test/metrics',
  metricsBearerToken: 'token',
  infraHistoryPath: '/var/lib/jobbie/infra-metrics.jsonl',
};

function makeService(overrides: {
  sshMetrics?: object;
  httpMetrics?: object;
  metricsHistory?: object;
  remoteHistory?: object;
  backendOps?: object;
  adminRole?: object;
  audit?: object;
} = {}) {
  return new AdminInfrastructureService(
    (overrides.sshMetrics ?? {}) as never,
    (overrides.httpMetrics ?? {}) as never,
    (overrides.metricsHistory ?? {}) as never,
    (overrides.remoteHistory ?? { fetchHistory: jest.fn() }) as never,
    (overrides.backendOps ?? { getBackendsSummary: jest.fn() }) as never,
    (overrides.adminRole ?? { isSuperAdmin: jest.fn().mockResolvedValue(false) }) as never,
    (overrides.audit ?? { recordAuditEvent: jest.fn() }) as never,
  );
}

describe('AdminInfrastructureService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('merges ssh, health, and metrics into environment DTO', async () => {
    jest.spyOn(vpsConfig, 'getVpsEnvironmentConfigs').mockReturnValue([stagingOnly]);

    const sshMetrics = {
      fetchHostMetrics: jest.fn().mockResolvedValue({
        hostname: 'vps-staging',
        uptime_seconds: 3600,
        cpu_count: 4,
        load_1: 0.5,
        load_5: 0.4,
        load_15: 0.3,
        memory_total_bytes: 8_000_000_000,
        memory_available_bytes: 4_000_000_000,
        memory_used_bytes: 4_000_000_000,
        disk_root: null,
        disk_typesense: null,
        containers: [],
        compose_ps: [],
      }),
    };
    const httpMetrics = {
      fetchHealth: jest.fn().mockResolvedValue({ health_ok: true, latency_ms: 42 }),
      fetchAppMetrics: jest.fn().mockResolvedValue({ rss_bytes: 100 }),
    };
    const metricsHistory = {
      recordSample: jest.fn(),
      getHistory: jest.fn().mockReturnValue([]),
    };
    const remoteHistory = {
      fetchHistory: jest.fn().mockResolvedValue([]),
    };

    const service = makeService({
      sshMetrics,
      httpMetrics,
      metricsHistory,
      remoteHistory,
    });

    const result = await service.getInfrastructure();

    expect(result.environments).toHaveLength(1);
    const env = result.environments[0];
    expect(env.id).toBe('staging');
    expect(env.host?.hostname).toBe('vps-staging');
    expect(env.api).toEqual({ health_ok: true, latency_ms: 42 });
    expect(env.app_metrics).toEqual({ rss_bytes: 100 });
    expect(env.errors).toEqual({});
    expect(metricsHistory.recordSample).toHaveBeenCalledWith('staging', expect.objectContaining({
      hostname: 'vps-staging',
    }));
  });

  it('records errors without failing the whole response', async () => {
    jest.spyOn(vpsConfig, 'getVpsEnvironmentConfigs').mockReturnValue([stagingOnly]);

    const sshMetrics = {
      fetchHostMetrics: jest.fn().mockRejectedValue(new Error('SSH refused')),
    };
    const httpMetrics = {
      fetchHealth: jest.fn().mockResolvedValue({ health_ok: true, latency_ms: 10 }),
      fetchAppMetrics: jest.fn().mockRejectedValue(new Error('401')),
    };
    const metricsHistory = {
      recordSample: jest.fn(),
      getHistory: jest.fn().mockReturnValue([]),
    };
    const remoteHistory = {
      fetchHistory: jest.fn().mockResolvedValue([]),
    };

    const service = makeService({
      sshMetrics,
      httpMetrics,
      metricsHistory,
      remoteHistory,
    });

    const result = await service.getInfrastructure();
    const env = result.environments[0];
    expect(env.host).toBeNull();
    expect(env.api?.health_ok).toBe(true);
    expect(env.app_metrics).toBeNull();
    expect(env.errors.ssh).toBe('SSH refused');
    expect(env.errors.metrics).toBe('401');
  });

  it('fetches remote history and returns history_source', async () => {
    jest.spyOn(vpsConfig, 'getVpsEnvironmentConfigs').mockReturnValue([stagingOnly]);

    const remoteHistory = {
      fetchHistory: jest.fn().mockResolvedValue([
        {
          t: '2026-07-09T12:00:00.000Z',
          load_1: 0.2,
          load_pct: 5,
          mem_pct: 10,
        },
      ]),
    };
    const metricsHistory = {
      getMergedHistory: jest.fn().mockReturnValue({
        points: [
          {
            t: '2026-07-09T12:00:00.000Z',
            load_pct: 5,
            mem_pct: 10,
          },
        ],
        history_source: 'vps',
      }),
    };

    const service = makeService({
      remoteHistory,
      metricsHistory,
    });

    const result = await service.getMetricsHistory('staging', '24h');

    expect(remoteHistory.fetchHistory).toHaveBeenCalledWith(stagingOnly, '24h');
    expect(result.history_source).toBe('vps');
    expect(result.coverage_from).toBe('2026-07-09T12:00:00.000Z');
  });
});
