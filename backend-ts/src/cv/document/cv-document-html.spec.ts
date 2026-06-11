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
import { buildCvDocumentStyles } from './cv-document-styles'
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

  it('uses template-specific page class', () => {
    expect(buildCvDocument(sampleData('editorial'))).toContain('editorial-page')
    expect(buildCvDocument(sampleData('minimalist'))).toContain('minimalist-page')
    expect(buildCvDocument(sampleData('monochrome'))).toContain('monochrome-page')
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

  it.each(['atlas', 'editorial'] as const)(
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
    const renderer = new CvHtmlPdfRenderer()
    const html = buildCvDocument(data, { mode: 'pdf' })
    const extracted = await renderer.extractPaginatedOutput(html)
    expect(extracted.sheetCount).toBeGreaterThanOrEqual(2)
    await renderer.onModuleDestroy()
    },
    60_000,
  )
})
