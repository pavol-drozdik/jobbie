/**
 * Display HTML from Nest public DTOs — sanitized on persist server-side
 * (see backend `sanitizeRichTextHtml` in job-offer-mapper, company-ads, blog).
 * Client re-sanitization is defense-in-depth for editor preview and CSR fallbacks only.
 */

let domPurifyLoader: Promise<typeof import('isomorphic-dompurify').default> | null = null

async function loadDomPurify(): Promise<typeof import('isomorphic-dompurify').default> {
  if (!domPurifyLoader) {
    domPurifyLoader = import('isomorphic-dompurify').then((m) => m.default)
  }
  return domPurifyLoader
}

const DISPLAY_ALLOWED_TAGS = [
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
  'a',
  'img',
  'blockquote',
  'figure',
  'figcaption',
] as const

/**
 * Trust API-sanitized HTML for public SSR/CSR display (job/blog detail from Nest).
 */
export function sanitizeForDisplayFromApi(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') {
    return ''
  }
  return html.trim()
}

/**
 * Lazy DOMPurify for editor previews and untrusted CSR input.
 */
export async function sanitizeForDisplayClient(html: string | null | undefined): Promise<string> {
  if (!html || typeof html !== 'string') {
    return ''
  }
  const trimmed = html.trim()
  if (!trimmed) {
    return ''
  }
  const DOMPurify = await loadDomPurify()
  return DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS: [...DISPLAY_ALLOWED_TAGS],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'width', 'height', 'loading', 'decoding', 'class', 'id'],
  })
}
