import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { Client } from 'ssh2';
import type {
  VpsBackendsSummaryDto,
  VpsHostMetricsDto,
} from './admin-infrastructure.dto';
import {
  computeMaxReplicas,
  parseBackendCapacityJson,
  type BackendCapacity,
} from './vps-backend-capacity.util';
import {
  parseBackendInstances,
  validateBackendContainerName,
} from './vps-backend-instances.util';
import type { VpsEnvironmentConfig } from './vps-environment.config';
import { loadSshClientCtor } from './vps-ssh-client.util';

const SSH_TIMEOUT_MS = 30_000;
const DEPLOY_ROOT = '/srv/nestjs-typesense';

@Injectable()
export class VpsBackendOperationsService {
  async getBackendsSummary(
    config: VpsEnvironmentConfig,
    host: VpsHostMetricsDto | null,
    mutationsAllowed: boolean,
  ): Promise<VpsBackendsSummaryDto> {
    const instances = parseBackendInstances(host).map((row) => ({
      name: row.name,
      container_id: row.container_id,
      status: row.status,
      health: row.health,
      cpu_percent: row.cpu_percent,
      mem_usage: row.mem_usage,
      mem_percent: row.mem_percent,
    }));

    let capacity = await this.fetchRemoteCapacity(config);
    if (!capacity && host) {
      capacity = {
        current_scale: Math.max(1, instances.length),
        max_replicas: computeMaxReplicas(
          host.cpu_count,
          Math.round(host.memory_total_bytes / (1024 * 1024)),
        ),
        autoscale_enabled: false,
        redis_configured: false,
        deploy_lock: false,
        cpu_count: host.cpu_count,
        mem_total_mb: Math.round(host.memory_total_bytes / (1024 * 1024)),
      };
    }

    const scale = capacity?.current_scale ?? Math.max(1, instances.length);
    const maxReplicas = capacity?.max_replicas ?? 1;

    return {
      env_id: config.id,
      scale,
      max_replicas: maxReplicas,
      autoscale_enabled: capacity?.autoscale_enabled ?? false,
      redis_configured: capacity?.redis_configured ?? false,
      deploy_lock: capacity?.deploy_lock ?? false,
      mutations_allowed: mutationsAllowed,
      instances,
    };
  }

  async scaleTo(
    config: VpsEnvironmentConfig,
    targetScale: number,
    summary: VpsBackendsSummaryDto,
  ): Promise<{ from_scale: number; to_scale: number }> {
    if (!config.ssh) {
      throw new NotFoundException('SSH not configured');
    }
    if (summary.deploy_lock) {
      throw new ConflictException('Deploy in progress on VPS');
    }
    if (targetScale < 1 || targetScale > summary.max_replicas) {
      throw new ConflictException(
        `Scale must be between 1 and ${summary.max_replicas}`,
      );
    }
    if (targetScale > 1 && !summary.redis_configured) {
      throw new ConflictException('REDIS_URL required before scaling above 1');
    }

    const script = shellEscapePath(`${DEPLOY_ROOT}/scripts/scale_backend.sh`);
    await this.execRemoteCommand(
      config.ssh,
      `${script} ${targetScale}`,
    );
    return { from_scale: summary.scale, to_scale: targetScale };
  }

  async restartInstance(
    config: VpsEnvironmentConfig,
    containerName: string,
    summary: VpsBackendsSummaryDto,
  ): Promise<void> {
    if (!config.ssh) {
      throw new NotFoundException('SSH not configured');
    }
    if (!validateBackendContainerName(containerName)) {
      throw new ConflictException('Invalid backend container name');
    }
    if (summary.deploy_lock) {
      throw new ConflictException('Deploy in progress on VPS');
    }
    const known = summary.instances.some((row) => row.name === containerName);
    if (!known) {
      throw new NotFoundException('Backend instance not found');
    }

    const script = shellEscapePath(
      `${DEPLOY_ROOT}/scripts/restart_backend_instance.sh`,
    );
    const name = shellEscapePath(containerName);
    await this.execRemoteCommand(config.ssh, `${script} ${name}`);
  }

  private async fetchRemoteCapacity(
    config: VpsEnvironmentConfig,
  ): Promise<BackendCapacity | null> {
    if (!config.ssh) {
      return null;
    }
    try {
      const script = shellEscapePath(
        `${DEPLOY_ROOT}/scripts/read_backend_capacity.sh`,
      );
      const stdout = await this.execRemoteCommand(config.ssh, script);
      return parseBackendCapacityJson(stdout);
    } catch {
      return null;
    }
  }

  private async execRemoteCommand(
    ssh: NonNullable<VpsEnvironmentConfig['ssh']>,
    command: string,
  ): Promise<string> {
    const ClientCtor = await loadSshClientCtor();
    return new Promise((resolve, reject) => {
      const conn = new ClientCtor();
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (err?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        conn.end();
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      };

      const timer = setTimeout(() => {
        finish(new Error('SSH connection timed out'));
      }, SSH_TIMEOUT_MS);

      conn.on('ready', () => {
        conn.exec(command, (err, stream) => {
          if (err) {
            finish(err);
            return;
          }
          stream.on('close', (code: number) => {
            if (code !== 0) {
              finish(
                new Error(
                  stderr.trim() || `Remote command exited with code ${code}`,
                ),
              );
              return;
            }
            finish();
          });
          stream.on('data', (data: Buffer) => {
            stdout += data.toString('utf8');
          });
          stream.stderr.on('data', (data: Buffer) => {
            stderr += data.toString('utf8');
          });
        });
      });

      conn.on('error', (err) => finish(err));

      const connectOpts: Parameters<Client['connect']>[0] = {
        host: ssh.host,
        username: ssh.user,
        readyTimeout: SSH_TIMEOUT_MS,
      };

      if (ssh.privateKey) {
        connectOpts.privateKey = ssh.privateKey;
      } else if (ssh.keyPath) {
        connectOpts.privateKey = readFileSync(ssh.keyPath, 'utf8');
      }

      conn.connect(connectOpts);
    });
  }
}

function shellEscapePath(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
