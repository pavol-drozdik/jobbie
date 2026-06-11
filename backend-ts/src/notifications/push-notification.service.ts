import { Injectable, Logger } from '@nestjs/common';
import { APP_PATHS } from '../common/app-paths';
import { sanitizeInternalLinkPath } from '../common/safe-internal-path.util';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  private configured = false;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {}

  private ensureVapid(): boolean {
    if (this.configured) {
      return true;
    }
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY')?.trim();
    const subject = this.config.get<string>('VAPID_SUBJECT')?.trim() || 'mailto:ahoj@jobbie.sk';
    if (!publicKey || !privateKey) {
      return false;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.configured = true;
    return true;
  }

  getPublicVapidKey(): string | null {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    return publicKey || null;
  }

  private static endpointHost(endpoint: string): string {
    try {
      return new URL(endpoint).host;
    } catch {
      return 'unknown';
    }
  }

  async sendToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<void> {
    if (!this.ensureVapid()) {
      return;
    }
    const { data: rows, error } = await this.supabase
      .getClient()
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId);
    if (error || !rows?.length) {
      return;
    }
    const safeUrl = sanitizeInternalLinkPath(payload.url, APP_PATHS.home);
    const json = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: safeUrl,
    });
    for (const row of rows as { endpoint: string; p256dh: string; auth: string }[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          json,
          { TTL: 3600 },
        );
      } catch (e: unknown) {
        const statusCode =
          typeof e === 'object' && e !== null && 'statusCode' in e
            ? Number((e as { statusCode?: number }).statusCode)
            : NaN;
        const endpointHost = PushNotificationService.endpointHost(row.endpoint);
        if (statusCode === 410 || statusCode === 404 || statusCode === 401 || statusCode === 403) {
          await this.supabase
            .getClient()
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', row.endpoint);
        }
        this.logger.warn(
          `webpush failed for ${userId} host=${endpointHost} status=${Number.isFinite(statusCode) ? statusCode : 'unknown'}`,
        );
      }
    }
  }
}
