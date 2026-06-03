import { sanitizeJobDescriptionHtml } from '~/utils/sanitize-job-description-html'

/** Approximate plain-text length of sanitized rich HTML (for character counters). */
export function richTextPlainLength(html: string | null | undefined): number {
  const trimmed = sanitizeJobDescriptionHtml((html ?? '').trim())
  if (!trimmed) {
    return 0
  }
  if (import.meta.client && typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = trimmed
    return (el.textContent ?? '').length
  }
  return trimmed
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length
}

export function isRichTextWithinPlainLimit(
  html: string | null | undefined,
  maxPlainChars: number,
): boolean {
  return richTextPlainLength(html) <= maxPlainChars
}
