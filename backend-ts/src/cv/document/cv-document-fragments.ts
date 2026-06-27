import type {
  CvDocumentEducationItem,
  CvDocumentExperienceItem,
  CvDocumentExportData,
} from './cv-document.types'
import {
  escapeHtml,
  formatBackendEducationPeriod,
  formatBackendExperiencePeriod,
  formatEducationPeriod,
  formatExperiencePeriod,
  cvFieldLooksLikeHtml,
  formatMultiline,
  linesToBullets,
  renderCvRichField,
  renderBulletList,
  renderContactStack,
  renderSkillGrid,
} from './cv-document-utils'
import type { ExperienceResponseDto, EducationResponseDto } from '../cv.dto'

const EDITORIAL_ACCENT = '#6f4b22'

function sectionOpen(wrapperClass?: string, extraClass?: string): string {
  const classes = [wrapperClass, extraClass].filter(Boolean).join(' ').trim()
  if (!classes) {
    return '<section>'
  }
  return `<section class="${classes}">`
}

export function renderSummarySection(
  summary: string,
  options?: { wrapperClass?: string; titleStyle?: string; contentClass?: string },
): string {
  if (!summary.trim()) {
    return ''
  }
  const wrapperClass = options?.wrapperClass ?? 'atlas-intro'
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const contentClass = options?.contentClass ?? 'rich-html-content'
  const classAttr = wrapperClass ? ` class="${wrapperClass}"` : ''
  return `
    <section${classAttr} data-cv-unit="atomic">
      <h2 class="section-title"${titleStyle}>Osobné zhrnutie</h2>
      <div class="${contentClass}">${renderCvRichField(summary)}</div>
    </section>`
}

export function renderEducationArticles(education: CvDocumentEducationItem[]): string {
  if (!education.length) {
    return ''
  }
  return education.map((item) => renderEducationArticle(item)).join('')
}

export function renderExperienceArticle(
  item: CvDocumentExperienceItem,
  stackClass = '',
): string {
  const period = formatExperiencePeriod(item)
  const sub = [item.employer, item.city].filter(Boolean).join(' | ')
  const bullets = cvFieldLooksLikeHtml(item.description)
    ? linesToBullets('', item.bullets)
    : linesToBullets(item.description, item.bullets)
  const stack = stackClass ? ` ${stackClass}` : ''
  return `
    <article class="entry${stack}" data-cv-unit="entry">
      <div class="entry-head">
        <div>
          <h3 class="entry-role">${escapeHtml(item.title || 'Pracovná skúsenosť')}</h3>
          ${sub ? `<div class="entry-meta">${escapeHtml(sub)}</div>` : ''}
        </div>
        ${period ? `<div class="entry-date">${escapeHtml(period)}</div>` : ''}
      </div>
      ${renderBulletList(bullets)}
      ${!bullets.length && item.description ? `<div class="small-copy rich-html-content">${renderCvRichField(item.description)}</div>` : ''}
    </article>`
}

export function renderEditorialExperienceEducationPanel(
  experiences: CvDocumentExperienceItem[],
  education: CvDocumentEducationItem[],
  options?: {
    stackClass?: string
    titleStyle?: string
    hobbies?: string
    extraInfo?: string
    wrapperClass?: string
  },
): string {
  const stackClass = options?.stackClass ?? 'editorial-stack'
  const wrapperClass = options?.wrapperClass ?? 'editorial-panel'
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const hobbies = options?.hobbies?.trim() ?? ''
  const extraInfo = options?.extraInfo?.trim() ?? ''
  if (!experiences.length && !education.length && !hobbies && !extraInfo) {
    return ''
  }
  const experienceHtml = experiences.length
    ? `<h2 class="section-title" data-cv-unit="section-head"${titleStyle}>Pracovné skúsenosti</h2>
      ${experiences.map((item) => renderExperienceArticle(item, stackClass)).join('')}`
    : ''
  const educationHtml = education.length
    ? `<h2 class="section-title" data-cv-unit="section-head"${titleStyle}>Vzdelanie</h2>
      ${education.map((item) => renderEducationArticle(item)).join('')}`
    : ''
  const hobbiesHtml = hobbies ? renderEditorialHobbiesEntries(hobbies, options?.titleStyle) : ''
  const extraHtml = extraInfo ? renderEditorialExtraInfoEntries(extraInfo, options?.titleStyle) : ''
  return `
    ${sectionOpen(wrapperClass, 'cv-breakable-section')}
      ${experienceHtml}${educationHtml}${hobbiesHtml}${extraHtml}
    </section>`
}

export function renderEditorialHobbiesEntries(hobbies: string, titleStyle?: string): string {
  if (!hobbies.trim()) {
    return ''
  }
  const style = titleStyle ? ` style="${titleStyle}"` : ''
  if (cvFieldLooksLikeHtml(hobbies)) {
    return `
    <h2 class="section-title" data-cv-unit="section-head"${style}>Záujmy</h2>
    <article class="entry" data-cv-unit="entry">
      <div class="small-copy rich-html-content">${renderCvRichField(hobbies)}</div>
    </article>`
  }
  const items = linesToBullets(hobbies, [])
  if (items.length > 1) {
    return `
    <h2 class="section-title" data-cv-unit="section-head"${style}>Záujmy</h2>
    <article class="entry" data-cv-unit="entry">
      <ul class="two-column-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </article>`
  }
  return `
    <h2 class="section-title" data-cv-unit="section-head"${style}>Záujmy</h2>
    <article class="entry" data-cv-unit="entry">
      <div class="small-copy rich-html-content">${renderCvRichField(hobbies)}</div>
    </article>`
}

export function renderEditorialExtraInfoEntries(extraInfo: string, titleStyle?: string): string {
  if (!extraInfo.trim()) {
    return ''
  }
  const style = titleStyle ? ` style="${titleStyle}"` : ''
  return `
    <h2 class="section-title" data-cv-unit="section-head"${style}>Doplňujúce informácie</h2>
    <article class="entry" data-cv-unit="entry">
      <div class="small-copy rich-html-content">${renderCvRichField(extraInfo)}</div>
    </article>`
}

export function renderExperienceSection(
  experiences: CvDocumentExperienceItem[],
  title = 'Pracovné skúsenosti',
  options?: { stackClass?: string; titleStyle?: string; wrapperClass?: string },
): string {
  const stackClass = options?.stackClass ?? ''
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass ?? 'atlas-intro'
  if (!experiences.length) {
    return ''
  }
  return `
    ${sectionOpen(wrapperClass, 'cv-breakable-section')}
      <h2 class="section-title" data-cv-unit="section-head"${titleStyle}>${escapeHtml(title)}</h2>
      ${experiences.map((item) => renderExperienceArticle(item, stackClass)).join('')}
    </section>`
}

export function renderEducationArticle(item: CvDocumentEducationItem): string {
  const typeLabel =
    item.type === 'secondary'
      ? 'Stredná škola'
      : item.type === 'course'
        ? 'Kurz / certifikát'
        : 'Vysoká škola'
  const period = formatEducationPeriod(item.fromYear, item.toYear)
  const detail = item.field || item.institution || (item.maturita ? 'Ukončená s maturitnou skúškou' : '')
  const bullets = cvFieldLooksLikeHtml(item.description)
    ? linesToBullets('', item.bullets)
    : linesToBullets(item.description, item.bullets)
  return `
    <article class="entry" data-cv-unit="entry">
      <div class="entry-head">
        <div>
          <h3 class="entry-role">${escapeHtml(item.title || typeLabel)}</h3>
          <div class="entry-meta">${escapeHtml(detail || typeLabel)}</div>
        </div>
        ${period ? `<div class="entry-date">${escapeHtml(period)}</div>` : ''}
      </div>
      ${renderBulletList(bullets)}
      ${!bullets.length && item.description ? `<div class="small-copy rich-html-content">${renderCvRichField(item.description)}</div>` : ''}
    </article>`
}

export function renderEducationSection(
  education: CvDocumentEducationItem[],
  title = 'Vzdelanie',
  options?: { titleStyle?: string; wrapperClass?: string },
): string {
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass ?? 'atlas-intro'
  if (!education.length) {
    return ''
  }
  return `
    ${sectionOpen(wrapperClass, 'cv-breakable-section')}
      <h2 class="section-title" data-cv-unit="section-head"${titleStyle}>${escapeHtml(title)}</h2>
      ${education.map((item) => renderEducationArticle(item)).join('')}
    </section>`
}

export function renderLanguagesStack(languages: CvDocumentExportData['languages']): string {
  if (!languages.length) {
    return ''
  }
  const lines = languages.map((lang) =>
    lang.level ? `${lang.name} - ${lang.level}` : lang.name,
  )
  return renderContactStack(lines)
}

export function renderDrivingStack(licenses: string[]): string {
  if (!licenses.length) {
    return ''
  }
  return `<div class="skill-grid">${licenses
    .map((license) => `<span class="skill-chip">${escapeHtml(license)}</span>`)
    .join('')}</div>`
}

export function renderExtraBlocks(blocks: CvDocumentExportData['extraBlocks']): string {
  return blocks
    .map(
      (block) => `
      <section data-cv-unit="atomic">
        <h2 class="section-title">${escapeHtml(block.title)}</h2>
        ${block.bodyHtml}
      </section>`,
    )
    .join('')
}

export function renderHobbiesSection(hobbies: string, titleStyle?: string): string {
  if (!hobbies.trim()) {
    return ''
  }
  const style = titleStyle ? ` style="${titleStyle}"` : ''
  return `
    <section class="section-card" data-cv-unit="atomic">
      <h2 class="section-title"${style}>Záujmy</h2>
      <div class="small-copy rich-html-content">${renderCvRichField(hobbies)}</div>
    </section>`
}

export function renderHobbiesAsList(hobbies: string, titleStyle?: string): string {
  if (!hobbies.trim()) {
    return ''
  }
  if (cvFieldLooksLikeHtml(hobbies)) {
    return renderHobbiesSection(hobbies, titleStyle)
  }
  const items = linesToBullets(hobbies, [])
  const style = titleStyle ? ` style="${titleStyle}"` : ''
  if (items.length > 1) {
    return `
      <section class="section-card" data-cv-unit="atomic">
        <h2 class="section-title"${style}>Záujmy</h2>
        <ul class="two-column-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </section>`
  }
  return renderHobbiesSection(hobbies, titleStyle?.replace('style="', '').replace('"', ''))
}

export function renderExtraInfoSection(extraInfo: string, titleStyle?: string): string {
  if (!extraInfo.trim()) {
    return ''
  }
  const style = titleStyle ? ` style="${titleStyle}"` : ''
  return `
    <section class="editorial-panel" data-cv-unit="atomic" style="margin-top:18px;">
      <h2 class="section-title"${style}>Doplňujúce informácie</h2>
      <article class="entry">
        <div class="small-copy rich-html-content">${renderCvRichField(extraInfo)}</div>
      </article>
    </section>`
}

export function editorialTitleStyle(): string {
  return `color:${EDITORIAL_ACCENT}`
}

export function renderHeaderLead(summary: string, leadClass: string): string {
  if (!summary.trim()) {
    return ''
  }
  return `<p class="${leadClass} rich-html-content">${renderCvRichField(summary)}</p>`
}

export function renderEducationSidebarSection(
  education: CvDocumentEducationItem[],
  options?: { titleStyle?: string; wrapperClass?: string },
): string {
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass
  if (!education.length) {
    return ''
  }
  return renderEducationSection(education, 'Vzdelanie', {
    titleStyle,
    wrapperClass: wrapperClass ?? '',
  })
}

export function renderSkillsSidebarSection(
  skills: CvDocumentExportData['skills'],
  options?: { titleStyle?: string; wrapperClass?: string; atomic?: boolean },
): string {
  if (!skills.length) {
    return ''
  }
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass
  const classAttr = wrapperClass ? ` class="${wrapperClass}"` : ''
  const unitAttr = options?.atomic !== false ? ' data-cv-unit="atomic"' : ''
  return `
    <section${classAttr}${unitAttr}>
      <h2 class="section-title"${titleStyle}>Znalosti</h2>
      ${renderSkillGrid(skills)}
    </section>`
}

export function renderLanguagesSidebarSection(
  languages: CvDocumentExportData['languages'],
  options?: { titleStyle?: string; wrapperClass?: string },
): string {
  if (!languages.length) {
    return ''
  }
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass
  const classAttr = wrapperClass ? ` class="${wrapperClass}"` : ''
  return `
    <section${classAttr} data-cv-unit="atomic">
      <h2 class="section-title"${titleStyle}>Jazyky</h2>
      ${renderLanguagesStack(languages)}
    </section>`
}

export function renderDrivingSidebarSection(
  licenses: string[],
  options?: { titleStyle?: string; wrapperClass?: string },
): string {
  if (!licenses.length) {
    return ''
  }
  const titleStyle = options?.titleStyle ? ` style="${options.titleStyle}"` : ''
  const wrapperClass = options?.wrapperClass
  const classAttr = wrapperClass ? ` class="${wrapperClass}"` : ''
  return `
    <section${classAttr} data-cv-unit="atomic">
      <h2 class="section-title"${titleStyle}>Vodičský preukaz</h2>
      ${renderDrivingStack(licenses)}
    </section>`
}

export function renderMonochromeExtraInfoSection(extraInfo: string): string {
  if (!extraInfo.trim()) {
    return ''
  }
  return `
    <section class="cv-breakable-section" data-cv-unit="atomic" data-cv-pack="with-previous">
      <h2 class="section-title">Doplňujúce informácie</h2>
      <article class="entry">
        <div class="small-copy rich-html-content">${renderCvRichField(extraInfo)}</div>
      </article>
    </section>`
}

export function renderMinimalistOptionalMainSection(
  title: string,
  body: string,
): string {
  if (!body.trim()) {
    return ''
  }
  return `
    <section data-cv-unit="atomic">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div class="small-copy rich-html-content">${renderCvRichField(body)}</div>
    </section>`
}

export function mapAggregateExperience(row: ExperienceResponseDto): CvDocumentExperienceItem {
  const bullets =
    row.bullets?.length > 0
      ? row.bullets
      : row.achievements
        ? row.achievements
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
  return {
    title: row.position ?? '',
    employer: row.company ?? '',
    city: [row.city, row.country].filter(Boolean).join(', '),
    current: row.current,
    fromYear: '',
    fromMonth: '',
    toYear: '',
    toMonth: '',
    description: row.description ?? '',
    bullets,
    // period filled via formatBackendExperiencePeriod in render if needed - for mapper use dates
  }
}

export function renderExperienceArticleFromBackend(
  row: ExperienceResponseDto,
  stackClass = '',
): string {
  const period = formatBackendExperiencePeriod(row)
  const sub = [row.company, row.city, row.country].filter(Boolean).join(' | ')
  const bullets =
    row.bullets?.length > 0
      ? row.bullets
      : row.achievements
        ? row.achievements
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : []
  const stack = stackClass ? ` ${stackClass}` : ''
  return `
    <article class="entry${stack}">
      <div class="entry-head">
        <div>
          <h3 class="entry-role">${escapeHtml(row.position || 'Pracovná skúsenosť')}</h3>
          ${sub ? `<div class="entry-meta">${escapeHtml(sub)}</div>` : ''}
        </div>
        ${period ? `<div class="entry-date">${escapeHtml(period)}</div>` : ''}
      </div>
      ${renderBulletList(bullets)}
      ${!bullets.length && row.description ? `<div class="small-copy rich-html-content">${renderCvRichField(row.description ?? '')}</div>` : ''}
    </article>`
}

export function renderEducationArticleFromBackend(row: EducationResponseDto): string {
  const kindLabel =
    row.education_kind === 'course_certificate'
      ? 'Kurz / certifikát'
      : row.education_kind === 'university'
        ? 'Vysoká škola'
        : 'Stredná škola'
  const period = formatBackendEducationPeriod(row)
  const detail = [row.field, row.faculty, row.city, row.country].filter(Boolean).join(' · ')
  const title = row.school || kindLabel
  const bullets = row.bullets ?? []
  return `
    <article class="entry">
      <div class="entry-head">
        <div>
          <h3 class="entry-role">${escapeHtml(title)}</h3>
          <div class="entry-meta">${escapeHtml(detail || kindLabel)}</div>
        </div>
        ${period ? `<div class="entry-date">${escapeHtml(period)}</div>` : ''}
      </div>
      ${renderBulletList(bullets)}
      ${!bullets.length && row.description ? `<div class="small-copy rich-html-content">${renderCvRichField(row.description ?? '')}</div>` : ''}
    </article>`
}
