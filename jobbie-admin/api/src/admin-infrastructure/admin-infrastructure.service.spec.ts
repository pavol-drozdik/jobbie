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
};

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

    const service = new AdminInfrastructureService(
      sshMetrics as never,
      httpMetrics as never,
    );

    const result = await service.getInfrastructure();

    expect(result.environments).toHaveLength(1);
    const env = result.environments[0];
    expect(env.id).toBe('staging');
    expect(env.host?.hostname).toBe('vps-staging');
    expect(env.api).toEqual({ health_ok: true, latency_ms: 42 });
    expect(env.app_metrics).toEqual({ rss_bytes: 100 });
    expect(env.errors).toEqual({});
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

    const service = new AdminInfrastructureService(
      sshMetrics as never,
      httpMetrics as never,
    );

    const result = await service.getInfrastructure();
    const env = result.environments[0];
    expect(env.host).toBeNull();
    expect(env.api?.health_ok).toBe(true);
    expect(env.app_metrics).toBeNull();
    expect(env.errors.ssh).toBe('SSH refused');
    expect(env.errors.metrics).toBe('401');
  });
});
