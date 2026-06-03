import * as DOMPurify from 'isomorphic-dompurify';
import { isTrustedBlogImageSrc } from '../blog/blog-image-trust.util';

const BLOG_ALLOWED_TAGS = [
  'p',
  'h2',
  'h3',
  'h4',
  'div',
  'br',
  'b',
  'strong',
  'i',
  'em',
  'u',
  'strike',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'a',
  'img',
  'pre',
  'code',
] as const;

const BLOG_ALLOWED_ATTR = ['id', 'href', 'src', 'alt', 'width', 'height', 'loading'] as const;

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

/**
 * Blog article HTML — anchors, blockquotes, TOC ids, trusted inline images only.
 * SECURITY: Persist only output of this function.
 */
export function sanitizeBlogBodyHtml(html: string | null | undefined): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed) return '';
  const purified = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...BLOG_ALLOWED_TAGS],
    ALLOWED_ATTR: [...BLOG_ALLOWED_ATTR],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'style'],
  }).trim();
  return addLazyLoadingToImages(stripUntrustedImages(purified));
}

export { isTrustedBlogImageSrc } from '../blog/blog-image-trust.util';
