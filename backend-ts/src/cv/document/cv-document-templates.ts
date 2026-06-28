import type { CvDocumentExportData } from './cv-document.types'
import {
  buildContactLineParts,
  buildContactStackLines,
  escapeHtml,
  formatMultiline,
  nameHtmlForSidebar,
  renderCvRichField,
  renderContactStack,
  renderProfilePhoto,
  renderSkillGrid,
} from './cv-document-utils'
import {
  editorialTitleStyle,
  renderDrivingSidebarSection,
  renderDrivingStack,
  renderEducationSection,
  renderEditorialExperienceEducationPanel,
  renderExperienceSection,
  renderExtraBlocks,
  renderExtraInfoSection,
  renderHeaderLead,
  renderLanguagesSidebarSection,
  renderLanguagesStack,
  renderMinimalistOptionalMainSection,
  renderMonochromeExtraInfoSection,
  renderSkillsSidebarSection,
  renderSummarySection,
} from './cv-document-fragments'

function initialsFrom(data: CvDocumentExportData): string {
  const a = (data.firstName[0] || data.fullName[0] || 'J').toUpperCase()
  const b = (data.lastName[0] || data.fullName[1] || 'B').toUpperCase()
  return `${a}${b}`
}

function renderHobbiesMainBlock(data: CvDocumentExportData): string {
  if (!data.showHobbies || !data.hobbies.trim()) {
    return ''
  }
  return `<section data-cv-unit="atomic"><h2 class="section-title">Záujmy</h2><div class="small-copy rich-html-content">${renderCvRichField(data.hobbies)}</div></section>`
}

function renderExtraInfoMainBlock(
  data: CvDocumentExportData,
  options?: { titleStyle?: string; editorial?: boolean },
): string {
  if (!data.showExtraInfo || !data.extraInfo.trim()) {
    return ''
  }
  if (options?.editorial) {
    return renderExtraInfoSection(data.extraInfo, options.titleStyle)
  }
  return `<section data-cv-unit="atomic"><h2 class="section-title">Doplňujúce informácie</h2><div class="small-copy rich-html-content">${renderCvRichField(data.extraInfo)}</div></section>`
}

export function renderAtlasPage(data: CvDocumentExportData): string {
  const contactLines = buildContactStackLines(data)
  const contactSection = contactLines.length
    ? `<section class="atlas-block" data-cv-unit="atomic"><h2 class="section-title">Kontakt</h2>${renderContactStack(contactLines)}</section>`
    : ''
  const skillsSection = data.skills.length
    ? `<section class="atlas-block" data-cv-unit="atomic"><h2 class="section-title">Znalosti</h2>${renderSkillGrid(data.skills)}</section>`
    : ''
  const languagesSection = data.languages.length
    ? `<section class="atlas-block" data-cv-unit="atomic"><h2 class="section-title">Jazyky</h2>${renderLanguagesStack(data.languages)}</section>`
    : ''
  const role = data.desiredRole ? `<p class="atlas-role">${escapeHtml(data.desiredRole)}</p>` : ''
  const summaryBlock =
    data.showSummary && data.summary.trim() ? renderSummarySection(data.summary) : ''
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? `<section class="atlas-block" data-cv-unit="atomic"><h2 class="section-title">Vodičský preukaz</h2>${renderDrivingStack(data.drivingLicenses)}</section>`
      : ''
  const hobbiesBlock = renderHobbiesMainBlock(data)
  const extraBlock = renderExtraInfoMainBlock(data)
  const extraBlocksHtml = renderExtraBlocks(data.extraBlocks)
  return `
    <main class="resume-page atlas-page">
      <aside class="atlas-sidebar">
        <section class="atlas-block" data-cv-unit="atomic">
          <div class="atlas-profile-card">
            ${renderProfilePhoto(data.profilePhoto, 'dark', initialsFrom(data), 'atlas-profile-photo')}
            <div>
              <div class="eyebrow">Profil</div>
              <h1 class="atlas-name">${nameHtmlForSidebar(data.fullName, data.firstName, data.lastName)}</h1>
              ${role}
            </div>
          </div>
        </section>
        ${contactSection}
        ${skillsSection}
        ${languagesSection}
        ${drivingBlock}
      </aside>
      <section class="atlas-main">
        ${summaryBlock}
        ${renderExperienceSection(data.experiences)}
        ${renderEducationSection(data.education)}
        <div class="atlas-stack">
          ${hobbiesBlock}
          ${extraBlock}
          ${extraBlocksHtml}
        </div>
      </section>
    </main>`
}

export function renderEditorialPage(data: CvDocumentExportData): string {
  const titleStyle = editorialTitleStyle()
  const contactLine = buildContactLineParts(data)
  const photo = renderProfilePhoto(data.profilePhoto, 'warm', initialsFrom(data), 'editorial-profile-photo')
  const headerLead =
    data.showSummary && data.summary.trim()
      ? renderHeaderLead(data.summary, 'editorial-lead')
      : ''
  const skillsSection = renderSkillsSidebarSection(data.skills, {
    titleStyle,
    wrapperClass: 'section-card',
  })
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? renderDrivingSidebarSection(data.drivingLicenses, {
          titleStyle,
          wrapperClass: 'section-card',
        })
      : ''
  const languagesSection = renderLanguagesSidebarSection(data.languages, {
    titleStyle,
    wrapperClass: 'section-card',
  })
  const hobbiesBlock =
    data.showHobbies && data.hobbies.trim() ? data.hobbies : ''
  const extraInfo =
    data.showExtraInfo && data.extraInfo.trim() ? data.extraInfo : ''
  return `
    <main class="resume-page editorial-page">
      <section class="editorial-topbar">
        <div class="editorial-identity">
          <div>
            <h1 class="editorial-name">${escapeHtml(data.fullName)}</h1>
            ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ''}
            ${headerLead}
          </div>
        </div>
        ${photo}
      </section>
      <section class="editorial-columns">
        <div>
          ${renderEditorialExperienceEducationPanel(data.experiences, data.education, {
            stackClass: 'editorial-stack',
            titleStyle,
            hobbies: hobbiesBlock,
            extraInfo,
          })}
          <div class="editorial-stack">
            ${renderExtraBlocks(data.extraBlocks)}
          </div>
        </div>
        <aside class="editorial-side">
          ${skillsSection}
          ${drivingBlock}
          ${languagesSection}
        </aside>
      </section>
    </main>`
}

export function renderMinimalistPage(data: CvDocumentExportData): string {
  const contactLines = buildContactStackLines(data)
  const headerLead =
    data.showSummary && data.summary.trim()
      ? renderHeaderLead(data.summary, 'minimalist-lead')
      : data.desiredRole
        ? `<p class="minimalist-role">${escapeHtml(data.desiredRole)}</p>`
        : ''
  const skillsSection = renderSkillsSidebarSection(data.skills, { atomic: true })
  const languagesSection = renderLanguagesSidebarSection(data.languages)
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? renderDrivingSidebarSection(data.drivingLicenses)
      : ''
  const extraInfo =
    data.showExtraInfo && data.extraInfo.trim()
      ? renderMinimalistOptionalMainSection('Doplňujúce informácie', data.extraInfo)
      : ''
  const hobbiesBlock =
    data.showHobbies && data.hobbies.trim()
      ? renderMinimalistOptionalMainSection('Záujmy', data.hobbies)
      : ''
  return `
    <main class="resume-page minimalist-page">
      <section class="minimalist-header">
        <div class="minimalist-identity">
          <h1 class="minimalist-name">${escapeHtml(data.fullName)}</h1>
          ${headerLead}
        </div>
        <aside class="minimalist-contact">
          ${contactLines.map((line) => `<span class="small-copy">${escapeHtml(line)}</span>`).join('')}
        </aside>
      </section>
      <section class="minimalist-grid">
        <div class="minimalist-main">
          ${renderEditorialExperienceEducationPanel(data.experiences, data.education, {
            wrapperClass: '',
            stackClass: '',
          })}
          ${hobbiesBlock}
          ${extraInfo}
          ${renderExtraBlocks(data.extraBlocks)}
        </div>
        <aside class="minimalist-side">
          ${skillsSection}
          ${drivingBlock}
          ${languagesSection}
        </aside>
      </section>
    </main>`
}

export function renderMonochromePage(data: CvDocumentExportData): string {
  const contactLine = buildContactLineParts(data)
  const headerLead =
    data.showSummary && data.summary.trim()
      ? renderHeaderLead(data.summary, 'monochrome-lead')
      : data.desiredRole
        ? `<p class="monochrome-role">${escapeHtml(data.desiredRole)}</p>`
        : ''
  const contactLineHtml = contactLine
    ? `<p class="monochrome-contact-line">${escapeHtml(contactLine)}</p>`
    : ''
  const skillsSection = renderSkillsSidebarSection(data.skills, {
    wrapperClass: 'monochrome-card',
  })
  const languagesSection = renderLanguagesSidebarSection(data.languages, {
    wrapperClass: 'monochrome-card',
  })
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? renderDrivingSidebarSection(data.drivingLicenses, {
          wrapperClass: 'monochrome-card',
        })
      : ''
  const extraInfo =
    data.showExtraInfo && data.extraInfo.trim()
      ? renderMonochromeExtraInfoSection(data.extraInfo)
      : ''
  const hobbiesBlock =
    data.showHobbies && data.hobbies.trim()
      ? renderMinimalistOptionalMainSection('Záujmy', data.hobbies)
      : ''
  return `
    <main class="resume-page monochrome-page">
      <section class="monochrome-header">
        <div class="monochrome-header-grid">
          <div class="monochrome-identity">
            <h1 class="monochrome-name">${escapeHtml(data.fullName)}</h1>
            ${contactLineHtml}
            ${headerLead}
          </div>
        </div>
      </section>
      <section class="monochrome-grid">
        <div class="monochrome-main">
          ${renderEditorialExperienceEducationPanel(data.experiences, data.education, {
            wrapperClass: '',
            stackClass: '',
          })}
          ${hobbiesBlock}
          ${extraInfo}
          ${renderExtraBlocks(data.extraBlocks)}
        </div>
        <aside class="monochrome-side">
          ${skillsSection}
          ${drivingBlock}
          ${languagesSection}
        </aside>
      </section>
    </main>`
}

export function renderTemplateBody(data: CvDocumentExportData): string {
  switch (data.template) {
    case 'editorial':
      return renderEditorialPage(data)
    case 'minimalist':
      return renderMinimalistPage(data)
    case 'monochrome':
      return renderMonochromePage(data)
    case 'atlas':
    default:
      return renderAtlasPage(data)
  }
}
