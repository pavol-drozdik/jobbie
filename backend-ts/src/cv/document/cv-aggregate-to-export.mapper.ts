import type { CvAggregateResponseDto } from '../cv.dto'
import { CV_DRIVING_LICENSE_CATEGORIES } from '../cv.dto'
import type { CvDocumentExportData, CvDocumentExtraBlock, CvDocumentUiTemplate } from './cv-document.types'
import { apiTemplateKeyToUi } from './cv-template-map'
import {
  CV_EDUCATION_ONGOING_LABEL,
  escapeHtml,
  formatMultiline,
  optionalSectionEnabled,
} from './cv-document-utils'
import { renderExperienceArticleFromBackend } from './cv-document-fragments'

function displayName(cv: CvAggregateResponseDto['cv']): {
  fullName: string
  firstName: string
  lastName: string
} {
  const tp = (cv.title_before_name ?? '').trim()
  const ts = (cv.title_after_name ?? '').trim()
  const fn = (cv.first_name ?? '').trim()
  const ln = (cv.last_name ?? '').trim()
  const core = [tp, fn, ln].filter(Boolean).join(' ')
  const full = (core + (ts ? `, ${ts}` : '')).trim() || (cv.full_name ?? '').trim() || 'Meno Priezvisko'
  return { fullName: full, firstName: fn, lastName: ln }
}

function mapExperience(agg: CvAggregateResponseDto): CvDocumentExportData['experiences'] {
  return [...agg.experience]
    .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
    .map((row) => {
      const bullets =
        row.bullets?.length > 0
          ? row.bullets
          : row.achievements
            ? row.achievements
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            : []
      const startParts = (row.start_date ?? '').split(/[-/]/)
      const endParts = (row.end_date ?? '').split(/[-/]/)
      return {
        title: row.position ?? '',
        employer: row.company ?? '',
        city: [row.city, row.country].filter(Boolean).join(', '),
        current: row.current,
        fromYear: startParts[0] ?? '',
        fromMonth: startParts[1] ?? '',
        toYear: endParts[0] ?? '',
        toMonth: endParts[1] ?? '',
        description: row.description ?? '',
        bullets,
      }
    })
}

function mapEducation(agg: CvAggregateResponseDto): CvDocumentExportData['education'] {
  return [...agg.education]
    .sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))
    .map((row) => {
      const type =
        row.education_kind === 'secondary'
          ? 'secondary'
          : row.education_kind === 'course_certificate'
            ? 'course'
            : 'college'
      return {
        type,
        title: row.school ?? '',
        field: row.field ?? '',
        institution: row.institution ?? row.faculty ?? '',
        maturita: row.has_graduation,
        fromYear: row.start_year != null ? String(row.start_year) : '',
        toYear: row.currently_studying
          ? CV_EDUCATION_ONGOING_LABEL
          : row.end_year != null
            ? String(row.end_year)
            : '',
        description: row.description ?? '',
        bullets: row.bullets ?? [],
      }
    })
}

function buildExtraBlocks(agg: CvAggregateResponseDto): CvDocumentExtraBlock[] {
  const cv = agg.cv
  const blocks: CvDocumentExtraBlock[] = []
  if (agg.volunteering.length && optionalSectionEnabled(cv.optional_sections, 'volunteering')) {
    const html = agg.volunteering
      .map((row) => renderExperienceArticleFromBackend({
        id: row.id,
        cv_id: row.cv_id,
        entry_type: 'employment',
        company: row.organization,
        position: row.role_title,
        city: row.city,
        country: row.country,
        start_date: row.start_date,
        end_date: row.end_date,
        current: row.current,
        description: row.description,
        achievements: null,
        bullets: row.bullets ?? [],
        sort_order: row.sort_order,
      }))
      .join('')
    blocks.push({ title: 'Dobrovoľníctvo', bodyHtml: html })
  }
  if (agg.certifications.length && optionalSectionEnabled(cv.optional_sections, 'certificates')) {
    const html = agg.certifications
      .map(
        (c) => `
        <article class="entry">
          <div class="entry-head">
            <div>
              <h3 class="entry-role">${escapeHtml(c.name)}</h3>
              <div class="entry-meta">${escapeHtml([c.issuer, c.issued_date].filter(Boolean).join(' · '))}</div>
            </div>
          </div>
          ${c.description ? `<p class="small-copy">${formatMultiline(c.description)}</p>` : ''}
        </article>`,
      )
      .join('')
    blocks.push({ title: 'Certifikáty', bodyHtml: html })
  }
  if (agg.portfolio_links.length && optionalSectionEnabled(cv.optional_sections, 'portfolio')) {
    const html = `<div class="contact-stack">${agg.portfolio_links
      .map((p) => `<span>${escapeHtml(`${p.label}: ${p.url}`)}</span>`)
      .join('')}</div>`
    blocks.push({ title: 'Portfólio', bodyHtml: html })
  }
  if (agg.awards.length && optionalSectionEnabled(cv.optional_sections, 'awards')) {
    const html = agg.awards
      .map(
        (a) => `
        <article class="entry">
          <h3 class="entry-role">${escapeHtml(a.title)}</h3>
          <div class="entry-meta">${escapeHtml([a.issuer, a.issued_year != null ? String(a.issued_year) : ''].filter(Boolean).join(' · '))}</div>
          ${a.description ? `<p class="small-copy">${formatMultiline(a.description)}</p>` : ''}
        </article>`,
      )
      .join('')
    blocks.push({ title: 'Ocenenia', bodyHtml: html })
  }
  if (agg.references.length && optionalSectionEnabled(cv.optional_sections, 'references')) {
    const html = agg.references
      .map(
        (r) => `
        <article class="entry">
          <h3 class="entry-role">${escapeHtml(r.person_name)}</h3>
          <div class="entry-meta">${escapeHtml([r.organization, r.position].filter(Boolean).join(' · '))}</div>
          ${r.relationship_note ? `<p class="small-copy">${formatMultiline(r.relationship_note)}</p>` : ''}
        </article>`,
      )
      .join('')
    blocks.push({ title: 'Referencie', bodyHtml: html })
  }
  if (agg.soft_skills.length) {
    const names = agg.soft_skills.map((s) => s.skill_name).filter(Boolean)
    if (names.length) {
      blocks.push({
        title: 'Mäkké zručnosti',
        bodyHtml: `<div class="skill-grid">${names.map((n) => `<span class="skill-chip">${escapeHtml(n)}</span>`).join('')}</div>`,
      })
    }
  }
  return blocks
}

export function mapAggregateToCvDocumentData(
  agg: CvAggregateResponseDto,
  options?: { template?: CvDocumentUiTemplate; profilePhotoDataUrl?: string },
): CvDocumentExportData {
  const cv = agg.cv
  const names = displayName(cv)
  const template = options?.template ?? apiTemplateKeyToUi(cv.template_key)
  const summary = (cv.about_me || cv.bio || '').trim()
  const optional = cv.optional_sections
  const selected = new Set(
    (cv.driving_license_categories ?? []).map((c) => String(c).trim().toUpperCase()),
  )
  const licenses = CV_DRIVING_LICENSE_CATEGORIES.filter((cat) => selected.has(cat))
  return {
    template,
    titlePrefix: (cv.title_before_name ?? '').trim(),
    titleSuffix: (cv.title_after_name ?? '').trim(),
    firstName: names.firstName,
    lastName: names.lastName,
    fullName: names.fullName,
    gender: cv.gender ?? '',
    birthDate: cv.birth_date ?? '',
    email: cv.email ?? '',
    phone: cv.phone ?? '',
    street: cv.address_street ?? '',
    postalCode: cv.address_postal_code ?? '',
    city: cv.address_city ?? '',
    linkedinUrl: cv.linkedin_url ?? '',
    desiredRole: (cv.desired_positions?.[0] ?? cv.cv_title ?? cv.headline ?? '').trim(),
    summary,
    hobbies: cv.hobbies ?? '',
    extraInfo: cv.additional_skills_info ?? '',
    salaryAmount: cv.salary_min != null ? String(cv.salary_min) : '',
    salaryUnit: cv.salary_period ?? '',
    workTypes: cv.employment_types ?? [],
    startTerm: cv.start_availability ?? '',
    drivingLicenses: licenses,
    profilePhoto: options?.profilePhotoDataUrl ?? cv.photo_url ?? '',
    experiences: mapExperience(agg),
    education: mapEducation(agg),
    skills: [...agg.skills]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s) => ({ name: s.skill_name, level: s.level ?? '' })),
    languages: [...agg.languages]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((l) => ({ name: l.language, level: l.level ?? '' })),
    softSkills: agg.soft_skills.map((s) => s.skill_name),
    extraBlocks: buildExtraBlocks(agg),
    showSummary: optionalSectionEnabled(optional, 'summary') && Boolean(summary),
    showHobbies: optionalSectionEnabled(optional, 'hobbies'),
    showDriving: optionalSectionEnabled(optional, 'driving'),
    showExtraInfo: true,
  }
}
