import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AdminRoleService } from '../auth/admin-role.service';
import type { CurrentUser } from '../auth/auth.types';
import type {
  AdminInfrastructureDto,
  InfraMetricsRangeDto,
  VpsBackendsSummaryDto,
  VpsEnvironmentDto,
  VpsMetricsHistoryDto,
} from './admin-infrastructure.dto';
import {
  getConfiguredFlags,
  getVpsEnvironmentConfigs,
  type VpsEnvironmentConfig,
} from './vps-environment.config';
import { VpsBackendOperationsService } from './vps-backend-operations.service';
import { VpsHttpMetricsService } from './vps-http-metrics.service';
import { VpsMetricsHistoryService } from './vps-metrics-history.service';
import { VpsRemoteHistoryService } from './vps-remote-history.service';
import { VpsSshMetricsService } from './vps-ssh-metrics.service';

const BACKGROUND_POLL_MS = 5 * 60 * 1000;

@Injectable()
export class AdminInfrastructureService implements OnModuleInit, OnModuleDestroy {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly sshMetrics: VpsSshMetricsService,
    private readonly httpMetrics: VpsHttpMetricsService,
    private readonly metricsHistory: VpsMetricsHistoryService,
    private readonly remoteHistory: VpsRemoteHistoryService,
    private readonly backendOps: VpsBackendOperationsService,
    private readonly adminRole: AdminRoleService,
    private readonly audit: AuditService,
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

  async getMetricsHistory(
    envId: 'staging' | 'production',
    range: InfraMetricsRangeDto,
  ): Promise<VpsMetricsHistoryDto> {
    const config = getVpsEnvironmentConfigs().find((c) => c.id === envId);
    const remotePoints =
      config?.ssh != null
        ? await this.remoteHistory.fetchHistory(config, range)
        : [];
    const { points, history_source } = this.metricsHistory.getMergedHistory(
      envId,
      range,
      remotePoints,
    );
    return {
      env_id: envId,
      range,
      points,
      coverage_from: points[0]?.t ?? null,
      coverage_to: points[points.length - 1]?.t ?? null,
      history_source,
    };
  }

  async getBackendsSummary(
    envId: 'staging' | 'production',
    user: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    const config = this.requireEnvConfig(envId);
    const mutationsAllowed = await this.adminRole.isSuperAdmin(user);
    let host = null;
    if (getConfiguredFlags(config).ssh) {
      try {
        host = await this.sshMetrics.fetchHostMetrics(config);
      } catch {
        host = null;
      }
    }
    return this.backendOps.getBackendsSummary(config, host, mutationsAllowed);
  }

  async scaleBackendUp(
    envId: 'staging' | 'production',
    actor: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    const summary = await this.getBackendsSummary(envId, actor);
    const target = summary.scale + 1;
    const result = await this.backendOps.scaleTo(
      this.requireEnvConfig(envId),
      target,
      summary,
    );
    void this.audit.recordAuditEvent({
      eventType: 'admin.infra.backend_scaled',
      actorUserId: actor.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      subjectType: 'infrastructure',
      subjectId: envId,
      payload: {
        env_id: envId,
        from_scale: result.from_scale,
        to_scale: result.to_scale,
      },
    });
    return this.getBackendsSummary(envId, actor);
  }

  async scaleBackendDown(
    envId: 'staging' | 'production',
    actor: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    const summary = await this.getBackendsSummary(envId, actor);
    const target = summary.scale - 1;
    const result = await this.backendOps.scaleTo(
      this.requireEnvConfig(envId),
      target,
      summary,
    );
    void this.audit.recordAuditEvent({
      eventType: 'admin.infra.backend_scaled',
      actorUserId: actor.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      subjectType: 'infrastructure',
      subjectId: envId,
      payload: {
        env_id: envId,
        from_scale: result.from_scale,
        to_scale: result.to_scale,
      },
    });
    return this.getBackendsSummary(envId, actor);
  }

  async restartBackendInstance(
    envId: 'staging' | 'production',
    containerName: string,
    actor: CurrentUser,
  ): Promise<VpsBackendsSummaryDto> {
    const summary = await this.getBackendsSummary(envId, actor);
    await this.backendOps.restartInstance(
      this.requireEnvConfig(envId),
      containerName,
      summary,
    );
    void this.audit.recordAuditEvent({
      eventType: 'admin.infra.backend_restarted',
      actorUserId: actor.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      subjectType: 'infrastructure',
      subjectId: envId,
      payload: {
        env_id: envId,
        container_name: containerName,
      },
    });
    return this.getBackendsSummary(envId, actor);
  }

  private requireEnvConfig(envId: 'staging' | 'production'): VpsEnvironmentConfig {
    const config = getVpsEnvironmentConfigs().find((c) => c.id === envId);
    if (!config) {
      throw new NotFoundException('Unknown environment');
    }
    return config;
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
