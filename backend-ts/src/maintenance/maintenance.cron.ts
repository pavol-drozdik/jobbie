import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AuditService } from '../audit/audit.service';
import { PromoCampaignService } from '../promotions/promo-campaign.service';
import { SupabaseService } from '../supabase/supabase.service';
import { PENDING_UPLOAD_MAX_AGE_MS } from '../storage/upload-policy';
@Injectable()
export class MaintenanceCron {
  private readonly logger = new Logger(MaintenanceCron.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly promoCampaigns: PromoCampaignService,
  ) {}

  /** Weekly: remove stale device session rows. */
  @Cron('0 4 * * 0')
  async purgeStaleDeviceSessions(): Promise<void> {
    const days =
      Number(this.config.get<string>('MAINTENANCE_DEVICE_SESSION_DAYS')) || 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { error, count } = await this.supabase
      .getClient()
      .from('user_device_sessions')
      .delete({ count: 'exact' })
      .lt('last_seen', cutoff.toISOString());
    if (error) {
      this.logger.warn(`purgeStaleDeviceSessions: ${error.message}`);
      return;
    }
    if ((count ?? 0) > 0) {
      this.logger.log(`Purged ${count} stale device session(s).`);
    }
  }

  /** Hourly: mark company and banner ads past ends_at as expired. */
  @Cron('15 * * * *')
  async expireTimedAds(): Promise<void> {
    const nowIso = new Date().toISOString();
    const client = this.supabase.getClient();
    for (const table of ['company_ads', 'banner_ads'] as const) {
      const { data, error } = await client
        .from(table)
        .select('id')
        .eq('status', 'active')
        .not('ends_at', 'is', null)
        .lt('ends_at', nowIso);
      if (error) {
        this.logger.warn(`expireTimedAds ${table} select: ${error.message}`);
        continue;
      }
      const ids = ((data ?? []) as { id: string }[])
        .map((r) => r.id)
        .filter(Boolean);
      if (ids.length === 0) continue;
      const { error: upErr } = await client
        .from(table)
        .update({ status: 'expired' })
        .in('id', ids);
      if (upErr) {
        this.logger.warn(`expireTimedAds ${table} update: ${upErr.message}`);
      } else {
        this.logger.log(`Expired ${ids.length} ${table} row(s).`);
      }
    }
  }

  /** Hourly: release stale pending promo checkout redemptions. */
  @Cron('45 * * * *')
  async releaseStalePromoRedemptions(): Promise<void> {
    try {
      await this.promoCampaigns.releaseStalePendingRedemptions();
    } catch (err) {
      this.logger.warn(`releaseStalePromoRedemptions: ${String(err)}`);
    }
  }

  /** Hourly: expire stale direct-upload pending rows and remove orphan objects. */
  @Cron('30 * * * *')
  async purgeStalePendingUploads(): Promise<void> {    const cutoff = new Date(Date.now() - PENDING_UPLOAD_MAX_AGE_MS).toISOString();
    const client = this.supabase.getClient();
    const { data: stale, error: selErr } = await client
      .from('storage_pending_uploads')
      .select('id, bucket_id, object_path')
      .eq('status', 'pending')
      .lt('created_at', cutoff);
    if (selErr) {
      this.logger.warn(`purgeStalePendingUploads select: ${selErr.message}`);
      return;
    }
    const rows = (stale ?? []) as { id: string; bucket_id: string; object_path: string }[];
    if (rows.length === 0) return;
    for (const row of rows) {
      void client.storage.from(row.bucket_id).remove([row.object_path]);
    }
    const ids = rows.map((r) => r.id);
    const { error: upErr } = await client
      .from('storage_pending_uploads')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .in('id', ids);
    if (upErr) {
      this.logger.warn(`purgeStalePendingUploads update: ${upErr.message}`);
    } else {
      this.logger.log(`Marked ${ids.length} stale pending upload(s) as failed.`);
    }
  }

  /**
   * Weekly: delete storage objects unreferenced in DB (grace period).
   * NOTE: Only public buckets listed — chat-media orphans need a separate path if added.
   */
  @Cron('0 5 * * 0')
  async purgeOrphanStorageObjects(): Promise<void> {
    const graceDays =
      Number(this.config.get<string>('MAINTENANCE_STORAGE_ORPHAN_GRACE_DAYS')) ||
      7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - graceDays);
    const client = this.supabase.getClient();
    const buckets = [
      { id: 'job-photos', refs: await this.collectJobPhotoPaths(client) },
      { id: 'profile-avatars', refs: await this.collectProfileAvatarPaths(client) },
    ] as const;

    for (const { id: bucketId, refs } of buckets) {
      const { data: objects, error: listErr } = await client.storage
        .from(bucketId)
        .list('', { limit: 500 });
      if (listErr) {
        this.logger.warn(`purgeOrphanStorage ${bucketId}: ${listErr.message}`);
        continue;
      }
      const toDelete: string[] = [];
      for (const obj of objects ?? []) {
        if (!obj.name || obj.name === '.emptyFolderPlaceholder') continue;
        const path = obj.name;
        if (refs.has(path)) continue;
        const updated = obj.updated_at ?? obj.created_at;
        if (updated && new Date(updated) > cutoff) continue;
        toDelete.push(path);
      }
      if (toDelete.length === 0) continue;
      const { error: delErr } = await client.storage.from(bucketId).remove(toDelete);
      if (delErr) {
        this.logger.warn(`purgeOrphanStorage ${bucketId} remove: ${delErr.message}`);
      } else {
        this.logger.log(
          `Removed ${toDelete.length} orphan object(s) from ${bucketId}.`,
        );
        void this.audit.recordAuditEvent({
          actorUserId: null,
          actorIp: null,
          actorUserAgent: null,
          sessionId: null,
          deviceId: null,
          eventType: 'storage.orphan_cleanup',
          subjectType: 'storage_bucket',
          subjectId: null,
          payload: { bucket_id: bucketId, removed_count: toDelete.length },
        });
      }
    }
  }

  private async collectJobPhotoPaths(
    client: ReturnType<SupabaseService['getClient']>,
  ): Promise<Set<string>> {
    const refs = new Set<string>();
    const { data } = await client
      .from('job_offers')
      .select('photos')
      .eq('is_deleted', false);
    for (const row of data ?? []) {
      const photos = (row as { photos?: unknown }).photos;
      if (!Array.isArray(photos)) continue;
      for (const p of photos) {
        const path =
          typeof p === 'string'
            ? p
            : p && typeof p === 'object' && 'path' in p
              ? String((p as { path: string }).path)
              : null;
        if (path) refs.add(path.replace(/^job-photos\//, ''));
      }
    }
    return refs;
  }

  private async collectProfileAvatarPaths(
    client: ReturnType<SupabaseService['getClient']>,
  ): Promise<Set<string>> {
    const refs = new Set<string>();
    const { data } = await client
      .from('profiles')
      .select('avatar_url')
      .not('avatar_url', 'is', null);
    for (const row of data ?? []) {
      const url = (row as { avatar_url?: string }).avatar_url;
      if (!url) continue;
      const m = url.match(/profile-avatars\/(.+)$/);
      if (m?.[1]) refs.add(m[1]);
    }
    return refs;
  }
}
