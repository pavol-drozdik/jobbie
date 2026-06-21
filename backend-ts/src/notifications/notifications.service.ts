import { Injectable, NotFoundException } from '@nestjs/common';
import { APP_PATHS } from '../common/app-paths';
import { sanitizeInternalLinkPath } from '../common/safe-internal-path.util';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { RealtimeService } from '../realtime/realtime.service';
import { EmailService } from '../email/email.service';
import type {
  NotificationMetadata,
  UserNotificationItemDto,
  UserNotificationRow,
  UserNotificationType,
} from './notifications.dto';
import {
  categoryFromNotificationType,
  resolveNotificationChannel,
  type NotificationCategory,
  type NotificationChannel,
} from './notification-prefs.util';
import { PushNotificationService } from './push-notification.service';
import { PreferenceTokenService } from './preference-token.service';
import {
  buildTransactionalEmailLayout,
  escapeHtml,
  EMAIL_BRAND,
} from '../email/transactional-email.template';

/** Not shown in PWA Upozornenia (device/IP login signals belong in Nastavenia → Zariadenia). */
const HIDDEN_IN_APP_FEED_TYPES: UserNotificationType[] = ['security_alert'];

/**
 * In-app + channel dispatch. Marketing/digest require prefs; job alerts use job_email_alerts category.
 * SECURITY: Check wantsChannel before email/push — transactional types still respect category toggles.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private supabase: SupabaseService,
    private realtime: RealtimeService,
    private email: EmailService,
    private push: PushNotificationService,
    private preferenceTokens: PreferenceTokenService,
    private config: ConfigService,
  ) {}

  private async loadPrefsRaw(userId: string): Promise<unknown> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      return null;
    }
    return (data as { notification_preferences?: unknown }).notification_preferences;
  }

  async wantsChannel(
    userId: string,
    category: NotificationCategory,
    channel: NotificationChannel,
  ): Promise<boolean> {
    const raw = await this.loadPrefsRaw(userId);
    const enabled = resolveNotificationChannel(raw, category, channel);
    if (!enabled) {
      return false;
    }
    if (
      channel === 'email' &&
      (category === 'marketing' || category === 'digest')
    ) {
      return this.hasMarketingProcessingConsent(userId);
    }
    return true;
  }

  private async hasMarketingProcessingConsent(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('marketing_processing_consent')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      return false;
    }
    return (data as { marketing_processing_consent?: boolean })
      .marketing_processing_consent === true;
  }

  private categoryForType(type: UserNotificationType): NotificationCategory {
    return categoryFromNotificationType(type);
  }

  private linkPathFor(type: UserNotificationType, meta: NotificationMetadata): string {
    if (meta.link_path && typeof meta.link_path === 'string') {
      return sanitizeInternalLinkPath(meta.link_path, APP_PATHS.home);
    }
    if (type === 'chat_message' && meta.room_id) {
      return `${APP_PATHS.chat}/${meta.room_id}`;
    }
    if ((type === 'job_application' || type === 'application_status') && meta.job_id) {
      return `/app/jobs/${meta.job_id}`;
    }
    if (type === 'payment_received' || type === 'weekly_digest' || type === 'reengagement') {
      return APP_PATHS.home;
    }
    if (type === 'job_status' && meta.job_id) {
      return `/app/jobs/${meta.job_id}`;
    }
    if (type === 'admin_broadcast') {
      return APP_PATHS.home;
    }
    if (type === 'security_alert') {
      return '/nastavenia/bezpecnost';
    }
    return APP_PATHS.home;
  }

  private async resolveUserEmail(userId: string): Promise<string | null> {
    try {
      const admin = this.supabase.getClient().auth.admin;
      const { data, error } = await admin.getUserById(userId);
      if (error || !data?.user?.email) {
        return null;
      }
      return data.user.email;
    } catch {
      return null;
    }
  }

  private buildEmailHtml(params: {
    title: string;
    body: string | null;
    link: string;
    appOrigin: string;
    footerToken: string | null;
    unsubscribeToken?: string | null;
    unsubscribeCategory?: NotificationCategory;
  }): string {
    const prefsUrl = params.footerToken
      ? `${params.appOrigin}/preferences/${encodeURIComponent(params.footerToken)}`
      : null;
    const unsubUrl =
      params.unsubscribeToken && params.unsubscribeCategory
        ? `${params.appOrigin}/unsubscribe/${encodeURIComponent(params.unsubscribeToken)}?category=${encodeURIComponent(params.unsubscribeCategory)}`
        : null;
    const safeTitle = escapeHtml(params.title ?? '');
    const safeBody = escapeHtml(params.body ?? '');
    const linkStyle = `color:${EMAIL_BRAND.greenDark};text-decoration:underline;`;
    const footerParts = [
      'JOBBIE — upozornenia môžete spravovať v aplikácii v Nastaveniach profilu.',
    ];
    if (prefsUrl) {
      footerParts.push(
        `<a href="${escapeHtml(prefsUrl)}" style="${linkStyle}">Centrum preferencií</a>`,
      );
    }
    if (unsubUrl) {
      footerParts.push(
        `<a href="${escapeHtml(unsubUrl)}" style="${linkStyle}">Odhlásiť sa z tejto kategórie e-mailov</a>`,
      );
    }
    const bodyHtml = `<h1 style="margin:0 0 12px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:20px;font-weight:800;line-height:1.3;color:${EMAIL_BRAND.ink};">${safeTitle}</h1>
<p style="margin:0;font-family:${EMAIL_BRAND.fontFamily};font-size:15px;line-height:1.55;color:${EMAIL_BRAND.inkMuted};">${safeBody}</p>`;
    return buildTransactionalEmailLayout({
      appOrigin: params.appOrigin,
      bodyHtml,
      ctaUrl: `${params.appOrigin.replace(/\/$/, '')}${params.link}`,
      ctaLabel: 'Otvoriť v Jobbie',
      footerLinksHtml: footerParts.join(' '),
      preheader: params.title ?? undefined,
    });
  }

  async createForUser(input: {
    userId: string;
    type: UserNotificationType;
    title: string;
    body: string | null;
    metadata: NotificationMetadata;
    bypassPreferenceChecks?: boolean;
    /** Always insert in-app row (e.g. admin broadcast). */
    forceInApp?: boolean;
    /** Skip email and push (e.g. bulk admin in-app only). */
    omitExternalChannels?: boolean;
  }): Promise<void> {
    const category = this.categoryForType(input.type);
    const inApp =
      input.bypassPreferenceChecks === true ||
      input.forceInApp === true ||
      (await this.wantsChannel(input.userId, category, 'in_app'));
    const client = this.supabase.getClient();
    let inserted: UserNotificationRow | null = null;
    if (inApp) {
      const { data, error } = await client
        .from('user_notifications')
        .insert({
          user_id: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          metadata: input.metadata,
        })
        .select('*')
        .single();
      if (error || !data) {
        // eslint-disable-next-line no-console
        console.warn('[NotificationsService] insert failed', error?.message);
      } else {
        inserted = data as UserNotificationRow;
        const item = this.rowToItem(inserted);
        this.realtime.emitToUser(input.userId, 'notification', item);
        if (!inserted.read_at) {
          this.realtime.emitToUser(input.userId, 'notifications_unread_delta', {
            unread_delta: 1,
          });
        }
      }
    }
    if (input.omitExternalChannels === true) {
      return;
    }
    const link = this.linkPathFor(input.type, input.metadata);
    const rawOrigin =
      this.config.get<string>('PUBLIC_APP_ORIGIN')?.trim() ||
      process.env.PUBLIC_APP_ORIGIN ||
      'https://jobbie.sk';
    const origin = rawOrigin.replace(/\/$/, '');
    const footerToken = this.preferenceTokens.signPreferences(input.userId);
    const unsubCategory: NotificationCategory | null =
      category === 'marketing' || category === 'digest' ? category : null;
    const unsubscribeToken =
      unsubCategory !== null ? this.preferenceTokens.signUnsubscribe(input.userId, unsubCategory) : null;
    const emailOn =
      input.bypassPreferenceChecks === true ||
      (await this.wantsChannel(input.userId, category, 'email'));
    if (emailOn) {
      const to = await this.resolveUserEmail(input.userId);
      if (to) {
        const html = this.buildEmailHtml({
          title: input.title,
          body: input.body,
          link,
          appOrigin: origin,
          footerToken,
          unsubscribeToken,
          unsubscribeCategory: unsubCategory ?? undefined,
        });
        await this.email.sendHtmlEmail({
          to,
          subject: input.title,
          html,
        });
      }
    }
    const pushOn =
      input.bypassPreferenceChecks === true ||
      (await this.wantsChannel(input.userId, category, 'push'));
    if (pushOn) {
      await this.push.sendToUser(input.userId, {
        title: input.title,
        body: (input.body ?? '').slice(0, 180) || 'JOBBIE',
        url: `${origin}${link}`,
      });
    }
    // SMS notifications are not offered (in_app / email / push only).
  }

  private rowToItem(row: UserNotificationRow): UserNotificationItemDto {
    const meta = (row.metadata ?? {}) as NotificationMetadata;
    const linkPath = this.linkPathFor(row.type, meta);
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link_path: linkPath,
      metadata: meta,
      read_at: row.read_at,
      created_at: row.created_at,
    };
  }

  async listForUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: UserNotificationItemDto[]; unread_count: number }> {
    const client = this.supabase.getClient();
    let listQuery = client
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId);
    for (const hiddenType of HIDDEN_IN_APP_FEED_TYPES) {
      listQuery = listQuery.neq('type', hiddenType);
    }
    const { data: rows, error } = await listQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      return { items: [], unread_count: 0 };
    }
    let countQuery = client
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);
    for (const hiddenType of HIDDEN_IN_APP_FEED_TYPES) {
      countQuery = countQuery.neq('type', hiddenType);
    }
    const { count, error: countErr } = await countQuery;
    const unreadCount = countErr ? 0 : count ?? 0;
    const list = (rows ?? []) as UserNotificationRow[];
    return {
      items: list.map((r) => this.rowToItem(r)),
      unread_count: unreadCount,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('user_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Notification not found');
    }
  }

  /** Marks all visible in-app feed notifications read (excludes hidden types e.g. security_alert). */
  async markAllReadForUser(userId: string): Promise<void> {
    const now = new Date().toISOString();
    let updateQuery = this.supabase
      .getClient()
      .from('user_notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
    for (const hiddenType of HIDDEN_IN_APP_FEED_TYPES) {
      updateQuery = updateQuery.neq('type', hiddenType);
    }
    const { error } = await updateQuery;
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[NotificationsService] markAllRead failed', error.message);
      return;
    }
    this.realtime.emitToUser(userId, 'notifications_unread_delta', {
      unread_count: 0,
    });
  }

  /**
   * Admin broadcast: inserts one in-app notification per user (batched).
   */
  async broadcastToAllUsers(input: {
    title: string;
    body: string | null;
    link_path?: string;
  }): Promise<{ sent: number }> {
    const client = this.supabase.getClient();
    const batchSize = 500;
    let offset = 0;
    let sent = 0;
    for (;;) {
      const { data: profiles, error } = await client
        .from('profiles')
        .select('id')
        .range(offset, offset + batchSize - 1);
      if (error || !profiles?.length) {
        break;
      }
      const ids = (profiles as { id: string }[]).map((p) => p.id);
      for (const userId of ids) {
        await this.createForUser({
          userId,
          type: 'admin_broadcast',
          title: input.title,
          body: input.body,
          metadata: {
            link_path: sanitizeInternalLinkPath(input.link_path, APP_PATHS.home),
            broadcast_id: `bc_${Date.now()}`,
          },
          forceInApp: true,
          omitExternalChannels: true,
        });
        sent += 1;
      }
      if (profiles.length < batchSize) {
        break;
      }
      offset += batchSize;
    }
    return { sent };
  }
}
