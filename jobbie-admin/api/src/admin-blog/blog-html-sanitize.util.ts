import * as DOMPurify from 'isomorphic-dompurify';
import {
  BUCKET_BLOG_CONTENT,
  BUCKET_BLOG_COVERS,
} from '../admin-storage/upload-policy';

const BLOG_BODY_ALLOWED_TAGS = [
  'p', 'h2', 'h3', 'h4', 'div', 'br', 'b', 'strong', 'i', 'em', 'u',
  'strike', 's', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img', 'pre', 'code',
] as const;

const BLOG_BODY_ALLOWED_ATTR = ['id', 'href', 'src', 'alt', 'width', 'height', 'loading'] as const;

const BLOG_STORAGE_BUCKETS = `(${[BUCKET_BLOG_CONTENT, BUCKET_BLOG_COVERS].join('|')})`;

const SUPABASE_CLOUD_PATTERN = new RegExp(
  `^https://[a-z0-9.-]+\\.supabase\\.co/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
);

const LOCAL_SUPABASE_PATTERN = new RegExp(
  `^https?://(127\\.0\\.0\\.1|localhost)(:\\d+)?/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
  'i',
);

function projectHostPattern(): RegExp | null {
  const raw = process.env.SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw).host.replace(/\./g, '\\.');
    return new RegExp(
      `^https?://${host}/storage/v1/object/public/${BLOG_STORAGE_BUCKETS}/`,
      'i',
    );
  } catch {
    return null;
  }
}

export function isTrustedBlogImageSrc(src: string | null | undefined): boolean {
  const raw = (src ?? '').trim();
  if (!raw || /^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    const href = url.href;
    if (SUPABASE_CLOUD_PATTERN.test(href)) return true;
    if (LOCAL_SUPABASE_PATTERN.test(href)) return true;
    const projectPattern = projectHostPattern();
    return projectPattern?.test(href) ?? false;
  } catch {
    return false;
  }
}

function stripUntrustedImages(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
    const src = srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '';
    return isTrustedBlogImageSrc(src) ? tag : '';
  });
}

function addLazyLoadingToImages(html: string): string {
  return html.replace(/<img\b(?![^>]*\bloading=)/gi, '<img loading="lazy"');
}

export function sanitizeBlogBodyHtml(html: string): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed) return '';

  const purified = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...BLOG_BODY_ALLOWED_TAGS],
    ALLOWED_ATTR: [...BLOG_BODY_ALLOWED_ATTR],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'style'],
  }).trim();

  return addLazyLoadingToImages(stripUntrustedImages(purified));
}

/** First trusted inline image from WYSIWYG body (used as cover/thumbnail fallback). */
export function extractFirstBlogImageUrl(html: string): string | null {
  const re = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const src = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (src && isTrustedBlogImageSrc(src)) return src;
  }
  return null;
}

export function resolveBlogCoverImageUrl(input: {
  cover_image_url?: string | null;
  body_html?: string | null;
}): string | null {
  const explicit = input.cover_image_url?.trim();
  if (explicit) return explicit;
  const fromBody = input.body_html ? extractFirstBlogImageUrl(input.body_html) : null;
  return fromBody ?? null;
}

function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateExcerpt(text: string, maxLen = 280): string {
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 120 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export function resolveBlogExcerpt(row: {
  excerpt?: string | null;
  seo_description?: string | null;
  body_html?: string | null;
}): string | null {
  const explicit = plainTextFromHtml(row.excerpt ?? '');
  if (explicit) return explicit;
  const seo = plainTextFromHtml(row.seo_description ?? '');
  if (seo) return seo;
  const fromBody = plainTextFromHtml(row.body_html ?? '');
  if (!fromBody) return null;
  return truncateExcerpt(fromBody);
}
