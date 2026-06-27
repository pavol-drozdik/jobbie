jest.mock('../../common/sanitize-html.util', () => ({
  sanitizeRichTextHtml: (html: string) =>
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, ''),
}))

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildCvDocument, buildCvDocumentPrint, CV_DOCUMENT_FONT_LINK } from './cv-document-html'
import { buildCvPdfPrintDocument } from './cv-document-preview-html'
import { buildCvDocumentStyles, buildCvDocumentPrintStyles } from './cv-document-styles'
import type { CvDocumentExportData, CvDocumentUiTemplate } from './cv-document.types'
import { CV_DRIVING_LICENSE_CATEGORIES } from '../cv.dto'

function sampleData(template: CvDocumentUiTemplate): CvDocumentExportData {
  return {
    template,
    titlePrefix: '',
    titleSuffix: '',
    firstName: 'Jan',
    lastName: 'Novak',
    fullName: 'Jan Novak',
    gender: '',
    birthDate: '',
    email: 'jan@test.sk',
    phone: '+421900000000',
    street: '',
    postalCode: '',
    city: 'Bratislava',
    linkedinUrl: '',
    desiredRole: 'Developer',
    summary: 'Summary <script>alert(1)</script>',
    hobbies: '',
    extraInfo: '',
    salaryAmount: '',
    salaryUnit: '',
    workTypes: [],
    startTerm: '',
    drivingLicenses: [],
    profilePhoto: '',
    experiences: [
      {
        title: 'Dev',
        employer: 'Acme',
        city: 'BA',
        current: true,
        fromYear: '2020',
        fromMonth: '',
        toYear: '',
        toMonth: '',
        description: 'Did things',
        bullets: ['Built APIs'],
      },
    ],
    education: [],
    skills: [{ name: 'TypeScript', level: 'Expert' }],
    languages: [{ name: 'Slovak', level: 'Native' }],
    softSkills: [],
    extraBlocks: [],
    showSummary: true,
    showHobbies: false,
    showDriving: false,
    showExtraInfo: false,
  }
}

const ATLAS_MAIN_SECTION_ORDER = [
  'Osobné zhrnutie',
  'Pracovné skúsenosti',
  'Vzdelanie',
  'Záujmy',
  'Doplňujúce informácie',
] as const

const ATLAS_SIDE_SECTION_ORDER = ['Znalosti', 'Jazyky', 'Vodičský preukaz'] as const

const TEMPLATE_COLUMN_LAYOUT: Record<
  CvDocumentUiTemplate,
  { main: readonly string[]; side: readonly string[]; headerLeadClass?: string }
> = {
  atlas: {
    main: ATLAS_MAIN_SECTION_ORDER,
    side: ATLAS_SIDE_SECTION_ORDER,
  },
  editorial: {
    main: ['Pracovné skúsenosti', 'Vzdelanie', 'Záujmy', 'Doplňujúce informácie'],
    side: ['Znalosti', 'Vodičský preukaz', 'Jazyky'],
    headerLeadClass: 'editorial-lead',
  },
  minimalist: {
    main: ['Pracovné skúsenosti', 'Vzdelanie', 'Záujmy', 'Doplňujúce informácie'],
    side: ['Znalosti', 'Vodičský preukaz', 'Jazyky'],
    headerLeadClass: 'minimalist-lead',
  },
  monochrome: {
    main: ['Pracovné skúsenosti', 'Záujmy', 'Doplňujúce informácie'],
    side: ['Znalosti', 'Vzdelanie', 'Vodičský preukaz', 'Jazyky'],
    headerLeadClass: 'monochrome-lead',
  },
}

function fullSectionOrderFixture(template: CvDocumentUiTemplate): CvDocumentExportData {
  const data = sampleData(template)
  data.summary = 'Professional summary'
  data.showSummary = true
  data.education = [
    {
      title: 'University',
      type: 'university',
      field: 'IT',
      institution: '',
      fromYear: '2015',
      toYear: '2019',
      maturita: false,
      description: '',
      bullets: [],
    },
  ]
  data.showHobbies = true
  data.hobbies = 'Reading'
  data.showExtraInfo = true
  data.extraInfo = 'Extra details'
  data.showDriving = true
  data.drivingLicenses = ['B']
  data.extraBlocks = [{ title: 'Certifikáty', bodyHtml: '<p>AWS</p>' }]
  return data
}

function titlesInFragment(fragment: string): string[] {
  const titles: string[] = []
  const re = /<h2 class="section-title"[^>]*>([^<]+)<\/h2>/g
  let match: RegExpExecArray | null
  while ((match = re.exec(fragment)) !== null) {
    titles.push(match[1].trim())
  }
  return titles
}

function extractColumnFragments(
  html: string,
  template: CvDocumentUiTemplate,
): { main: string; side: string } {
  switch (template) {
    case 'atlas': {
      const main = html.match(/<section class="atlas-main">([\s\S]*?)<\/section>\s*<\/main>/)?.[1] ?? ''
      const side = html.match(/<aside class="atlas-sidebar">([\s\S]*?)<\/aside>/)?.[1] ?? ''
      return { main, side }
    }
    case 'editorial': {
      const columns =
        html.match(
          /<section class="editorial-columns">\s*<div>([\s\S]*?)<\/div>\s*<aside class="editorial-side">([\s\S]*?)<\/aside>/,
        ) ?? []
      return { main: columns[1] ?? '', side: columns[2] ?? '' }
    }
    case 'minimalist': {
      const grid =
        html.match(
          /<section class="minimalist-grid">\s*<div class="minimalist-main">([\s\S]*?)<\/div>\s*<aside class="minimalist-side">([\s\S]*?)<\/aside>/,
        ) ?? []
      return { main: grid[1] ?? '', side: grid[2] ?? '' }
    }
    case 'monochrome': {
      const grid =
        html.match(
          /<section class="monochrome-grid">\s*<div class="monochrome-main">([\s\S]*?)<\/div>\s*<aside class="monochrome-side">([\s\S]*?)<\/aside>/,
        ) ?? []
      return { main: grid[1] ?? '', side: grid[2] ?? '' }
    }
    default:
      return { main: '', side: '' }
  }
}

function assertRelativeOrder(actual: string[], expected: readonly string[]) {
  const present = expected.filter((title) => actual.includes(title))
  let lastIndex = -1
  for (const title of present) {
    const index = actual.indexOf(title)
    expect(index).toBeGreaterThan(lastIndex)
    lastIndex = index
  }
}

describe('buildCvDocument', () => {
  const templates: CvDocumentUiTemplate[] = ['atlas', 'editorial', 'minimalist', 'monochrome']

  it.each(templates)('renders %s and strips script from rich summary', (template) => {
    const html = buildCvDocument(sampleData(template))
    expect(html).toContain('Pracovné skúsenosti')
    expect(html).toContain('Jan Novak')
    expect(html).not.toContain('alert(1)')
    expect(html).not.toMatch(/<script>alert\(1\)<\/script>/)
    expect(html).toContain('Summary')
    expect(html).toContain(`${template}-page`)
  })

  it('renders sanitized rich summary formatting', () => {
    const data = sampleData('atlas')
    data.summary = '<p><strong>Bold</strong> summary</p>'
    const html = buildCvDocument(data)
    expect(html).toContain('<strong>Bold</strong>')
    expect(html).toContain('rich-html-content')
  })

  it('omits empty sections and photo placeholder', () => {
    const data = sampleData('atlas')
    data.education = []
    data.skills = []
    data.languages = []
    data.profilePhoto = ''
    const html = buildCvDocument(data)
    expect(html).not.toContain('Vzdelanie zatiaľ')
    expect(html).not.toContain('Zručnosti zatiaľ')
    expect(html).not.toContain('Jazyky zatiaľ')
    expect(html).not.toMatch(/<div class="template-profile-photo/)
    expect(html).not.toContain('<h2 class="section-title">Vzdelanie</h2>')
    expect(html).not.toContain('<h2 class="section-title">Znalosti</h2>')
    expect(html).not.toContain('<h2 class="section-title">Jazyky</h2>')
  })

  it('formats experience and education date labels for all templates', () => {
    const data = sampleData('editorial')
    data.experiences = [
      {
        title: 'Dev',
        employer: 'Acme',
        city: 'BA',
        current: false,
        fromYear: '2024',
        fromMonth: 'Január',
        toYear: '2025',
        toMonth: '01',
        description: '',
        bullets: [],
      },
    ]
    data.education = [
      {
        type: 'college',
        title: 'Univerzita',
        field: 'IT',
        institution: '',
        maturita: false,
        fromYear: '2020',
        toYear: 'Neukončené',
        description: '',
        bullets: [],
      },
    ]
    const html = buildCvDocument(data)
    expect(html).toContain('Jan 2024 - Jan 2025')
    expect(html).toMatch(/2020 - Neukončené/)
    expect(html).not.toContain('Janu 2024')
    expect(html).not.toMatch(/2020 - Neukonče<\/div>/)
  })

  it('minimalist omits profile photo even when photo URL is set', () => {
    const data = sampleData('minimalist')
    data.profilePhoto = 'https://example.com/photo.jpg'
    const html = buildCvDocument(data)
    expect(html).not.toMatch(/<div class="template-profile-photo/)
    expect(html).not.toContain('example.com/photo.jpg')
  })

  it('minimalist places education directly under work experience in the main column', () => {
    const html = buildCvDocument(fullSectionOrderFixture('minimalist'))
    const { main } = extractColumnFragments(html, 'minimalist')
    const expIdx = main.indexOf('>Pracovné skúsenosti<')
    const eduIdx = main.indexOf('>Vzdelanie<')
    const extraIdx = main.indexOf('>Doplňujúce informácie<')
    const hobbiesIdx = main.indexOf('>Záujmy<')
    expect(expIdx).toBeGreaterThanOrEqual(0)
    expect(eduIdx).toBeGreaterThan(expIdx)
    expect(hobbiesIdx).toBeGreaterThan(eduIdx)
    expect(extraIdx).toBeGreaterThan(hobbiesIdx)
  })

  it.each(['atlas', 'editorial', 'minimalist', 'monochrome'] as const)(
    '%s places Záujmy before Doplňujúce informácie when both are present',
    (template) => {
      const data = fullSectionOrderFixture(template)
      const html = buildCvDocument(data)
      const hobbiesIdx = html.indexOf('>Záujmy<')
      const extraIdx = html.indexOf('>Doplňujúce informácie<')
      expect(hobbiesIdx).toBeGreaterThanOrEqual(0)
      expect(extraIdx).toBeGreaterThan(hobbiesIdx)
    },
  )

  it('uses template-specific page class', () => {
    expect(buildCvDocument(sampleData('editorial'))).toContain('editorial-page')
    expect(buildCvDocument(sampleData('minimalist'))).toContain('minimalist-page')
    expect(buildCvDocument(sampleData('monochrome'))).toContain('monochrome-page')
  })

  it('editorial places education directly under work experience in the main column', () => {
    const html = buildCvDocument(fullSectionOrderFixture('editorial'))
    const { main } = extractColumnFragments(html, 'editorial')
    const expIdx = main.indexOf('>Pracovné skúsenosti<')
    const eduIdx = main.indexOf('>Vzdelanie<')
    const hobbiesIdx = main.indexOf('>Záujmy<')
    const extraIdx = main.indexOf('>Doplňujúce informácie<')
    expect(expIdx).toBeGreaterThanOrEqual(0)
    expect(eduIdx).toBeGreaterThan(expIdx)
    expect(hobbiesIdx).toBeGreaterThan(eduIdx)
    expect(extraIdx).toBeGreaterThan(hobbiesIdx)
    expect(main.slice(expIdx, eduIdx)).toContain('entry-role')
  })

  it.each(templates)('%s uses design-aligned section order in main and side columns', (template) => {
    const html = buildCvDocument(fullSectionOrderFixture(template))
    const layout = TEMPLATE_COLUMN_LAYOUT[template]
    const { main, side } = extractColumnFragments(html, template)
    const mainTitles = titlesInFragment(main)
    const sideTitles = titlesInFragment(side)

    assertRelativeOrder(mainTitles, layout.main)
    assertRelativeOrder(sideTitles, layout.side)

    const extraBlockIndex = mainTitles.indexOf('Certifikáty')
    expect(extraBlockIndex).toBeGreaterThanOrEqual(0)

    if (template === 'atlas') {
      expect(main).toContain('Osobné zhrnutie')
      const hobbiesIndex = mainTitles.indexOf('Záujmy')
      expect(hobbiesIndex).toBeGreaterThanOrEqual(0)
      expect(extraBlockIndex).toBeGreaterThan(hobbiesIndex)
    } else {
      expect(main).not.toContain('Osobné zhrnutie')
      expect(html).toContain(layout.headerLeadClass!)
      expect(html).toContain('Professional summary')
    }

    if (template === 'editorial') {
      expect(mainTitles).toContain('Vzdelanie')
      expect(mainTitles).toContain('Záujmy')
      expect(sideTitles).not.toContain('Vzdelanie')
      expect(sideTitles).not.toContain('Záujmy')
    }
    if (template === 'minimalist') {
      expect(sideTitles).toContain('Znalosti')
      expect(mainTitles).toContain('Vzdelanie')
      expect(mainTitles).not.toContain('Znalosti')
      expect(sideTitles).not.toContain('Vzdelanie')
    }
    if (template === 'monochrome') {
      expect(sideTitles).toContain('Vzdelanie')
      expect(mainTitles).not.toContain('Vzdelanie')
    }
  })

  it('preview mode includes client pagination markup and bootstrap', () => {
    const html = buildCvDocument(sampleData('atlas'), { mode: 'preview' })
    expect(html).toContain('cv-export-preview')
    expect(html).toContain('id="cv-pagination-source"')
    expect(html).toContain('id="cv-pagination-output"')
    expect(html).toContain('Pripravujem náhľad')
    expect(html).toContain('__cvPaginationDone')
    expect(html).not.toContain('paged.polyfill.js')
    expect(html).toContain('cv-breakable-section')
  })

  it('pdf export mode does not clip resume-page to one A4 height', () => {
    const html = buildCvDocument(sampleData('atlas'), { mode: 'pdf' })
    expect(html).toContain('cv-export-pdf')
    expect(html).toContain('overflow: visible')
    expect(html).toContain('min-height: 0')
    expect(html).toContain('cv-pagination-output')
    expect(html).not.toMatch(/\.resume-page\s*\{[^}]*overflow:\s*hidden/)
  })

  it('marks experience and education sections as breakable', () => {
    const html = buildCvDocument(sampleData('atlas'))
    expect(html).toContain('class="atlas-intro cv-breakable-section"')
  })

  it('keeps paginated cv-sheet at fixed A4 height', () => {
    const styles = buildCvDocumentStyles('pdf')
    expect(styles).toContain('.resume-page:not(.cv-sheet)')
    expect(styles).toContain('min-height: var(--paper-height)')
  })

  it('formats birth date as Slovak DD. MM. YYYY in Atlas contact', () => {
    const data = sampleData('atlas')
    data.birthDate = '2000-01-01'
    const html = buildCvDocument(data)
    expect(html).toContain('Narodenie: 01. 01. 2000')
    expect(html).not.toContain('Narodenie: 2000-01-01')
  })

  it('uses atlas-stack for extra info and hobbies', () => {
    const data = sampleData('atlas')
    data.showExtraInfo = true
    data.extraInfo = 'Flexibilita a zodpovedný prístup.'
    data.showHobbies = true
    data.hobbies = 'Šport a turistika'
    const html = buildCvDocument(data)
    expect(html).toContain('class="atlas-stack"')
    expect(html).not.toContain('class="atlas-grid"')
  })

  it('buildCvDocumentPrint produces direct-print HTML (no packer, has @page)', () => {
    const templates: CvDocumentUiTemplate[] = ['atlas', 'editorial', 'minimalist', 'monochrome']
    for (const template of templates) {
      const html = buildCvDocumentPrint(sampleData(template))
      expect(html).toContain('@page')
      expect(html).toContain('cv-export-pdf')
      // Must not have the packer DOM structure (CSS selectors referencing them are OK)
      expect(html).not.toContain('id="cv-pagination-source"')
      expect(html).not.toContain('id="cv-pagination-output"')
      expect(html).not.toContain('__cvPaginationDone')
      expect(html).toContain(`${template}-page`)
    }
    const atlasHtml = buildCvDocumentPrint(sampleData('atlas'))
    expect(atlasHtml).toContain('atlas-stack')
    const printStyles = buildCvDocumentPrintStyles()
    expect(printStyles).toContain('min-height: var(--paper-height)')
  })

  it('atlas profile photo is 40mm circle without border class hook', () => {
    const data = sampleData('atlas')
    data.profilePhoto = 'https://example.com/photo.jpg'
    const html = buildCvDocument(data)
    expect(html).toContain('atlas-profile-photo')
    const styles = buildCvDocumentStyles('pdf')
    expect(styles).toContain('width: 40mm')
    expect(styles).toContain('border-radius: 50%')
    expect(styles).toContain('.atlas-sidebar .atlas-profile-photo')
  })

  function atlasPaginationFixture(): CvDocumentExportData {
    const data = sampleData('atlas')
    data.showDriving = true
    data.drivingLicenses = [...CV_DRIVING_LICENSE_CATEGORIES]
    data.education = [
      {
        type: 'secondary',
        title: 'Gymnázium',
        field: 'Všeobecné',
        institution: 'Bratislava',
        maturita: true,
        fromYear: '2010',
        toYear: '2014',
        description:
          '<p>Dlhý popis štúdia s detailmi, projektmi a výsledkami, ktorý pomáha presunúť druhú školu na ďalšiu stranu.</p>',
        bullets: ['Projekt A', 'Projekt B', 'Projekt C'],
      },
      {
        type: 'university',
        title: 'Informačné technológie',
        field: 'Softvérové inžinierstvo',
        institution: 'STU',
        maturita: false,
        fromYear: '2014',
        toYear: '2018',
        description:
          '<p>Druhá škola s rozsiahlym obsahom, ktorá musí zostať celá na jednej stránke spolu s nadpisom sekcie.</p>',
        bullets: ['Diplomová práca', 'Stáž'],
      },
    ]
    for (let i = 0; i < 8; i++) {
      data.experiences.push({
        title: `Senior developer ${i}`,
        employer: 'Enterprise Corp',
        city: 'Bratislava',
        current: false,
        fromYear: '2010',
        fromMonth: '01',
        toYear: '2012',
        toMonth: '12',
        description: 'Backend, integrácie a údržba legacy modulov.',
        bullets: ['API', 'Mentoring'],
      })
    }
    return data
  }

  function countPdfPages(pdf: Buffer): number {
    const parts = pdf.toString('latin1').split('/Type /Page')
    return Math.max(0, parts.length - 1)
  }

  const EXP_ONE_TITLE = 'Lead Developer Alpha'
  const EXP_TWO_TITLE = 'Senior Developer Beta'
  const EDU_TITLE = 'Gymnázium Bratislava'

  function editorialFullFixture(): CvDocumentExportData {
    const data = sampleData('editorial')
    data.fullName = 'Pa Dr'
    data.firstName = 'Pa'
    data.lastName = 'Dr'
    data.summary =
      'Frontend developer so zameraním na prístupnosť, výkon a udržateľný kód v tíme.'
    data.showSummary = true
    data.showExtraInfo = true
    data.extraInfo =
      'Ochota učiť sa nové technológie, flexibilita a zodpovedný prístup k práci.'
    data.showHobbies = true
    data.hobbies = 'Programovanie\nŠport\nCestovanie'
    data.showDriving = true
    data.drivingLicenses = [...CV_DRIVING_LICENSE_CATEGORIES]
    data.education = [
      {
        title: 'Žilinská univerzita v Žiline',
        type: 'university',
        field: 'Informatika',
        institution: 'Žilinská univerzita v Žiline',
        fromYear: '2018',
        toYear: '2022',
        maturita: false,
        description: 'Štúdium softvérového inžinierstva a webových technológií.',
        bullets: [],
      },
    ]
    data.skills = [{ name: 'Excel', level: 'Expert' }]
    data.languages = [{ name: 'Angličtina', level: 'Expert (C2)' }]
    data.experiences = [
      {
        title: 'Frontend Developer',
        employer: 'Profesia',
        city: 'Bratislava',
        current: true,
        fromYear: '2025',
        fromMonth: '01',
        toYear: '',
        toMonth: '',
        description: '',
        bullets: [
          'Vývoj admin rozhraní a zákazníckych služieb',
          'Optimalizácia výkonu aplikácií',
          'Tímová spolupráca na novej platforme',
          'Implementácia prístupnosti WCAG',
          'Unit testy a code review',
          'Integrácia REST API',
          'Migrácia legacy komponentov',
        ],
      },
    ]
    return data
  }

  function balancedPaginationFixture(template: CvDocumentUiTemplate): CvDocumentExportData {
    const longExpOneBody =
      'Vedenie tímu pri vývoji interných nástrojov, migrácia monolitu na mikroslužby, údržba integračných API, ' +
      'monitoring produkčných incidentov, návrh dátových modelov, refaktoring legacy modulov. '.repeat(8)
    const expOne = {
      title: EXP_ONE_TITLE,
      employer: 'Tech Solutions',
      city: 'Bratislava',
      current: false,
      fromYear: '2018',
      fromMonth: '03',
      toYear: '2022',
      toMonth: '06',
      description: longExpOneBody,
      bullets: [
        'Návrh REST API pre fakturáciu a reporting',
        'Optimalizácia SQL dotazov, indexov a batch jobov',
        'Mentoring juniorov, code review a párové programovanie',
        'Integrácia platebných brán a notifikačných služieb',
        'Zavedenie logovania, tracingu a alerting pre produkciu',
      ],
    }
    const expTwo = {
      title: EXP_TWO_TITLE,
      employer: 'Digital Works',
      city: 'Košice',
      current: true,
      fromYear: '2022',
      fromMonth: '07',
      toYear: '',
      toMonth: '',
      description:
        'Vývoj klientskych portálov, interných admin rozhraní a podpora produkčných nasadení v rámci SCRUM tímu.',
      bullets: ['Vue aplikácie', 'Code review', 'Technická dokumentácia'],
    }
    const educationEntry = {
      type: 'secondary',
      title: EDU_TITLE,
      field: 'Všeobecné',
      institution: 'Bratislava',
      maturita: true,
      fromYear: '2010',
      toYear: '2014',
      description:
        'Zameranie na matematiku a informatiku, účasť na programátorských súťažiach a školských projektoch.',
      bullets: ['Maturita z matematiky', 'Školský informačný systém'],
    }

    if (template === 'atlas') {
      const data = atlasPaginationFixture()
      data.experiences[0] = { ...data.experiences[0], title: EXP_ONE_TITLE }
      data.experiences[1] = { ...data.experiences[1], title: EXP_TWO_TITLE }
      if (data.education[0]) {
        data.education[0] = { ...data.education[0], title: EDU_TITLE }
      }
      return data
    }

    const data = sampleData(template)
    data.summary =
      '<p>Skúsený vývojár so zameraním na backend systémy, integrácie a údržbu produkčných služieb v tíme. ' +
      'Zameriavam sa na čitateľný kód, stabilné nasadenia a spoluprácu s produktovým tímom.</p>'
    data.experiences = [expOne, expTwo]
    for (let i = 0; i < 6; i++) {
      data.experiences.push({
        title: `Padding role ${i}`,
        employer: 'Enterprise Corp',
        city: 'Bratislava',
        current: false,
        fromYear: '2008',
        fromMonth: '01',
        toYear: '2010',
        toMonth: '12',
        description:
          'Dlhý popis úloh a zodpovedností na natiahnutie obsahu cez viacero A4 strán pri exporte životopisu.',
        bullets: ['Integrácie', 'Údržba', 'Monitoring'],
      })
    }
    data.education = [educationEntry]
    data.skills = [
      { name: 'TypeScript', level: 'Expert' },
      { name: 'PostgreSQL', level: 'Advanced' },
      { name: 'Docker', level: 'Advanced' },
      { name: 'NestJS', level: 'Expert' },
      { name: 'Vue', level: 'Intermediate' },
      { name: 'Redis', level: 'Intermediate' },
      { name: 'GraphQL', level: 'Intermediate' },
      { name: 'AWS', level: 'Intermediate' },
    ]
    data.languages = [
      { name: 'Slovak', level: 'Native' },
      { name: 'English', level: 'C1' },
      { name: 'German', level: 'B1' },
      { name: 'Czech', level: 'B2' },
    ]
    return data
  }

  function mainColumnSelector(template: CvDocumentUiTemplate): string {
    switch (template) {
      case 'atlas':
        return '.atlas-main'
      case 'editorial':
        return '.editorial-columns > div'
      case 'minimalist':
        return '.minimalist-main'
      case 'monochrome':
        return '.monochrome-main'
      default:
        return '.cv-sheet-flow'
    }
  }

  async function runPaginationLayoutCheck(
    html: string,
    template: CvDocumentUiTemplate,
  ): Promise<{
    sheetCount: number
    page1HasExpOne: boolean
    page1HasExpTwo: boolean
    page2HasExpTwo: boolean
    page2HasEducation: boolean
    page1MainFillRatio: number
  }> {
    const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
    const renderer = new CvHtmlPdfRenderer()
    try {
      const extracted = await renderer.extractPaginatedOutput(html)
      const browser = await (await import('playwright')).chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
      try {
        await page.setContent(
          buildCvPdfPrintDocument({
            title: 'Layout check',
            fontLink: CV_DOCUMENT_FONT_LINK,
            styles: buildCvDocumentStyles('pdf'),
            outputHtml: extracted.outputHtml,
          }),
          { waitUntil: 'networkidle', timeout: 60_000 },
        )
        const mainSel = mainColumnSelector(template)
        const layout = await page.evaluate(
          ({ mainSelector, expOne, expTwo, eduTitle }) => {
            const sheets = Array.from(document.querySelectorAll('.cv-sheet'))
            const maxH = Math.floor(297 * (96 / 25.4)) - 36
            const sheetText = (el: Element) => el.textContent ?? ''
            const page1 = sheets[0]
            const page2 = sheets[1]
            const page1Main = page1?.querySelector(mainSelector)
            const page1MainFillRatio = page1Main
              ? (page1Main as HTMLElement).scrollHeight / maxH
              : 0
            return {
              sheetCount: sheets.length,
              page1HasExpOne: page1 ? sheetText(page1).includes(expOne) : false,
              page1HasExpTwo: page1 ? sheetText(page1).includes(expTwo) : false,
              page2HasExpTwo: page2 ? sheetText(page2).includes(expTwo) : false,
              page2HasEducation: page2 ? sheetText(page2).includes(eduTitle) : false,
              page1MainFillRatio,
            }
          },
          {
            mainSelector: mainSel,
            expOne: EXP_ONE_TITLE,
            expTwo: EXP_TWO_TITLE,
            eduTitle: EDU_TITLE,
          },
        )
        return layout
      } finally {
        await browser.close()
      }
    } finally {
      await renderer.onModuleDestroy()
    }
  }

  describe('editorial PDF layout', () => {
    it('keeps a full moderate editorial CV on a single sheet', async () => {
      const data = editorialFullFixture()
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        expect(extracted.sheetCount).toBe(1)
        expect(extracted.outputHtml).toContain('Doplňujúce informácie')
        expect(extracted.outputHtml).toContain('Pracovné skúsenosti')
        expect(extracted.outputHtml).toContain('Frontend Developer')
      } finally {
        await renderer.onModuleDestroy()
      }
    }, 60_000)

    it('does not orphan extra info alone on an editorial continuation sheet', async () => {
      const data = balancedPaginationFixture('editorial')
      data.showExtraInfo = true
      data.extraInfo = 'Ochota učiť sa nové technológie, flexibilita a zodpovedný prístup k práci.'
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)
        const browser = await (await import('playwright')).chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
        try {
          await page.setContent(
            buildCvPdfPrintDocument({
              title: data.fullName,
              fontLink: CV_DOCUMENT_FONT_LINK,
              styles: buildCvDocumentStyles('pdf'),
              outputHtml: extracted.outputHtml,
            }),
            { waitUntil: 'networkidle', timeout: 60_000 },
          )
          const orphanExtra = await page.evaluate(() => {
            const sheets = Array.from(document.querySelectorAll('.cv-sheet'))
            for (let i = 1; i < sheets.length; i++) {
              const titles = Array.from(sheets[i].querySelectorAll('h2.section-title')).map((el) =>
                el.textContent?.trim(),
              )
              const prevHasExperience = (sheets[i - 1].textContent ?? '').includes(
                'Pracovné skúsenosti',
              )
              if (
                prevHasExperience &&
                titles.length === 1 &&
                titles[0] === 'Doplňujúce informácie'
              ) {
                return true
              }
            }
            return false
          })
          expect(orphanExtra).toBe(false)
        } finally {
          await browser.close()
        }
      } finally {
        await renderer.onModuleDestroy()
      }
    }, 90_000)

    it('uses readable font size on paginated editorial sheets', async () => {
      const data = editorialFullFixture()
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        const browser = await (await import('playwright')).chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
        try {
          await page.setContent(
            buildCvPdfPrintDocument({
              title: data.fullName,
              fontLink: CV_DOCUMENT_FONT_LINK,
              styles: buildCvDocumentStyles('pdf'),
              outputHtml: extracted.outputHtml,
            }),
            { waitUntil: 'networkidle', timeout: 60_000 },
          )
          const minFontPx = await page.evaluate(() => {
            const sheets = Array.from(document.querySelectorAll('.cv-sheet.editorial-page'))
            const sizes = sheets.flatMap((sheet) =>
              Array.from(
                sheet.querySelectorAll('.entry-role, .small-copy, .rich-html-content, .section-title'),
              ).map((el) => parseFloat(window.getComputedStyle(el).fontSize)),
            )
            return sizes.length ? Math.min(...sizes.filter((n) => n > 0)) : 0
          })
          expect(minFontPx).toBeGreaterThanOrEqual(12)
        } finally {
          await browser.close()
        }
      } finally {
        await renderer.onModuleDestroy()
      }
    }, 60_000)

    it('keeps editorial education before extra info across paginated sheets', async () => {
      const data = editorialFullFixture()
      if (data.education[0]) {
        data.education[0].description = 'ufnsdjngndfgsdfgsdfgsdfgsdfg'.repeat(24)
      }
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        const browser = await (await import('playwright')).chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
        try {
          await page.setContent(
            buildCvPdfPrintDocument({
              title: data.fullName,
              fontLink: CV_DOCUMENT_FONT_LINK,
              styles: buildCvDocumentStyles('pdf'),
              outputHtml: extracted.outputHtml,
            }),
            { waitUntil: 'networkidle', timeout: 60_000 },
          )
          const order = await page.evaluate(() => {
            const sheets = Array.from(document.querySelectorAll('.cv-sheet.editorial-page'))
            let firstEdu = -1
            let firstExtra = -1
            sheets.forEach((sheet, sheetIndex) => {
              const main = sheet.querySelector('.editorial-columns > div')
              if (!main) return
              const titles = Array.from(main.querySelectorAll('h2.section-title')).map((el) =>
                (el.textContent || '').trim(),
              )
              titles.forEach((title) => {
                if (title === 'Vzdelanie' && firstEdu < 0) {
                  firstEdu = sheetIndex
                }
                if (title === 'Doplňujúce informácie' && firstExtra < 0) {
                  firstExtra = sheetIndex
                }
              })
            })
            const sheetWithExpAndExtraOnly = sheets.findIndex((sheet) => {
              const main = sheet.querySelector('.editorial-columns > div')
              if (!main) return false
              const titles = Array.from(main.querySelectorAll('h2.section-title')).map((el) =>
                (el.textContent || '').trim(),
              )
              return (
                titles.includes('Pracovné skúsenosti') &&
                titles.includes('Doplňujúce informácie') &&
                !titles.includes('Vzdelanie')
              )
            })
            const titleOrder = Array.from(
              document.querySelectorAll('.cv-sheet.editorial-page .editorial-columns > div h2.section-title'),
            ).map((el) => (el.textContent || '').trim())
            const eduPos = titleOrder.indexOf('Vzdelanie')
            const hobbiesPos = titleOrder.indexOf('Záujmy')
            const extraPos = titleOrder.indexOf('Doplňujúce informácie')
            return { firstEdu, firstExtra, sheetWithExpAndExtraOnly, eduPos, hobbiesPos, extraPos }
          })
          expect(order.eduPos).toBeGreaterThanOrEqual(0)
          expect(order.hobbiesPos).toBeGreaterThan(order.eduPos)
          expect(order.extraPos).toBeGreaterThan(order.hobbiesPos)
          expect(order.sheetWithExpAndExtraOnly).toBe(-1)
          if (order.firstEdu >= 0 && order.firstExtra >= 0) {
            expect(order.firstEdu).toBeLessThanOrEqual(order.firstExtra)
          }
        } finally {
          await browser.close()
        }
      } finally {
        await renderer.onModuleDestroy()
      }
    }, 90_000)

    it('keeps editorial main column wider than sidebar when education text is unbroken', async () => {
      const data = editorialFullFixture()
      if (data.education[0]) {
        data.education[0].description = 'ufnsdjngndfgsdfgsdfgsdfgsdfg'.repeat(24)
      }
      data.drivingLicenses = [...CV_DRIVING_LICENSE_CATEGORIES]
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        const browser = await (await import('playwright')).chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
        try {
          await page.setContent(
            buildCvPdfPrintDocument({
              title: data.fullName,
              fontLink: CV_DOCUMENT_FONT_LINK,
              styles: buildCvDocumentStyles('pdf'),
              outputHtml: extracted.outputHtml,
            }),
            { waitUntil: 'networkidle', timeout: 60_000 },
          )
          await page.emulateMedia({ media: 'print' })
          const layout = await page.evaluate(() => {
            const sheet = document.querySelector('.cv-sheet.editorial-page')
            const cols = sheet?.querySelector('.editorial-columns')
            const main = cols?.querySelector(':scope > div')
            const side = cols?.querySelector('.editorial-side')
            if (!main || !side) {
              return null
            }
            const mainRect = main.getBoundingClientRect()
            const sideRect = side.getBoundingClientRect()
            const li = main.querySelector('li')
            const bodyFont = parseFloat(window.getComputedStyle(li || main).fontSize)
            return {
              mainW: mainRect.width,
              sideW: sideRect.width,
              bodyFont,
              mainOverflows: main.scrollWidth > main.clientWidth + 2,
              sideOverflows: side.scrollWidth > side.clientWidth + 2,
            }
          })
          expect(layout).not.toBeNull()
          expect(layout!.mainW).toBeGreaterThan(layout!.sideW * 1.15)
          expect(layout!.bodyFont).toBeGreaterThanOrEqual(14)
          expect(layout!.mainOverflows).toBe(false)
          expect(layout!.sideOverflows).toBe(false)
        } finally {
          await browser.close()
        }
      } finally {
        await renderer.onModuleDestroy()
      }
    }, 90_000)
  })

  it('paginates Atlas fixture with education and driving to matching sheet and PDF pages', async () => {
    const data = atlasPaginationFixture()
    const html = buildCvDocument(data, { mode: 'pdf' })
    const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
    const renderer = new CvHtmlPdfRenderer()
    try {
      const extracted = await renderer.extractPaginatedOutput(html)
      expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)
      expect(extracted.sheetCount).toBeLessThanOrEqual(5)
      const printHtml = buildCvPdfPrintDocument({
        title: data.fullName,
        fontLink: CV_DOCUMENT_FONT_LINK,
        styles: buildCvDocumentStyles('pdf'),
        outputHtml: extracted.outputHtml,
      })
      const pdf = await renderer.renderPdfFromPaginatedHtml(printHtml)
      expect(countPdfPages(pdf)).toBeGreaterThanOrEqual(2)
      expect(countPdfPages(pdf)).toBeLessThanOrEqual(6)

      const browser = await (await import('playwright')).chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
      try {
        await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 })
        await page.evaluate(async () => {
          const win = window as Window & { __cvRunPagination?: () => Promise<void> }
          if (typeof win.__cvRunPagination === 'function') {
            await win.__cvRunPagination()
          }
        })
        await page.waitForFunction(
          () => (window as Window & { __cvPaginationDone?: boolean }).__cvPaginationDone === true,
          undefined,
          { timeout: 60_000 },
        )
        const layout = await page.evaluate(() => {
          const sheets = document.querySelectorAll('#cv-pagination-output .cv-sheet')
          const sheetCount = sheets.length
          let chromeHeight = 0
          document
            .querySelectorAll('#cv-pagination-output .atlas-sidebar--chrome')
            .forEach((el) => {
              if (el instanceof HTMLElement) {
                chromeHeight = Math.max(chromeHeight, el.offsetHeight)
              }
            })
          const drivingTitles = Array.from(
            document.querySelectorAll('#cv-pagination-output h2.section-title'),
          ).filter((el) => el.textContent?.includes('Vodičský preukaz'))
          const drivingOnSingleSheet =
            drivingTitles.length === 1 &&
            drivingTitles[0]?.closest('[data-cv-unit="atomic"]') != null
          return { sheetCount, chromeHeight, drivingOnSingleSheet, hasChrome: chromeHeight > 0 }
        })
      expect(layout.sheetCount).toBe(extracted.sheetCount)
      expect(layout.sheetCount).toBeGreaterThanOrEqual(2)
      expect(layout.sheetCount).toBeLessThanOrEqual(5)
        if (layout.hasChrome) {
          expect(layout.chromeHeight).toBeGreaterThanOrEqual(1000)
        }
        expect(layout.drivingOnSingleSheet).toBe(true)
      } finally {
        await browser.close()
      }

      if (process.env.SAVE_CV_PDF_FIXTURE === '1') {
        const dir = join(__dirname, '..', '..', 'tmp')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, 'cv-fixture-atlas.pdf'), pdf)
      }
    } finally {
      await renderer.onModuleDestroy()
    }
  }, 90_000)

  it.each(templates)(
    'balances %s pagination across entries (summary + 2 experiences + education)',
    async (template) => {
      const data = balancedPaginationFixture(template)
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const { CvDocumentPaginateService } = await import('./cv-document-paginate.service')
      const renderer = new CvHtmlPdfRenderer()
      const paginateService = new CvDocumentPaginateService(renderer)
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)

        const layout = await runPaginationLayoutCheck(html, template)
        expect(layout.sheetCount).toBeGreaterThanOrEqual(2)
        if (template === 'atlas') {
          expect(layout.page1HasExpOne).toBe(true)
          expect(layout.page1MainFillRatio).toBeGreaterThan(0.25)
        } else {
          const fullText = await renderer.extractPaginatedOutput(html)
          expect(fullText.outputHtml).toContain(EXP_ONE_TITLE)
          expect(fullText.outputHtml).toContain(EXP_TWO_TITLE)
        }

        const pdf = await paginateService.renderPdfFromExportData(data)
        expect(countPdfPages(pdf)).toBeGreaterThanOrEqual(2)
      } finally {
        await renderer.onModuleDestroy()
      }
    },
    90_000,
  )

  it.each(['editorial', 'minimalist', 'monochrome'] as const)(
    'keeps short %s CV on a single paginated sheet',
    async (template) => {
      const data = sampleData(template)
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        expect(extracted.sheetCount).toBe(1)
      } finally {
        await renderer.onModuleDestroy()
      }
    },
    60_000,
  )

  it.each(['editorial', 'minimalist', 'monochrome'] as const)(
    '%s continuation pages omit header and avoid orphan section titles',
    async (template) => {
      const data = balancedPaginationFixture(template)
      data.showExtraInfo = true
      data.extraInfo = 'Extra info block for pagination testing.'
      const html = buildCvDocument(data, { mode: 'pdf' })
      const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
      const renderer = new CvHtmlPdfRenderer()
      try {
        const extracted = await renderer.extractPaginatedOutput(html)
        expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)

        const browser = await (await import('playwright')).chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        const page = await browser.newPage({ viewport: { width: 794, height: 1123 } })
        try {
          await page.setContent(
            buildCvPdfPrintDocument({
              title: data.fullName,
              fontLink: CV_DOCUMENT_FONT_LINK,
              styles: buildCvDocumentStyles('pdf'),
              outputHtml: extracted.outputHtml,
            }),
            { waitUntil: 'networkidle', timeout: 60_000 },
          )
          const issues = await page.evaluate((tpl) => {
            const headerSelectors: Record<string, string> = {
              editorial: '.editorial-topbar',
              minimalist: '.minimalist-header',
              monochrome: '.monochrome-header',
            }
            const selector = headerSelectors[tpl] ?? ''
            const sheets = Array.from(document.querySelectorAll('.cv-sheet'))
            const continuationHasHeader = sheets
              .slice(1)
              .some((sheet) => selector && sheet.querySelector(selector) != null)
            const orphanTitleAtBottom = sheets.some((sheet) => {
              const titles = Array.from(sheet.querySelectorAll('h2.section-title'))
              if (!titles.length) return false
              const lastTitle = titles[titles.length - 1]
              const parent = lastTitle.closest('section')
              if (!parent) return false
              const hasContent =
                parent.querySelector(':scope > article.entry') != null ||
                parent.querySelector(':scope > ul > li') != null ||
                parent.querySelector(':scope > .small-copy') != null ||
                parent.querySelector(':scope > .rich-html-content') != null ||
                parent.querySelector(':scope > .skill-grid') != null ||
                parent.querySelector(':scope > .contact-stack') != null
              return !hasContent
            })
            return { continuationHasHeader, orphanTitleAtBottom }
          }, template)
          expect(issues.continuationHasHeader).toBe(false)
          expect(issues.orphanTitleAtBottom).toBe(false)
        } finally {
          await browser.close()
        }
      } finally {
        await renderer.onModuleDestroy()
      }
    },
    90_000,
  )

  it.each(templates)(
    'pdf mode paginates long %s CVs to multiple pages',
    async (template) => {
    const data = sampleData(template)
    for (let i = 0; i < 12; i++) {
      data.experiences.push({
        title: `Role ${i}`,
        employer: 'Company',
        city: 'BA',
        current: false,
        fromYear: '2010',
        fromMonth: '01',
        toYear: '2012',
        toMonth: '12',
        description:
          'Long description with enough text to force pagination across multiple A4 pages when rendered.',
        bullets: ['Achievement one', 'Achievement two', 'Achievement three'],
      })
    }
    const { CvHtmlPdfRenderer } = await import('../cv-html-pdf.renderer')
    const { CvDocumentPaginateService } = await import('./cv-document-paginate.service')
    const renderer = new CvHtmlPdfRenderer()
    const paginateService = new CvDocumentPaginateService(renderer)
    const html = buildCvDocument(data, { mode: 'pdf' })
    try {
      const extracted = await renderer.extractPaginatedOutput(html)
      expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)
      const pdf = await paginateService.renderPdfFromExportData(data)
      expect(countPdfPages(pdf)).toBeGreaterThanOrEqual(2)
    } finally {
      await renderer.onModuleDestroy()
    }
    },
    90_000,
  )
})
