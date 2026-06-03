import type { CvAggregateResponseDto, CvHeaderResponseDto } from '~/types/cv'
import type {
  CvPrototypeEducationItem,
  CvPrototypeExportData,
  CvPrototypeExperienceItem,
  CvPrototypeLanguageItem,
  CvPrototypeSkillItem,
} from '~/composables/useCvPrototypePreview'
import { optionalSectionEnabled } from '#cv-document/cv-document-optional-sections'
import type { CvPrototypeUiTemplate } from '~/utils/cv-prototype-template-map'

// Builds preview/PDF export DTO from in-memory drafts + aggregate — not the live editor state machine (see CvPrototypeShell).

type ExpDraft = {
  position: string
  company: string
  city: string
  current: boolean
  fromYear: string
  fromMonth: string
  toYear: string
  toMonth: string
  description: string
}

type EduDraft = {
  education_kind: 'university' | 'secondary' | 'course_certificate'
  school: string
  field: string
  institution: string
  has_graduation: boolean
  fromYear: string
  toYear: string
  description: string
  currently_studying: boolean
}

function resolveExportPhotoUrl(url: string | null | undefined): string {
  const u = (url ?? '').trim()
  if (!u) return ''
  if (/^(https?:|blob:)/i.test(u)) return u
  if (import.meta.client && u.startsWith('/')) {
    return `${window.location.origin}${u}`
  }
  return u
}

const LANG_LEVEL_LABELS: { value: string; label: string }[] = [
  { label: 'Začiatočník (A1)', value: 'A1' },
  { label: 'Začiatočník (A2)', value: 'A2' },
  { label: 'Mierne pokročilý (B1)', value: 'B1' },
  { label: 'Pokročilý (B2)', value: 'B2' },
  { label: 'Expert (C1)', value: 'C1' },
  { label: 'Expert (C2)', value: 'C2' },
]

export function buildExportDataFromState(ctx: {
  uiTemplate: CvPrototypeUiTemplate
  header: CvHeaderResponseDto
  aggregate: CvAggregateResponseDto
  expDraft: Record<string, ExpDraft>
  eduDraftForPreview: Record<string, EduDraft>
  skillDraft: Record<string, { skill_name: string; level: string | null }>
  langDraft: Record<string, { language: string; level: string | null }>
  photoUrl: string | null
  employmentLabels: string[]
  startTerm: string
  salaryUnitLabel: string
  licenseDisplay: string[]
}): CvPrototypeExportData {
  const h = ctx.header
  const tp = (h.title_before_name ?? '').trim()
  const ts = (h.title_after_name ?? '').trim()
  const fn = (h.first_name ?? '').trim()
  const ln = (h.last_name ?? '').trim()
  const full = [tp, fn, ln].filter(Boolean).join(' ') + (ts ? `, ${ts}` : '')
  const sortedExp = [...ctx.aggregate.experience].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
  const experiences: CvPrototypeExperienceItem[] = []
  for (const row of sortedExp) {
    const d = ctx.expDraft[row.id]
    if (!d) continue
    const rowBullets = row.bullets?.length ? row.bullets : []
    experiences.push({
      title: d.position,
      employer: d.company,
      city: d.city,
      current: d.current,
      fromYear: d.fromYear,
      fromMonth: d.fromMonth === 'Mesiac' ? '' : d.fromMonth,
      toYear: d.toYear,
      toMonth: d.toMonth === 'Mesiac' ? '' : d.toMonth,
      description: d.description,
      bullets: rowBullets,
    })
  }
  const sortedEdu = [...ctx.aggregate.education].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
  const education: CvPrototypeEducationItem[] = []
  for (const row of sortedEdu) {
    const d = ctx.eduDraftForPreview[row.id]
    if (!d) continue
    const type =
      d.education_kind === 'secondary' ? 'secondary' : d.education_kind === 'course_certificate' ? 'course' : 'college'
    education.push({
      type,
      title: d.school,
      field: d.field,
      institution: d.institution,
      maturita: d.has_graduation,
      fromYear: d.fromYear,
      toYear: d.toYear,
      description: d.description,
      bullets: row.bullets?.length ? row.bullets : [],
    })
  }
  const sortedSk = [...ctx.aggregate.skills].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
  const skills: CvPrototypeSkillItem[] = []
  for (const row of sortedSk) {
    const d = ctx.skillDraft[row.id]
    if (!d || !d.skill_name.trim()) continue
    skills.push({ name: d.skill_name, level: d.level ?? '' })
  }
  const sortedLang = [...ctx.aggregate.languages].sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
  const languages: CvPrototypeLanguageItem[] = []
  for (const row of sortedLang) {
    const d = ctx.langDraft[row.id]
    if (!d || !d.language.trim()) continue
    const lvl = LANG_LEVEL_LABELS.find((x) => x.value === d.level)?.label ?? d.level ?? ''
    languages.push({ name: d.language, level: lvl })
  }
  const salaryAmt =
    h.salary_min != null && Number.isFinite(Number(h.salary_min)) ? String(h.salary_min) : ''
  const licPreview = ctx.licenseDisplay
  const optional = h.optional_sections
  const summary = (h.about_me ?? '').trim()
  return {
    template: ctx.uiTemplate,
    titlePrefix: tp,
    titleSuffix: ts,
    firstName: fn,
    lastName: ln,
    fullName: full.trim() || 'Meno Priezvisko',
    gender: h.gender ?? '',
    birthDate: h.birth_date ?? '',
    email: h.email ?? '',
    phone: h.phone ?? '',
    street: h.address_street ?? '',
    postalCode: h.address_postal_code ?? '',
    city: h.address_city ?? '',
    linkedinUrl: h.linkedin_url ?? '',
    desiredRole: (h.desired_positions?.[0] ?? h.cv_title ?? h.headline ?? '').trim(),
    summary,
    hobbies: h.hobbies ?? '',
    extraInfo: h.additional_skills_info ?? '',
    salaryAmount: salaryAmt,
    salaryUnit: ctx.salaryUnitLabel,
    workTypes: ctx.employmentLabels,
    startTerm: ctx.startTerm,
    drivingLicenses: licPreview,
    profilePhoto: resolveExportPhotoUrl(ctx.photoUrl),
    experiences,
    education,
    skills,
    languages,
    softSkills: ctx.aggregate.soft_skills?.map((s) => s.skill_name).filter(Boolean) ?? [],
    extraBlocks: [],
    showSummary: optionalSectionEnabled(optional, 'summary') && Boolean(summary),
    showHobbies: optionalSectionEnabled(optional, 'hobbies'),
    showDriving: optionalSectionEnabled(optional, 'driving'),
    showExtraInfo: true,
  }
}
