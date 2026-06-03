import * as DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = [
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
] as const;

/**
 * Server-side HTML sanitizer aligned with app-pwa job description rules.
 * SECURITY: Persist only sanitized HTML — never trust PWA DOMPurify alone.
 */
export function sanitizeRichTextHtml(html: string | null | undefined): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed) return '';
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  }).trim();
}
