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
  renderDrivingStack,
  renderEducationSection,
  renderExperienceSection,
  renderExtraBlocks,
  renderExtraInfoSection,
  renderHobbiesAsList,
  renderLanguagesStack,
} from './cv-document-fragments'

function initialsFrom(data: CvDocumentExportData): string {
  const a = (data.firstName[0] || data.fullName[0] || 'J').toUpperCase()
  const b = (data.lastName[0] || data.fullName[1] || 'B').toUpperCase()
  return `${a}${b}`
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
  const summaryBlock = data.showSummary && data.summary.trim()
    ? `<section class="atlas-intro" data-cv-unit="atomic"><h2 class="section-title">Osobné zhrnutie</h2><div class="rich-html-content">${renderCvRichField(data.summary)}</div></section>`
    : ''
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? `<section class="atlas-block" data-cv-unit="atomic"><h2 class="section-title">Vodičský preukaz</h2>${renderDrivingStack(data.drivingLicenses)}</section>`
      : ''
  const hobbiesBlock =
    data.showHobbies && data.hobbies.trim()
      ? `<section data-cv-unit="atomic" style="margin-top: 18px;"><h2 class="section-title">Záujmy</h2><div class="small-copy rich-html-content">${renderCvRichField(data.hobbies)}</div></section>`
      : ''
  const extraBlock =
    data.showExtraInfo && data.extraInfo.trim()
      ? `<section data-cv-unit="atomic" style="margin-top: 18px;"><h2 class="section-title">Doplňujúce informácie</h2><div class="small-copy rich-html-content">${renderCvRichField(data.extraInfo)}</div></section>`
      : ''
  const extraBlocksHtml = renderExtraBlocks(data.extraBlocks)
  return `
    <main class="resume-page atlas-page">
      <aside class="atlas-sidebar">
        <section class="atlas-block" data-cv-unit="atomic">
          <div class="atlas-profile-card">
            ${renderProfilePhoto(data.profilePhoto, 'dark', initialsFrom(data))}
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
        <div>
          <div>
            ${renderExperienceSection(data.experiences)}
            ${renderEducationSection(data.education)}
          </div>
          <div class="atlas-grid">
            ${extraBlock}
            ${hobbiesBlock}
            ${extraBlocksHtml}
          </div>
        </div>
      </section>
    </main>`
}

export function renderEditorialPage(data: CvDocumentExportData): string {
  const titleStyle = editorialTitleStyle()
  const contactLine = buildContactLineParts(data)
  const photo = renderProfilePhoto(data.profilePhoto, 'warm', initialsFrom(data))
  const skillsSection = data.skills.length
    ? `<section class="section-card" data-cv-unit="atomic"><h2 class="section-title" style="${titleStyle}">Znalosti</h2>${renderSkillGrid(data.skills)}</section>`
    : ''
  const languagesSection = data.languages.length
    ? `<section class="section-card" data-cv-unit="atomic"><h2 class="section-title" style="${titleStyle}">Jazyky</h2>${renderLanguagesStack(data.languages)}</section>`
    : ''
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? `<section class="section-card" data-cv-unit="atomic"><h2 class="section-title" style="${titleStyle}">Vodičský preukaz</h2>${renderDrivingStack(data.drivingLicenses)}</section>`
      : ''
  const extraInfo =
    data.showExtraInfo && data.extraInfo.trim()
      ? renderExtraInfoSection(data.extraInfo, titleStyle)
      : ''
  return `
    <main class="resume-page editorial-page">
      <section class="editorial-topbar">
        <div class="editorial-identity">
          <div>
            <h1 class="editorial-name">${escapeHtml(data.fullName)}</h1>
            ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ''}
            ${data.showSummary && data.summary ? `<div class="editorial-lead rich-html-content">${renderCvRichField(data.summary)}</div>` : ''}
          </div>
        </div>
        ${photo}
      </section>
      <section class="editorial-columns">
        <div>
          ${renderExperienceSection(data.experiences, 'Pracovné skúsenosti', {
            stackClass: 'editorial-stack',
            titleStyle,
            wrapperClass: 'editorial-panel',
          })}
          ${extraInfo}
          ${renderExtraBlocks(data.extraBlocks)}
        </div>
        <aside class="editorial-side">
          ${skillsSection}
          ${renderEducationSection(data.education, 'Vzdelanie', { titleStyle, wrapperClass: 'section-card' })}
          ${drivingBlock}
          ${languagesSection}
          ${data.showHobbies && data.hobbies.trim() ? renderHobbiesAsList(data.hobbies, titleStyle) : ''}
        </aside>
      </section>
    </main>`
}

export function renderMinimalistPage(data: CvDocumentExportData): string {
  const contactLines = buildContactStackLines(data)
  const skillsSection = data.skills.length
    ? `<section data-cv-unit="atomic"><h2 class="section-title">Znalosti</h2>${renderSkillGrid(data.skills)}</section>`
    : ''
  const languagesSection = data.languages.length
    ? `<section data-cv-unit="atomic"><h2 class="section-title">Jazyky</h2>${renderLanguagesStack(data.languages)}</section>`
    : ''
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? `<section data-cv-unit="atomic"><h2 class="section-title">Vodičský preukaz</h2>${renderDrivingStack(data.drivingLicenses)}</section>`
      : ''
  return `
    <main class="resume-page minimalist-page">
      <section class="minimalist-header">
        <div class="minimalist-identity">
          <div>
            <h1 class="minimalist-name">${escapeHtml(data.fullName)}</h1>
            ${data.desiredRole ? `<p class="minimalist-role">${escapeHtml(data.desiredRole)}</p>` : ''}
            ${data.showSummary && data.summary ? `<div class="minimalist-lead rich-html-content">${renderCvRichField(data.summary)}</div>` : ''}
          </div>
        </div>
        <aside class="minimalist-contact">
          ${renderProfilePhoto(data.profilePhoto, 'default', initialsFrom(data))}
          ${contactLines.map((line) => `<span class="small-copy">${escapeHtml(line)}</span>`).join('')}
        </aside>
      </section>
      <section class="minimalist-grid">
        <div class="minimalist-main">
          ${renderExperienceSection(data.experiences, 'Pracovné skúsenosti', { wrapperClass: '' })}
          ${skillsSection}
          ${data.showExtraInfo && data.extraInfo.trim() ? `<section data-cv-unit="atomic"><h2 class="section-title">Doplňujúce informácie</h2><div class="small-copy rich-html-content">${renderCvRichField(data.extraInfo)}</div></section>` : ''}
          ${renderExtraBlocks(data.extraBlocks)}
        </div>
        <aside class="minimalist-side">
          ${renderEducationSection(data.education, 'Vzdelanie', { wrapperClass: '' })}
          ${drivingBlock}
          ${languagesSection}
          ${data.showHobbies && data.hobbies.trim() ? `<section data-cv-unit="atomic"><h2 class="section-title">Záujmy</h2><div class="small-copy rich-html-content">${renderCvRichField(data.hobbies)}</div></section>` : ''}
        </aside>
      </section>
    </main>`
}

export function renderMonochromePage(data: CvDocumentExportData): string {
  const contactLine = buildContactLineParts(data)
  const photo = renderProfilePhoto(data.profilePhoto, 'dark', initialsFrom(data))
  const photoAside = photo ? `<aside class="monochrome-contact">${photo}</aside>` : ''
  const skillsSection = data.skills.length
    ? `<section class="monochrome-card" data-cv-unit="atomic"><h2 class="section-title">Znalosti</h2>${renderSkillGrid(data.skills)}</section>`
    : ''
  const educationSection = renderEducationSection(data.education, 'Vzdelanie', {
    wrapperClass: 'monochrome-card',
  })
  const languagesSection = data.languages.length
    ? `<section class="monochrome-card" data-cv-unit="atomic"><h2 class="section-title">Jazyky</h2>${renderLanguagesStack(data.languages)}</section>`
    : ''
  const drivingBlock =
    data.showDriving && data.drivingLicenses.length
      ? `<section class="monochrome-card" data-cv-unit="atomic"><h2 class="section-title">Vodičský preukaz</h2>${renderDrivingStack(data.drivingLicenses)}</section>`
      : ''
  const extraInfo =
    data.showExtraInfo && data.extraInfo.trim()
      ? `<section><h2 class="section-title">Doplňujúce informácie</h2><article class="entry"><div class="small-copy rich-html-content">${renderCvRichField(data.extraInfo)}</div></article></section>`
      : ''
  return `
    <main class="resume-page monochrome-page">
      <section class="monochrome-header">
        <div class="monochrome-header-grid">
          <div class="monochrome-identity">
            <div>
              <h1 class="monochrome-name">${escapeHtml(data.fullName)}</h1>
              ${contactLine ? `<p>${escapeHtml(contactLine)}</p>` : ''}
              ${data.showSummary && data.summary ? `<div class="monochrome-lead rich-html-content">${renderCvRichField(data.summary)}</div>` : ''}
            </div>
          </div>
          ${photoAside}
        </div>
      </section>
      <section class="monochrome-grid">
        <div class="monochrome-main">
          ${renderExperienceSection(data.experiences, 'Pracovné skúsenosti', { wrapperClass: '' })}
          ${extraInfo}
          ${renderExtraBlocks(data.extraBlocks)}
        </div>
        <aside class="monochrome-side">
          ${skillsSection}
          ${educationSection}
          ${drivingBlock}
          ${languagesSection}
          ${data.showHobbies && data.hobbies.trim() ? `<section class="monochrome-card" data-cv-unit="atomic"><h2 class="section-title">Záujmy</h2><div class="small-copy rich-html-content">${renderCvRichField(data.hobbies)}</div></section>` : ''}
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
