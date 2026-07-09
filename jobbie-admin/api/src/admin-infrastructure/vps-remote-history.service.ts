import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { Client } from 'ssh2';
import type { InfraMetricsRange } from './vps-metrics-history.service';
import {
  parseInfraHistoryJsonl,
  type StoredPoint,
} from './vps-metrics-history.service';
import type { VpsEnvironmentConfig } from './vps-environment.config';

const SSH_TIMEOUT_MS = 20_000;
const CACHE_TTL_MS = 30_000;

const RANGE_MS: Record<InfraMetricsRange, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '2w': 14 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
};

@Injectable()
export class VpsRemoteHistoryService {
  private cache = new Map<string, { expires: number; points: StoredPoint[] }>();

  async fetchHistory(
    config: VpsEnvironmentConfig,
    range: InfraMetricsRange,
  ): Promise<StoredPoint[]> {
    if (!config.ssh) {
      return [];
    }

    const cacheKey = `${config.id}:${range}`;
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > now) {
      return cached.points;
    }

    try {
      const path = shellEscapePath(config.infraHistoryPath);
      const stdout = await this.execRemoteCommand(
        config.ssh,
        `test -f ${path} && cat ${path} || true`,
      );
      const all = parseInfraHistoryJsonl(stdout);
      const since = now - RANGE_MS[range];
      const inRange = all.filter((p) => new Date(p.t).getTime() >= since);
      this.cache.set(cacheKey, { expires: now + CACHE_TTL_MS, points: inRange });
      return inRange;
    } catch {
      return [];
    }
  }

  private execRemoteCommand(
    ssh: NonNullable<VpsEnvironmentConfig['ssh']>,
    command: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
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

function shellEscapePath(filePath: string): string {
  return `'${filePath.replace(/'/g, `'\\''`)}'`;
}
