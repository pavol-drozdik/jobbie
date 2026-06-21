import { Injectable } from '@nestjs/common';
import { existsSync, readFile, readFileSync } from 'node:fs';
import * as path from 'path';
import { promisify } from 'node:util';
import { Client } from 'ssh2';
import type { VpsHostMetricsDto } from './admin-infrastructure.dto';
import type { VpsEnvironmentConfig } from './vps-environment.config';

const readFileAsync = promisify(readFile);
const SSH_TIMEOUT_MS = 15_000;

@Injectable()
export class VpsSshMetricsService {
  private scriptCache: string | null = null;

  async fetchHostMetrics(
    config: VpsEnvironmentConfig,
  ): Promise<VpsHostMetricsDto> {
    if (!config.ssh) {
      throw new Error('SSH not configured');
    }

    if (config.ssh.privateKey && config.ssh.privateKey.length < 64) {
      throw new Error(
        'SSH private key looks invalid (too short). Set VPS_*_SSH_PRIVATE_KEY to the full PEM or VPS_*_SSH_KEY_PATH to a key file.',
      );
    }

    const script = await this.loadHostMetricsScript();
    const stdout = await this.execRemoteScript(config.ssh, script);
    return this.parseHostMetricsJson(stdout);
  }

  private async loadHostMetricsScript(): Promise<string> {
    if (this.scriptCache) return this.scriptCache;

    const candidates = [
      process.env.HOST_METRICS_SCRIPT_PATH?.trim(),
      path.resolve(process.cwd(), 'websupport-vps-deployment/scripts/host_metrics.sh'),
      path.resolve(process.cwd(), '../websupport-vps-deployment/scripts/host_metrics.sh'),
      path.resolve(__dirname, '../../../../websupport-vps-deployment/scripts/host_metrics.sh'),
      path.resolve(__dirname, '../../../websupport-vps-deployment/scripts/host_metrics.sh'),
    ].filter((p): p is string => Boolean(p));

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        this.scriptCache = await readFileAsync(candidate, 'utf8');
        return this.scriptCache;
      }
    }

    throw new Error(
      'host_metrics.sh not found. Set HOST_METRICS_SCRIPT_PATH or run admin from the JOBBIE repo root.',
    );
  }

  private execRemoteScript(
    ssh: NonNullable<VpsEnvironmentConfig['ssh']>,
    script: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        conn.end();
        if (err) reject(err);
        else resolve(stdout);
      };

      const timer = setTimeout(() => {
        finish(new Error('SSH connection timed out'));
      }, SSH_TIMEOUT_MS);

      conn.on('ready', () => {
        conn.exec('bash -s', (err, stream) => {
          if (err) {
            finish(err);
            return;
          }
          stream.on('close', (code: number) => {
            if (code !== 0) {
              finish(
                new Error(
                  stderr.trim() || `Remote script exited with code ${code}`,
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
          stream.end(script);
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

  private parseHostMetricsJson(stdout: string): VpsHostMetricsDto {
    const line = stdout
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('{'));
    if (!line) {
      throw new Error('Remote script returned no JSON');
    }
    return JSON.parse(line) as VpsHostMetricsDto;
  }
}
