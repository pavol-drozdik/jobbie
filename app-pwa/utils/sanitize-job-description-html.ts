import DOMPurify from 'isomorphic-dompurify'
import { sanitizeForDisplayFromApi } from '~/utils/sanitize-display-html'

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
] as const

/**
 * Sanitizes rich-text before persist (editor save). Strips all attributes (no href/style).
 * Server also sanitizes — never rely on PWA-only DOMPurify for security.
 */
export function sanitizeJobDescriptionHtml(html: string): string {
  const trimmed = html.trim()
  if (!trimmed) return ''
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [],
  }).trim()
}

/**
 * Sanitizes job description HTML for safe `v-html` on detail pages.
 * Nest already sanitizes on persist — skip client DOMPurify on public display.
 */
export function sanitizeJobDescriptionForDisplay(raw: string | null | undefined): string {
  return sanitizeForDisplayFromApi(raw)
}

/** Plain text descriptions skip v-html and render as text — avoids unnecessary parsing. */
export function jobDescriptionLooksLikeHtml(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') return false
  return /<[a-z][\s\S]*>/i.test(raw)
}

/** Alias for generic rich-text save/display pipelines. */
export { sanitizeJobDescriptionHtml as sanitizeRichHtml }
