import { createHash } from 'crypto'
import type { CvDocumentExportData } from './document/cv-document.types'

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const parts = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
  return `{${parts.join(',')}}`
}

/** Bump when HTML/CSS/PDF renderer changes so stored PDFs regenerate. */
const CV_PDF_RENDERER_REVISION = 13

/** Hash canonical CV document export payload to detect PDF staleness. */
export function hashCvDocumentExportData(data: CvDocumentExportData): string {
  return createHash('sha256')
    .update(`rev:${CV_PDF_RENDERER_REVISION}\n`)
    .update(stableStringify(data))
    .digest('hex')
}
