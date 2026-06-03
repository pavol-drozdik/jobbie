import { isTrustedBlogImageSrc } from './blog-image-trust.util';

/** First trusted inline image from article body (cover/thumbnail fallback). */
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
