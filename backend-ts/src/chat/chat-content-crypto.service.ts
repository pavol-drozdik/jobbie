import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { isNodeProduction } from '../common/runtime-env.util';

/** Stored DB prefix for AES-256-GCM payloads (Nest env key). */
export const ATREST_PREFIX = 'atrest1.';
/** Old PWA/browser E2EE ciphertext — cannot be decrypted server-side; placeholders shown in UI. */
export const E2EE_LEGACY_PREFIX = 'e2ee1.';

const PLACEHOLDER_LEGACY_E2EE = JSON.stringify({
  v: 1,
  kind: 'text',
  text: '[Správa bola v starom koncovom šifrovaní a na tomto zariadení nie je dostupná.]',
});

const PLACEHOLDER_CORRUPT = JSON.stringify({
  v: 1,
  kind: 'text',
  text: '[Správu sa nepodarilo načítať.]',
});

@Injectable()
export class ChatContentCryptoService implements OnModuleInit {
  private readonly logger = new Logger(ChatContentCryptoService.name);
  private key: Buffer | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const b64 = this.config.get<string>('CHAT_CONTENT_ENCRYPTION_KEY');
    if (!b64?.trim()) {
      if (isNodeProduction()) {
        // SECURITY: production must have at-rest encryption configured. Refusing
        // to boot prevents shipping a build that silently stores chat bodies
        // in plaintext (visible to anyone with DB read access). Rotation
        // procedure is in docs/database-operations-runbook.md.
        throw new Error(
          'CHAT_CONTENT_ENCRYPTION_KEY is required in production. ' +
            'Generate with `openssl rand -base64 32` and store via your secret manager.',
        );
      }
      this.logger.warn(
        'CHAT_CONTENT_ENCRYPTION_KEY is not set — chat message bodies will be stored without at-rest encryption (dev only).',
      );
      return;
    }
    let buf: Buffer;
    try {
      buf = Buffer.from(b64.trim(), 'base64');
    } catch {
      if (isNodeProduction()) {
        throw new Error('CHAT_CONTENT_ENCRYPTION_KEY is not valid base64.');
      }
      this.logger.error('CHAT_CONTENT_ENCRYPTION_KEY is not valid base64.');
      return;
    }
    if (buf.length !== 32) {
      if (isNodeProduction()) {
        throw new Error(
          `CHAT_CONTENT_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}).`,
        );
      }
      this.logger.error(
        `CHAT_CONTENT_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}).`,
      );
      return;
    }
    this.key = buf;
    this.logger.log('Chat content at-rest encryption enabled (aes-256-gcm).');
  }

  /** True when encrypt/decrypt round-trip is available. */
  isEnabled(): boolean {
    return this.key !== null;
  }

  /**
   * Encrypt plaintext for `chat_messages.content`. When disabled, returns input unchanged.
   */
  encryptForStorage(plaintext: string): string {
    if (!this.key) return plaintext;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, enc, tag]);
    return ATREST_PREFIX + combined.toString('base64');
  }

  /**
   * Decrypt DB value for API/socket responses. Handles legacy `e2ee1.` and plain UTF-8 rows.
   */
  decryptForApi(stored: string): string {
    if (!stored || typeof stored !== 'string') {
      return PLACEHOLDER_CORRUPT;
    }
    if (stored.startsWith(E2EE_LEGACY_PREFIX)) {
      return PLACEHOLDER_LEGACY_E2EE;
    }
    if (!stored.startsWith(ATREST_PREFIX)) {
      return stored;
    }
    if (!this.key) {
      this.logger.warn('Cannot decrypt at-rest payload: key missing.');
      return PLACEHOLDER_CORRUPT;
    }
    const raw = stored.slice(ATREST_PREFIX.length).trim();
    try {
      const combined = Buffer.from(raw, 'base64');
      if (combined.length < 12 + 16 + 1) {
        return PLACEHOLDER_CORRUPT;
      }
      const iv = combined.subarray(0, 12);
      const tag = combined.subarray(combined.length - 16);
      const ciphertext = combined.subarray(12, combined.length - 16);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return plain.toString('utf8');
    } catch (err) {
      this.logger.warn(`At-rest decrypt failed: ${String(err)}`);
      return PLACEHOLDER_CORRUPT;
    }
  }

  /** Map DB row content field to plaintext JSON/string for clients. */
  mapMessageContent(stored: string): string {
    return this.decryptForApi(stored);
  }

  /** Map outbound insert content from client plaintext to DB column. */
  mapIncomingContent(clientPlaintext: string): string {
    return this.encryptForStorage(clientPlaintext);
  }
}
