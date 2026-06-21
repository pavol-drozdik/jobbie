import { Injectable, NotFoundException } from '@nestjs/common';
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
} from '../common/keyset-cursor';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  BlogListItemDto,
  BlogListResponseDto,
  BlogPostDetailDto,
} from './blog.dto';
import { sanitizeBlogBodyHtml } from '../common/sanitize-blog-html.util';
import { resolveBlogCoverImageUrl } from './blog-cover.util';
import { resolveBlogExcerpt } from './blog-excerpt.util';

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  body_html?: string;
  excerpt?: string | null;
  cover_image_url: string | null;
  category: string;
  published_at: string | null;
  reading_time_minutes: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  author_bio?: string | null;
  author_avatar_color?: string | null;
  tags?: string[] | null;
  is_featured?: boolean;
};

const LIST_COLUMNS =
  'id,slug,title,excerpt,seo_description,cover_image_url,category,published_at,reading_time_minutes,is_featured,body_html';

@Injectable()
export class BlogService {
  constructor(private readonly supabase: SupabaseService) {}

  async listPublic(query: {
    limit?: number;
    cursor?: string;
    category?: string;
  }): Promise<BlogListResponseDto> {
    const limit = Math.min(Math.max(query.limit ?? 6, 1), 100);
    const client = this.supabase.getClient();

    let featured: BlogListItemDto | null = null;
    if (!query.cursor) {
      const { data: featuredRows } = await client
        .from('blog_posts')
        .select(LIST_COLUMNS)
        .eq('status', 'published')
        .not('published_at', 'is', null)
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1);
      const row = (featuredRows as BlogRow[] | null)?.[0];
      if (row) {
        featured = this.toListItem(row);
      }
    }

    let q = client
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (featured?.id) {
      q = q.neq('id', featured.id);
    }

    if (query.category) {
      q = q.eq('category', query.category);
    }

    const decoded = decodeKeysetCursor(query.cursor);
    if (decoded) {
      q = q.or(
        `published_at.lt.${decoded.createdAt},and(published_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
      );
    }

    const { data, error } = await q;
    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as BlogRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const items = page.map((r) => this.toListItem(r));
    const last = page[page.length - 1];
    const next_cursor =
      hasMore && last?.published_at
        ? encodeKeysetCursor(last.published_at, last.id)
        : null;

    return { featured, items, next_cursor };
  }

  async getPublicBySlug(slug: string): Promise<BlogPostDetailDto> {
    const normalized = slug.trim().toLowerCase();
    const client = this.supabase.getClient();
    const { data, error } = await client
      .from('blog_posts')
      .select(
        `${LIST_COLUMNS},excerpt,body_html,seo_title,seo_description,author_name,author_role,author_bio,tags`,
      )
      .eq('slug', normalized)
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      throw new NotFoundException('Blog post not found');
    }

    const row = data as BlogRow;
    const related = await this.loadRelated(row.id, row.category, row.published_at);

    return {
      ...this.toListItem(row),
      body_html: sanitizeBlogBodyHtml(row.body_html),
      seo_title: row.seo_title ?? null,
      seo_description: row.seo_description ?? null,
      author_name: row.author_name ?? null,
      author_role: row.author_role ?? null,
      author_bio: row.author_bio ?? null,
      tags: Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === 'string' && t.trim()) : [],
      related,
    };
  }

  private async loadRelated(
    postId: string,
    category: string,
    publishedAt: string | null,
  ): Promise<BlogListItemDto[]> {
    if (!publishedAt) return [];
    const { data } = await this.supabase
      .getClient()
      .from('blog_posts')
      .select(LIST_COLUMNS)
      .eq('status', 'published')
      .eq('category', category)
      .neq('id', postId)
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(3);
    return ((data ?? []) as BlogRow[]).map((r) => this.toListItem(r));
  }

  private toListItem(row: BlogRow): BlogListItemDto {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: resolveBlogExcerpt(row),
      cover_image_url: resolveBlogCoverImageUrl(row),
      category: row.category,
      published_at: row.published_at ?? '',
      reading_time_minutes: row.reading_time_minutes,
    };
  }
}

export { resolveBlogExcerpt } from './blog-excerpt.util';
