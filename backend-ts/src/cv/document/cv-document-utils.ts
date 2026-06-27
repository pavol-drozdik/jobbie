import { sanitizeRichTextHtml } from '../../common/sanitize-html.util'

export function escapeHtml(value: string | null | undefined): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function formatMultiline(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\n/g, '<br>')
}

export function cvFieldLooksLikeHtml(raw: string | null | undefined): boolean {
  if (!raw || typeof raw !== 'string') {
    return false
  }
  return /<[a-z][\s\S]*>/i.test(raw)
}

/** Renders CV rich-text (sanitized HTML) or legacy plain text for templates. */
export function renderCvRichField(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) {
    return ''
  }
  if (cvFieldLooksLikeHtml(raw)) {
    return sanitizeRichTextHtml(raw)
  }
  return formatMultiline(raw)
}

export function getSafeCvFileName(fullName: string | null | undefined): string {
  const slug = (fullName || 'jobbie-cv')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'jobbie-cv'
}

/** ASCII-only filename for legacy `filename="..."` (Node rejects non-ASCII in headers). */
export function sanitizeAsciiDownloadFilename(filename: string): string {
  const trimmed = filename.trim() || 'download.pdf'
  const withExt = /\.[a-z0-9]+$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`
  const base = withExt.replace(/\.pdf$/i, '')
  const asciiBase = getSafeCvFileName(base === 'jobbie-cv' && base.length < 3 ? 'download' : base)
  return `${asciiBase}.pdf`
}

/**
 * RFC 5987 attachment header safe for Unicode names (e.g. Životopis).
 */
export function buildAttachmentContentDisposition(filename: string): string {
  const display = filename.replace(/[\r\n]/g, '').trim() || 'download.pdf'
  const ascii = sanitizeAsciiDownloadFilename(display)
  const encoded = encodeURIComponent(display)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

/** Inline PDF for browser preview tabs. */
export function buildInlineContentDisposition(filename: string): string {
  const display = filename.replace(/[\r\n]/g, '').trim() || 'preview.pdf'
  const ascii = sanitizeAsciiDownloadFilename(display)
  const encoded = encodeURIComponent(display)
    .replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A')
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

export function linesToBullets(text: string | null | undefined, bullets: string[]): string[] {
  const fromBullets = bullets.map((b) => b.trim()).filter(Boolean)
  if (fromBullets.length > 0) {
    return fromBullets
  }
  if (!text?.trim()) {
    return []
  }
  return text
    .split(/\n+/)
    .map((line) => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
}

export function renderBulletList(items: string[]): string {
  if (!items.length) {
    return ''
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

export { optionalSectionEnabled } from './cv-document-optional-sections'

/** Education end year label when study is still in progress. */
export const CV_EDUCATION_ONGOING_LABEL = 'Neukončené'

const SK_MONTH_NAMES = [
  'Január',
  'Február',
  'Marec',
  'Apríl',
  'Máj',
  'Jún',
  'Júl',
  'August',
  'September',
  'Október',
  'November',
  'December',
] as const

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

/** Slovak month label for CV templates — first three letters of the month name. */
export function formatCvMonthAbbrev(raw: string | null | undefined): string {
  const token = (raw ?? '').trim()
  if (!token) {
    return ''
  }
  const numeric = Number.parseInt(token, 10)
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
    return SK_MONTH_NAMES[numeric - 1]!.slice(0, 3)
  }
  const folded = stripDiacritics(token).toLowerCase()
  const match = SK_MONTH_NAMES.find((name) => {
    const nameFolded = stripDiacritics(name).toLowerCase()
    return (
      nameFolded === folded ||
      nameFolded.startsWith(folded) ||
      folded.startsWith(nameFolded.slice(0, 3))
    )
  })
  if (match) {
    return match.slice(0, 3)
  }
  return token.slice(0, 3)
}

export function formatCvPeriodMonthYear(month: string, year: string): string {
  const y = (year ?? '').trim()
  const m = formatCvMonthAbbrev(month)
  if (m && y) {
    return `${m} ${y}`
  }
  return y || m
}

export function formatEducationEndYear(raw: string | null | undefined): string {
  const token = (raw ?? '').trim()
  if (!token) {
    return ''
  }
  if (/^neukonč/i.test(token)) {
    return CV_EDUCATION_ONGOING_LABEL
  }
  return token
}

export function formatEducationPeriod(fromYear: string, toYear: string): string {
  const from = (fromYear ?? '').trim()
  const end = formatEducationEndYear(toYear)
  return [from, end].filter(Boolean).join(' - ')
}

export function formatExperiencePeriod(item: {
  fromMonth: string
  fromYear: string
  toMonth: string
  toYear: string
  current: boolean
}): string {
  const periodStart = formatCvPeriodMonthYear(item.fromMonth, item.fromYear)
  const periodEnd = item.current
    ? 'Súčasnosť'
    : formatCvPeriodMonthYear(item.toMonth, item.toYear)
  return [periodStart, periodEnd].filter(Boolean).join(' - ')
}

export function formatBackendExperiencePeriod(row: {
  start_date: string | null
  end_date: string | null
  current: boolean
}): string {
  const startParts = (row.start_date ?? '').trim().split(/[-/]/)
  const endParts = (row.end_date ?? '').trim().split(/[-/]/)
  return formatExperiencePeriod({
    fromMonth: startParts[1] ?? '',
    fromYear: startParts[0] ?? '',
    toMonth: endParts[1] ?? '',
    toYear: endParts[0] ?? '',
    current: row.current,
  })
}

export function formatBackendEducationPeriod(row: {
  start_year: number | null
  end_year: number | null
  start_date: string | null
  end_date: string | null
  currently_studying?: boolean
}): string {
  const startParts = (row.start_date ?? '').trim().split(/[-/]/)
  const endParts = (row.end_date ?? '').trim().split(/[-/]/)
  const fromYear =
    row.start_year != null ? String(row.start_year) : (startParts[0] ?? '').trim()
  let toYear = ''
  if (row.currently_studying) {
    toYear = CV_EDUCATION_ONGOING_LABEL
  } else if (row.end_year != null) {
    toYear = String(row.end_year)
  } else {
    toYear = (endParts[0] ?? '').trim()
  }
  return formatEducationPeriod(fromYear, toYear)
}

/** ISO `YYYY-MM-DD` → Slovak CV display `DD. MM. YYYY` (zero-padded, spaced dots). */
export function formatCvBirthDate(raw: string | null | undefined): string {
  const s = (raw ?? '').trim()
  if (!s) {
    return ''
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) {
    return `${iso[3]}. ${iso[2]}. ${iso[1]}`
  }
  return s
}

export function buildContactLineParts(data: {
  email: string
  phone: string
  gender: string
  birthDate: string
}): string {
  const parts: string[] = []
  if (data.email) {
    parts.push(data.email)
  }
  if (data.phone) {
    parts.push(data.phone)
  }
  const identity: string[] = []
  if (data.gender && data.gender !== 'Neuvádzať') {
    identity.push(data.gender)
  }
  if (data.birthDate) {
    identity.push(`Narodenie: ${formatCvBirthDate(data.birthDate)}`)
  }
  if (identity.length) {
    parts.push(identity.join(' | '))
  }
  return parts.join(' - ')
}

export function buildContactStackLines(data: {
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  gender: string
  birthDate: string
  linkedinUrl: string
}): string[] {
  const lines: string[] = []
  if (data.email) {
    lines.push(data.email)
  }
  if (data.phone) {
    lines.push(data.phone)
  }
  if (data.street) {
    lines.push(data.street)
  }
  const cityLine = [data.postalCode, data.city].filter(Boolean).join(' ')
  if (cityLine) {
    lines.push(cityLine)
  }
  const identity: string[] = []
  if (data.gender && data.gender !== 'Neuvádzať') {
    identity.push(data.gender)
  }
  if (data.birthDate) {
    identity.push(`Narodenie: ${formatCvBirthDate(data.birthDate)}`)
  }
  if (identity.length) {
    lines.push(identity.join(' | '))
  }
  if (data.linkedinUrl) {
    lines.push(data.linkedinUrl.replace(/^https?:\/\//i, ''))
  }
  return lines
}

export function renderContactStack(lines: string[], emptyText?: string): string {
  if (!lines.length) {
    return emptyText
      ? `<div class="contact-stack"><span>${escapeHtml(emptyText)}</span></div>`
      : ''
  }
  return `<div class="contact-stack">${lines.map((line) => `<span>${escapeHtml(line)}</span>`).join('')}</div>`
}

export function renderSkillGrid(skills: { name: string; level: string }[], emptyText?: string): string {
  if (!skills.length) {
    return emptyText ? `<p class="small-copy">${escapeHtml(emptyText)}</p>` : ''
  }
  return `<div class="skill-grid">${skills
    .map((skill) => {
      const label = skill.level ? `${skill.name} · ${skill.level}` : skill.name
      return `<span class="skill-chip">${escapeHtml(label)}</span>`
    })
    .join('')}</div>`
}

export function renderProfilePhoto(
  photoUrl: string,
  variant: 'dark' | 'warm' | 'default',
  _initials?: string,
  extraClass = '',
): string {
  if (!photoUrl?.trim()) {
    return ''
  }
  const variantClass = variant === 'default' ? '' : ` ${variant}`
  const moreClass = extraClass.trim() ? ` ${extraClass.trim()}` : ''
  return `<div class="template-profile-photo${variantClass}${moreClass}"><img src="${escapeHtml(photoUrl)}" alt=""></div>`
}

export function nameHtmlForSidebar(fullName: string, firstName: string, lastName: string): string {
  const fn = firstName.trim()
  const ln = lastName.trim()
  if (fn && ln) {
    return `${escapeHtml(fn)}<br>${escapeHtml(ln)}`
  }
  return escapeHtml(fullName)
}
