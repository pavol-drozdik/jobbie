import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type {
  AdminInfrastructureDto,
  InfraMetricsRangeDto,
  VpsEnvironmentDto,
  VpsMetricsHistoryDto,
} from './admin-infrastructure.dto';
import {
  getConfiguredFlags,
  getVpsEnvironmentConfigs,
  type VpsEnvironmentConfig,
} from './vps-environment.config';
import { VpsHttpMetricsService } from './vps-http-metrics.service';
import { VpsMetricsHistoryService } from './vps-metrics-history.service';
import { VpsSshMetricsService } from './vps-ssh-metrics.service';

const BACKGROUND_POLL_MS = 5 * 60 * 1000;

@Injectable()
export class AdminInfrastructureService implements OnModuleInit, OnModuleDestroy {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sshMetrics: VpsSshMetricsService,
    private readonly httpMetrics: VpsHttpMetricsService,
    private readonly metricsHistory: VpsMetricsHistoryService,
  ) {}

  onModuleInit(): void {
    this.pollTimer = setInterval(() => {
      void this.collectBackgroundSamples();
    }, BACKGROUND_POLL_MS);
    this.pollTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async getInfrastructure(): Promise<AdminInfrastructureDto> {
    const configs = getVpsEnvironmentConfigs();
    const environments = await Promise.all(
      configs.map((config) => this.collectEnvironment(config)),
    );
    return { environments };
  }

  getMetricsHistory(
    envId: 'staging' | 'production',
    range: InfraMetricsRangeDto,
  ): VpsMetricsHistoryDto {
    return {
      env_id: envId,
      range,
      points: this.metricsHistory.getHistory(envId, range),
    };
  }

  private async collectBackgroundSamples(): Promise<void> {
    const configs = getVpsEnvironmentConfigs();
    await Promise.all(
      configs.map(async (config) => {
        if (!getConfiguredFlags(config).ssh) {
          return;
        }
        try {
          const host = await this.sshMetrics.fetchHostMetrics(config);
          if (host) {
            this.metricsHistory.recordSample(config.id, host);
          }
        } catch {
          // Background sampling is best-effort.
        }
      }),
    );
  }

  private async collectEnvironment(
    config: VpsEnvironmentConfig,
  ): Promise<VpsEnvironmentDto> {
    const configured = getConfiguredFlags(config);
    const collected_at = new Date().toISOString();
    const errors: VpsEnvironmentDto['errors'] = {};

    const [sshSettled, healthSettled, metricsSettled] =
      await Promise.allSettled([
        configured.ssh
          ? this.sshMetrics.fetchHostMetrics(config)
          : Promise.resolve(null),
        configured.health
          ? this.httpMetrics.fetchHealth(config)
          : Promise.resolve(null),
        configured.metrics
          ? this.httpMetrics.fetchAppMetrics(config)
          : Promise.resolve(null),
      ]);

    const host = unwrapSettled(sshSettled, errors, 'ssh');
    const api = unwrapSettled(healthSettled, errors, 'health');
    const app_metrics = unwrapSettled(metricsSettled, errors, 'metrics');

    if (host) {
      this.metricsHistory.recordSample(config.id, host);
    }

    return {
      id: config.id,
      label: config.label,
      configured,
      collected_at,
      errors,
      host,
      api,
      app_metrics,
    };
  }
}

function unwrapSettled<T>(
  result: PromiseSettledResult<T | null>,
  errors: VpsEnvironmentDto['errors'],
  key: keyof VpsEnvironmentDto['errors'],
): T | null {
  if (result.status === 'fulfilled') {
    return result.value;
  }
  errors[key] =
    result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
  return null;
}
