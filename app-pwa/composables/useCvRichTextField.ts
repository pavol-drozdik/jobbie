import { sanitizeJobDescriptionHtml } from '~/utils/sanitize-job-description-html'
import {
  isRichTextWithinPlainLimit,
  richTextPlainLength,
} from '~/utils/rich-text-plain-length'

export function sanitizeCvRichHtml(html: string): string {
  return sanitizeJobDescriptionHtml(html)
}

export interface CvRichTextLimitResult {
  ok: boolean
  plainLength: number
  message?: string
}

export function checkCvRichTextPlainLimit(
  html: string | null | undefined,
  maxPlainChars: number,
  fieldLabel: string,
): CvRichTextLimitResult {
  const plainLength = richTextPlainLength(html)
  if (plainLength <= maxPlainChars) {
    return { ok: true, plainLength }
  }
  return {
    ok: false,
    plainLength,
    message: `${fieldLabel}: maximálne ${maxPlainChars} znakov (aktuálne ${plainLength}).`,
  }
}

export function prepareCvRichTextForSave(
  html: string,
  maxPlainChars: number,
  fieldLabel: string,
): { value: string } | { error: string } {
  const sanitized = sanitizeCvRichHtml(html)
  const check = checkCvRichTextPlainLimit(sanitized, maxPlainChars, fieldLabel)
  if (!check.ok) {
    return { error: check.message ?? 'Text je príliš dlhý.' }
  }
  return { value: sanitized }
}

