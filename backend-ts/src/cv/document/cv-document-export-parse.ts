import { BadRequestException } from '@nestjs/common'
import { sanitizeRichTextHtml } from '../../common/sanitize-html.util'
import type {
  CvDocumentExportData,
  CvDocumentUiTemplate,
} from './cv-document.types'
import { getSafeCvFileName } from './cv-document-html'
import { formatEducationEndYear } from './cv-document-utils'

const UI_TEMPLATES = new Set<CvDocumentUiTemplate>([
  'atlas',
  'editorial',
  'minimalist',
  'monochrome',
])

const MAX_SECTION_ROWS = 80
const MAX_BULLETS = 40
const MAX_SOFT_SKILLS = 40
const MAX_EXTRA_BLOCKS = 20
const MAX_TEXT = 12_000
const MAX_PHOTO_DATA_URL_BYTES = 2_500_000

function asString(value: unknown, maxLen = 500): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim().slice(0, maxLen)
}

function sanitizeRichExportField(value: unknown, maxLen = MAX_TEXT): string {
  const raw = asString(value, maxLen)
  if (!raw) {
    return ''
  }
  return sanitizeRichTextHtml(raw)
}

function asBool(value: unknown): boolean {
  return value === true
}

function asStringArray(value: unknown, maxItems: number, maxItemLen = 200): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .slice(0, maxItems)
    .map((item) => asString(item, maxItemLen))
    .filter(Boolean)
}

function sanitizeProfilePhoto(value: unknown): string {
  const photo = asString(value, 4_000_000)
  if (!photo) {
    return ''
  }
  if (/^https:\/\//i.test(photo)) {
    return photo
  }
  if (!/^data:image\/(jpeg|png|webp);base64,/i.test(photo)) {
    return ''
  }
  if (photo.length > MAX_PHOTO_DATA_URL_BYTES) {
    throw new BadRequestException('Profilová fotka je príliš veľká pre export.')
  }
  return photo
}

function parseExperience(raw: unknown): CvDocumentExportData['experiences'] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.slice(0, MAX_SECTION_ROWS).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      title: asString(item.title, 200),
      employer: asString(item.employer, 200),
      city: asString(item.city, 120),
      current: asBool(item.current),
      fromYear: asString(item.fromYear, 8),
      fromMonth: asString(item.fromMonth, 16),
      toYear: asString(item.toYear, 8),
      toMonth: asString(item.toMonth, 16),
      description: sanitizeRichExportField(item.description, MAX_TEXT),
      bullets: asStringArray(item.bullets, MAX_BULLETS, 500),
    }
  })
}

function parseEducation(raw: unknown): CvDocumentExportData['education'] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.slice(0, MAX_SECTION_ROWS).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      type: asString(item.type, 40),
      title: asString(item.title, 200),
      field: asString(item.field, 200),
      institution: asString(item.institution, 200),
      maturita: asBool(item.maturita),
      fromYear: asString(item.fromYear, 8),
      toYear: formatEducationEndYear(asString(item.toYear, 16)),
      description: sanitizeRichExportField(item.description, MAX_TEXT),
      bullets: asStringArray(item.bullets, MAX_BULLETS, 500),
    }
  })
}

function parseNamedLevelRows(
  raw: unknown,
  nameKey: string,
): { name: string; level: string }[] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.slice(0, MAX_SECTION_ROWS).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    return {
      name: asString(item[nameKey] ?? item.name, 120),
      level: asString(item.level, 80),
    }
  })
}

function parseExtraBlocks(raw: unknown): CvDocumentExportData['extraBlocks'] {
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.slice(0, MAX_EXTRA_BLOCKS).map((row) => {
    const item = row && typeof row === 'object' ? (row as Record<string, unknown>) : {}
    const bodyHtml = sanitizeRichTextHtml(asString(item.bodyHtml, MAX_TEXT))
    return {
      title: asString(item.title, 120),
      bodyHtml,
    }
  })
}

/** True when the request body is a draft CV export payload (builder preview). */
export function isCvDocumentPreviewExportPayload(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') {
    return false
  }
  const template = (raw as Record<string, unknown>).template
  return (
    typeof template === 'string' &&
    UI_TEMPLATES.has(template as CvDocumentUiTemplate)
  )
}

/** Validates client preview export payload before Playwright PDF render. */
export function parseCvDocumentExportPayload(raw: unknown): CvDocumentExportData {
  if (!raw || typeof raw !== 'object') {
    throw new BadRequestException('Neplatné dáta pre export PDF.')
  }
  const body = raw as Record<string, unknown>
  const template = asString(body.template, 32) as CvDocumentUiTemplate
  if (!UI_TEMPLATES.has(template)) {
    throw new BadRequestException('Neplatná šablóna CV.')
  }
  const fullName = asString(body.fullName, 240) || 'Meno Priezvisko'
  getSafeCvFileName(fullName)
  return {
    template,
    titlePrefix: asString(body.titlePrefix, 80),
    titleSuffix: asString(body.titleSuffix, 80),
    firstName: asString(body.firstName, 120),
    lastName: asString(body.lastName, 120),
    fullName,
    gender: asString(body.gender, 40),
    birthDate: asString(body.birthDate, 40),
    email: asString(body.email, 240),
    phone: asString(body.phone, 80),
    street: asString(body.street, 240),
    postalCode: asString(body.postalCode, 24),
    city: asString(body.city, 120),
    linkedinUrl: asString(body.linkedinUrl, 500),
    desiredRole: asString(body.desiredRole, 240),
    summary: sanitizeRichExportField(body.summary, MAX_TEXT),
    hobbies: sanitizeRichExportField(body.hobbies, MAX_TEXT),
    extraInfo: sanitizeRichExportField(body.extraInfo, MAX_TEXT),
    salaryAmount: asString(body.salaryAmount, 40),
    salaryUnit: asString(body.salaryUnit, 40),
    workTypes: asStringArray(body.workTypes, 12, 80),
    startTerm: asString(body.startTerm, 80),
    drivingLicenses: asStringArray(body.drivingLicenses, 24, 8),
    profilePhoto: sanitizeProfilePhoto(body.profilePhoto),
    experiences: parseExperience(body.experiences),
    education: parseEducation(body.education),
    skills: parseNamedLevelRows(body.skills, 'name'),
    languages: parseNamedLevelRows(body.languages, 'name'),
    softSkills: asStringArray(body.softSkills, MAX_SOFT_SKILLS, 120),
    extraBlocks: parseExtraBlocks(body.extraBlocks),
    showSummary: asBool(body.showSummary),
    showHobbies: asBool(body.showHobbies),
    showDriving: asBool(body.showDriving),
    showExtraInfo: asBool(body.showExtraInfo),
  }
}
