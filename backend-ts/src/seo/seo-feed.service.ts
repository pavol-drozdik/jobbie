import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { normalizeJobPhotos } from '../jobs/normalize-job-photos.util';
import type { SeoFeedItemDto, SeoFeedPayloadDto } from './seo-feed.dto';
import { stripHtmlForFeed, truncateFeedSummary } from './seo-feed-text.util';

const DEFAULT_FEED_LIMIT = 100;
const MAX_FEED_LIMIT = 200;

const JOB_FEED_SELECT = 'id, title, description, created_at, updated_at, photos';
const AD_FEED_SELECT =
  'id, title, tagline, body, created_at, updated_at, thumbnail_url';

type JobFeedRow = {
  id: string;
  title: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  photos?: unknown;
};

type AdFeedRow = {
  id: string;
  title: string;
  tagline?: string | null;
  body?: string | null;
  created_at: string;
  updated_at?: string | null;
  thumbnail_url?: string | null;
};

@Injectable()
export class SeoFeedService {
  constructor(private readonly supabase: SupabaseService) {}

  private clampLimit(limit?: number): number {
    const n = Number(limit) || DEFAULT_FEED_LIMIT;
    return Math.min(Math.max(n, 1), MAX_FEED_LIMIT);
  }

  async listJobFeedItems(limit?: number): Promise<SeoFeedPayloadDto> {
    const lim = this.clampLimit(limit);
    const { data } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(JOB_FEED_SELECT)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .or('is_draft.is.null,is_draft.eq.false')
      .order('updated_at', { ascending: false })
      .limit(lim);
    const items = ((data ?? []) as JobFeedRow[]).map((row) =>
      this.mapJobRow(row),
    );
    return { items };
  }

  async listAdFeedItems(limit?: number): Promise<SeoFeedPayloadDto> {
    const lim = this.clampLimit(limit);
    const { data } = await this.supabase
      .getClient()
      .from('company_ads')
      .select(AD_FEED_SELECT)
      .eq('status', 'active')
      .not('ends_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(lim);
    const items = ((data ?? []) as AdFeedRow[]).map((row) => this.mapAdRow(row));
    return { items };
  }

  private mapJobRow(row: JobFeedRow): SeoFeedItemDto {
    const plain = stripHtmlForFeed(row.description || row.title || '');
    const photos = normalizeJobPhotos(row.photos);
    return {
      id: row.id,
      title: row.title,
      summary: truncateFeedSummary(plain || row.title),
      url_path: `/ponuka/${row.id}`,
      published_at: row.created_at,
      updated_at: row.updated_at ?? null,
      image_url: photos[0] ?? null,
    };
  }

  private mapAdRow(row: AdFeedRow): SeoFeedItemDto {
    const plain = stripHtmlForFeed(
      row.body || row.tagline || row.title || '',
    );
    return {
      id: row.id,
      title: row.title,
      summary: truncateFeedSummary(plain || row.title),
      url_path: `/profesionali/${row.id}`,
      published_at: row.created_at,
      updated_at: row.updated_at ?? null,
      image_url: row.thumbnail_url?.trim() || null,
    };
  }
}
