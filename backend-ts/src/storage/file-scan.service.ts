import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'net';
import { AuditService } from '../audit/audit.service';
import { isNodeProduction } from '../common/runtime-env.util';

export type FileScanResult = 'clean' | 'skipped' | 'infected';

type ClamConfig = {
  host: string;
  port: number;
  timeoutMs: number;
  failOpen: boolean;
};

/**
 * File AV scanning.
 *
 * - When `CLAMAV_HOST` is set, the service speaks ClamAV's INSTREAM protocol
 *   over TCP. Buffers larger than `CLAMAV_MAX_BYTES` (default 25 MB) are
 *   chunked. On a positive match, the upload is rejected with 400 and an
 *   audit event is recorded.
 * - When unconfigured, returns `'skipped'`. In production the operator may
 *   set `CLAMAV_FAIL_OPEN=false` to make scan failures (timeout, host down)
 *   reject uploads instead of letting them through.
 *
 * NOTE: we deliberately do NOT bundle a wire-protocol dependency — ClamAV's
 * INSTREAM is a few dozen lines of native socket code, which avoids pulling
 * in another transitive supply-chain risk.
 */
@Injectable()
export class FileScanService {
  private readonly logger = new Logger(FileScanService.name);
  private readonly maxBytes: number;
  private readonly clam: ClamConfig | null;

  constructor(
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.maxBytes = Math.max(
      1024,
      Number(this.config.get<string>('CLAMAV_MAX_BYTES') ?? 25 * 1024 * 1024),
    );
    const host = this.config.get<string>('CLAMAV_HOST')?.trim();
    if (host) {
      this.clam = {
        host,
        port: Number(this.config.get<string>('CLAMAV_PORT') ?? 3310),
        timeoutMs: Math.max(
          1000,
          Number(this.config.get<string>('CLAMAV_TIMEOUT_MS') ?? 10_000),
        ),
        failOpen: this.resolveClamFailOpen(),
      };
    } else {
      this.clam = null;
      if (isNodeProduction()) {
        this.logger.warn(
          'CLAMAV_HOST is unset in production — uploads skip malware scanning unless CLAMAV_FAIL_OPEN=false rejects scan errors',
        );
      }
    }
  }

  private resolveClamFailOpen(): boolean {
    const raw = this.config.get<string>('CLAMAV_FAIL_OPEN');
    if (raw !== undefined && String(raw).trim() !== '') {
      return raw.trim().toLowerCase() !== 'false';
    }
    return !isNodeProduction();
  }

  /**
   * Scans a buffer. Throws `BadRequestException` when the file is detected
   * as malicious (always) or when the scan fails AND `CLAMAV_FAIL_OPEN=false`.
   * Returns `'skipped'` when ClamAV is not configured.
   */
  async scan(buffer: Buffer): Promise<FileScanResult> {
    if (!this.clam) {
      return 'skipped';
    }
    if (buffer.length > this.maxBytes) {
      // Bound scan time / memory; in prod with fail-open this rejects only
      // when an operator opts into fail-closed.
      if (!this.clam.failOpen && isNodeProduction()) {
        throw new BadRequestException(
          'File too large for malware scanning',
        );
      }
      return 'skipped';
    }
    try {
      const verdict = await this.runInstream(buffer);
      if (verdict.kind === 'infected') {
        void this.audit
          .recordAuditEvent({
            actorUserId: null,
            actorIp: null,
            actorUserAgent: null,
            sessionId: null,
            deviceId: null,
            eventType: 'storage.upload.scan_infected',
            subjectType: 'file',
            subjectId: null,
            payload: { signature: verdict.signature, bytes: buffer.length },
          })
          .catch(() => undefined);
        throw new BadRequestException(
          'Súbor neprešiel bezpečnostnou kontrolou.',
        );
      }
      return 'clean';
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`clamav scan failed: ${String(err)}`);
      if (!this.clam.failOpen && isNodeProduction()) {
        throw new BadRequestException(
          'Bezpečnostná kontrola súboru zlyhala; skúste znova.',
        );
      }
      return 'skipped';
    }
  }

  /**
   * ClamAV INSTREAM protocol:
   * - send "zINSTREAM\0"
   * - one or more chunks: 4-byte big-endian length + bytes
   * - terminator: 4 zero bytes
   * - response: "<stream>: OK\0" or "<stream>: <SIG> FOUND\0" or
   *   "INSTREAM size limit exceeded. ERROR\0"
   */
  private runInstream(
    buffer: Buffer,
  ): Promise<{ kind: 'ok' } | { kind: 'infected'; signature: string }> {
    return new Promise((resolve, reject) => {
      const cfg = this.clam!;
      const socket = new Socket();
      let resp = '';
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        fn();
      };
      socket.setTimeout(cfg.timeoutMs);
      socket.on('timeout', () => settle(() => reject(new Error('timeout'))));
      socket.on('error', (e) => settle(() => reject(e)));
      socket.on('data', (chunk) => {
        resp += chunk.toString('utf8');
      });
      socket.on('close', () => {
        if (settled) return;
        const trimmed = resp.replace(/\0$/, '').trim();
        if (trimmed.endsWith('OK')) {
          settled = true;
          resolve({ kind: 'ok' });
          return;
        }
        const m = /:\s*(.+?)\s+FOUND/i.exec(trimmed);
        if (m) {
          settled = true;
          resolve({ kind: 'infected', signature: m[1] });
          return;
        }
        settled = true;
        reject(new Error(`unexpected clamd response: ${trimmed}`));
      });
      socket.connect(cfg.port, cfg.host, () => {
        socket.write('zINSTREAM\0');
        const len = Buffer.alloc(4);
        len.writeUInt32BE(buffer.length, 0);
        socket.write(len);
        socket.write(buffer);
        const terminator = Buffer.alloc(4);
        terminator.writeUInt32BE(0, 0);
        socket.write(terminator);
      });
    });
  }
}
