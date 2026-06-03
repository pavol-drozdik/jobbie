import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { APP_PATHS } from '../common/app-paths';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../supabase/supabase.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from './notifications.service';
import { resolveNotificationChannel } from './notification-prefs.util';
import { BACKGROUND_QUEUE_NAME } from '../queue/background-queue.module';

const PROFILE_BATCH = 200;

@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);

  constructor(
    private supabase: SupabaseService,
    private email: EmailService,
    private notifications: NotificationsService,
    @Optional() @InjectQueue(BACKGROUND_QUEUE_NAME) private readonly backgroundQueue?: Queue,
  ) {}

  @Cron('0 8 * * 1')
  async weeklyDigest(): Promise<void> {
    if (this.backgroundQueue) {
      const week = Math.floor(Date.now() / (7 * 24 * 3600 * 1000));
      await this.backgroundQueue.add(
        'weekly-digest',
        {},
        {
          jobId: `weekly-digest:${week}`,
          removeOnComplete: 20,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      return;
    }
    await this.runWeeklyDigest();
  }

  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async reengagement(): Promise<void> {
    if (this.backgroundQueue) {
      const day = new Date().toISOString().slice(0, 10);
      await this.backgroundQueue.add(
        'reengagement',
        {},
        {
          jobId: `reengagement:${day}`,
          removeOnComplete: 20,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );
      return;
    }
    await this.runReengagement();
  }

  async runWeeklyDigest(): Promise<void> {
    const client = this.supabase.getClient();
    let cursorId: string | null = null;
    for (;;) {
      let query = client
        .from('profiles')
        .select('id, notification_preferences')
        .order('id', { ascending: true })
        .limit(PROFILE_BATCH);
      if (cursorId) {
        query = query.gt('id', cursorId);
      }
      const { data: profiles, error } = await query;
      if (error || !profiles?.length) {
        break;
      }
      const batch = profiles as { id: string; notification_preferences?: unknown }[];
      cursorId = batch[batch.length - 1]?.id ?? null;
      for (const row of batch) {
        if (!resolveNotificationChannel(row.notification_preferences, 'digest', 'email')) {
          continue;
        }
        const { data: u } = await client.auth.admin.getUserById(row.id);
        const addr = u?.user?.email;
        if (!addr) {
          continue;
        }
        await this.email.sendHtmlEmail({
          to: addr,
          subject: 'JOBBIE — týždenný prehľad',
          html: `<p>Ahoj,</p><p>tu je váš týždenný prehľad z Jobbie. Prihláste sa a pozrite si nové ponuky.</p><p><a href="https://jobbie.sk/app">Otvoriť Jobbie</a></p>`,
        });
      }
      if (batch.length < PROFILE_BATCH) {
        break;
      }
    }
    this.logger.log('weeklyDigest completed');
  }

  async runReengagement(): Promise<void> {
    const client = this.supabase.getClient();
    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    let cursorId: string | null = null;
    for (;;) {
      let query = client
        .from('profiles')
        .select('id, notification_preferences, updated_at')
        .lte('updated_at', since)
        .order('id', { ascending: true })
        .limit(PROFILE_BATCH);
      if (cursorId) {
        query = query.gt('id', cursorId);
      }
      const { data: profiles, error } = await query;
      if (error || !profiles?.length) {
        break;
      }
      const batch = profiles as { id: string; notification_preferences?: unknown }[];
      cursorId = batch[batch.length - 1]?.id ?? null;
      for (const row of batch) {
        if (!resolveNotificationChannel(row.notification_preferences, 'marketing', 'email')) {
          continue;
        }
        await this.notifications.createForUser({
          userId: row.id,
          type: 'reengagement',
          title: 'Chýbate nám na Jobbie',
          body: 'Pozrite si nové brigády a ponuky vo vašom okolí.',
          metadata: { link_path: APP_PATHS.find },
        });
      }
      if (batch.length < PROFILE_BATCH) {
        break;
      }
    }
    this.logger.log('reengagement completed');
  }
}
