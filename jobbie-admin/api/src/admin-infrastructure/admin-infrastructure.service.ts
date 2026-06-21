import { Injectable } from '@nestjs/common';
import type {
  AdminInfrastructureDto,
  VpsEnvironmentDto,
} from './admin-infrastructure.dto';
import {
  getConfiguredFlags,
  getVpsEnvironmentConfigs,
  type VpsEnvironmentConfig,
} from './vps-environment.config';
import { VpsHttpMetricsService } from './vps-http-metrics.service';
import { VpsSshMetricsService } from './vps-ssh-metrics.service';

@Injectable()
export class AdminInfrastructureService {
  constructor(
    private readonly sshMetrics: VpsSshMetricsService,
    private readonly httpMetrics: VpsHttpMetricsService,
  ) {}

  async getInfrastructure(): Promise<AdminInfrastructureDto> {
    const configs = getVpsEnvironmentConfigs();
    const environments = await Promise.all(
      configs.map((config) => this.collectEnvironment(config)),
    );
    return { environments };
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
