import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { BlogService } from '../blog/blog.service';

export type SeoSitemapUrl = {
  loc: string;
  lastmod?: string;
};

export type SeoSitemapPayload = {
  static_paths: string[];
  jobs: Array<{ id: string; updated_at: string | null }>;
  blog: Array<{ slug: string; published_at: string | null }>;
  company_ads: Array<{ id: string; updated_at: string | null }>;
};

const MAX_SITEMAP_JOBS = 5000;
const MAX_SITEMAP_ADS = 2000;
const MAX_SITEMAP_BLOG = 500;

@Injectable()
export class SeoService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly blog: BlogService,
  ) {}

  async buildSitemapPayload(): Promise<SeoSitemapPayload> {
    const client = this.supabase.getReadClient();
    const [jobsRes, adsRes, blogItems] = await Promise.all([
      client
        .from('job_offers')
        .select('id, updated_at')
        .eq('is_deleted', false)
        .eq('is_active', true)
        .or('is_draft.is.null,is_draft.eq.false')
        .order('updated_at', { ascending: false })
        .limit(MAX_SITEMAP_JOBS),
      client
        .from('company_ads')
        .select('id, updated_at')
        .eq('status', 'active')
        .not('ends_at', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(MAX_SITEMAP_ADS),
      this.fetchAllBlogSlugs(),
    ]);
    const jobs = (jobsRes.data ?? []) as Array<{ id: string; updated_at: string | null }>;
    const company_ads = (adsRes.data ?? []) as Array<{ id: string; updated_at: string | null }>;
    return {
      static_paths: [
        '/',
        '/bezpecnost',
        '/pracovne-ponuky',
        '/zahranicne-pracovne-ponuky',
        '/profesionali',
        '/cennik',
        '/blog',
        '/ponuky-na-email',
        '/feeds/jobs.rss',
        '/feeds/jobs.json',
        '/feeds/ads.rss',
        '/feeds/ads.json',
      ],
      jobs,
      blog: blogItems,
      company_ads,
    };
  }

  private async fetchAllBlogSlugs(): Promise<Array<{ slug: string; published_at: string | null }>> {
    const out: Array<{ slug: string; published_at: string | null }> = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.blog.listPublic({
        limit: Math.min(100, MAX_SITEMAP_BLOG - out.length),
        cursor,
      });
      for (const item of page.items) {
        out.push({ slug: item.slug, published_at: item.published_at });
      }
      if (!page.next_cursor || out.length >= MAX_SITEMAP_BLOG) {
        break;
      }
      cursor = page.next_cursor;
    }
    return out;
  }
}
