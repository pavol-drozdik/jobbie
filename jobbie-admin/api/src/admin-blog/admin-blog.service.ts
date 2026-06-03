import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { sanitizeBlogBodyHtml, resolveBlogCoverImageUrl, resolveBlogExcerpt } from './blog-html-sanitize.util';
import { SupabaseService } from '../supabase/supabase.service';
import type { CurrentUser } from '../auth/auth.types';
import type { AdminBlogUpsertDto } from './admin-blog.dto';

function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function slugifyHeading(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sekcia';
}

function injectH2Ids(html: string): string {
  return html.replace(
    /<h2(?![^>]*\bid=)([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_match, attrs: string, inner: string) => {
      const plain = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const id = slugifyHeading(plain);
      return `<h2 id="${id}"${attrs}>${inner}</h2>`;
    },
  );
}

export { sanitizeBlogBodyHtml } from './blog-html-sanitize.util';

function sanitizeAndInjectToc(html: string): string {
  return injectH2Ids(sanitizeBlogBodyHtml(html));
}

function estimateReadingMinutes(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.min(120, Math.max(1, Math.ceil(words / 200)));
}

@Injectable()
export class AdminBlogService {
  private readonly logger = new Logger(AdminBlogService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  private throwDbError(
    action: 'list' | 'get' | 'create' | 'update' | 'publish' | 'unpublish' | 'delete',
    error: { code?: string; message: string },
  ): never {
    if (error.code === '23505') {
      throw new ConflictException('Slug already exists');
    }
    if (error.code === '23503') {
      throw new BadRequestException(
        'Could not save post: author profile missing (created_by). Ensure your admin account has a profiles row.',
      );
    }
    this.logger.error(`${action} blog_posts failed: ${error.message}`);
    throw new InternalServerErrorException('Could not save blog post');
  }

  async list(query: { limit?: number; status?: string; q?: string }) {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    let q = this.supabase
      .getClient()
      .from('blog_posts')
      .select(
        'id,slug,title,category,status,published_at,is_featured,created_at,updated_at',
      )
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (query.status && query.status !== 'all') {
      q = q.eq('status', query.status);
    }
    const term = query.q?.trim();
    if (term) {
      const pattern = `%${term.replace(/[%_]/g, '')}%`;
      q = q.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
    }
    const { data, error } = await q;
    if (error) this.throwDbError('list', error);
    return { items: data ?? [] };
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) this.throwDbError('get', error);
    if (!data) throw new NotFoundException('Post not found');
    return data;
  }

  private async resolveCreatedBy(adminId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id')
      .eq('id', adminId)
      .maybeSingle();
    if (error) {
      this.logger.warn(`resolveCreatedBy: ${error.message}`);
      return null;
    }
    return data?.id ?? null;
  }

  async create(admin: CurrentUser, body: AdminBlogUpsertDto) {
    const slug = (body.slug?.trim() || slugifyTitle(body.title)).toLowerCase();
    const bodyHtml = sanitizeAndInjectToc(body.body_html);
    const now = new Date().toISOString();
    const status = body.status ?? 'draft';
    const publishedAt = status === 'published' ? now : null;
    const row = {
      slug,
      title: body.title.trim(),
      excerpt:
        body.excerpt?.trim() ||
        resolveBlogExcerpt({
          excerpt: null,
          seo_description: body.seo_description,
          body_html: bodyHtml,
        }) ||
        null,
      body_html: bodyHtml,
      cover_image_url: resolveBlogCoverImageUrl({
        cover_image_url: body.cover_image_url,
        body_html: bodyHtml,
      }),
      category: body.category,
      status,
      published_at: publishedAt,
      reading_time_minutes:
        body.reading_time_minutes ?? estimateReadingMinutes(bodyHtml),
      author_name: 'Redakcia Jobbie',
      author_role: null,
      author_bio: null,
      author_avatar_color: null,
      tags: [],
      seo_title: body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      is_featured: body.is_featured ?? false,
      created_by: await this.resolveCreatedBy(admin.id),
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .insert(row)
      .select('*')
      .single();
    if (error) this.throwDbError('create', error);

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'blog.post.created',
      subjectType: 'blog_post',
      subjectId: (data as { id: string }).id,
      payload: { slug, status },
    });

    return data;
  }

  async update(admin: CurrentUser, id: string, body: AdminBlogUpsertDto) {
    const existing = await this.getById(id);
    const slug = body.slug?.trim()
      ? body.slug.trim().toLowerCase()
      : (existing as { slug: string }).slug;
    const bodyHtml = sanitizeAndInjectToc(body.body_html);
    const now = new Date().toISOString();
    const status = body.status ?? (existing as { status: string }).status;
    const prevPublished = (existing as { published_at: string | null }).published_at;
    const publishedAt =
      status === 'published' ? prevPublished ?? now : null;

    const row = {
      slug,
      title: body.title.trim(),
      excerpt:
        body.excerpt?.trim() ||
        resolveBlogExcerpt({
          excerpt: null,
          seo_description: body.seo_description,
          body_html: bodyHtml,
        }) ||
        null,
      body_html: bodyHtml,
      cover_image_url: resolveBlogCoverImageUrl({
        cover_image_url: body.cover_image_url,
        body_html: bodyHtml,
      }),
      category: body.category,
      status,
      published_at: publishedAt,
      reading_time_minutes:
        body.reading_time_minutes ?? estimateReadingMinutes(bodyHtml),
      seo_title: body.seo_title?.trim() || null,
      seo_description: body.seo_description?.trim() || null,
      is_featured: body.is_featured ?? (existing as { is_featured: boolean }).is_featured,
      updated_at: now,
    };

    const { data, error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) this.throwDbError('update', error);

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'blog.post.updated',
      subjectType: 'blog_post',
      subjectId: id,
      payload: { slug, status },
    });

    return data;
  }

  async publish(admin: CurrentUser, id: string) {
    const existing = await this.getById(id);
    const bodyHtml = String((existing as { body_html?: string }).body_html ?? '');
    const now = new Date().toISOString();
    const publishedAt =
      (existing as { published_at: string | null }).published_at ?? now;
    const coverImageUrl = resolveBlogCoverImageUrl({
      cover_image_url: (existing as { cover_image_url?: string | null }).cover_image_url,
      body_html: bodyHtml,
    });
    const excerpt =
      (existing as { excerpt?: string | null }).excerpt?.trim() ||
      resolveBlogExcerpt({
        excerpt: null,
        seo_description: (existing as { seo_description?: string | null }).seo_description,
        body_html: bodyHtml,
      }) ||
      null;
    const { data, error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .update({
        status: 'published',
        published_at: publishedAt,
        cover_image_url: coverImageUrl,
        excerpt,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) this.throwDbError('publish', error);
    if (!data) throw new NotFoundException('Post not found');

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'blog.post.published',
      subjectType: 'blog_post',
      subjectId: id,
      payload: {},
    });
    return data;
  }

  async unpublish(admin: CurrentUser, id: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .update({
        status: 'draft',
        published_at: null,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) this.throwDbError('unpublish', error);
    if (!data) throw new NotFoundException('Post not found');

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'blog.post.unpublished',
      subjectType: 'blog_post',
      subjectId: id,
      payload: {},
    });
    return data;
  }

  async remove(admin: CurrentUser, id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('blog_posts')
      .delete()
      .eq('id', id);
    if (error) this.throwDbError('delete', error);

    void this.audit.recordAuditEvent({
      actorUserId: admin.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'blog.post.deleted',
      subjectType: 'blog_post',
      subjectId: id,
      payload: {},
    });
    return { ok: true };
  }
}
