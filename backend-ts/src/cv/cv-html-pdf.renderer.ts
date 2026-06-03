import { Injectable, Logger } from '@nestjs/common'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

export type CvPaginationExtract = {
  sheetCount: number
  outputHtml: string
}

@Injectable()
export class CvHtmlPdfRenderer {
  private readonly logger = new Logger(CvHtmlPdfRenderer.name)
  private browserPromise: Promise<Browser> | null = null

  private async getBrowser(): Promise<Browser> {
    if (this.browserPromise) {
      const existing = await this.browserPromise
      if (existing.isConnected()) {
        return existing
      }
      this.browserPromise = null
    }
    this.browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
    return this.browserPromise
  }

  private async withPage<T>(work: (page: Page) => Promise<T>): Promise<T> {
    const browser = await this.getBrowser()
    const context: BrowserContext = await browser.newContext({
      viewport: { width: 794, height: 1123 },
    })
    const page = await context.newPage()
    try {
      return await work(page)
    } finally {
      await context.close()
    }
  }

  private async preparePaginatedPage(page: Page): Promise<CvPaginationExtract> {
    await page.evaluate(async () => {
      const win = window as Window & {
        __cvPaginationDone?: boolean
        __cvRunPagination?: () => Promise<void>
      }
      if (!win.__cvPaginationDone && typeof win.__cvRunPagination === 'function') {
        await win.__cvRunPagination()
      }
    })
    await page.waitForFunction(
      () => (window as Window & { __cvPaginationDone?: boolean }).__cvPaginationDone === true,
      undefined,
      { timeout: 60_000 },
    )
    const extract = await page.evaluate(() => {
      const output = document.getElementById('cv-pagination-output')
      const sheets = output?.querySelectorAll('.cv-sheet') ?? []
      return {
        sheetCount: sheets.length,
        outputHtml: output?.innerHTML?.trim() ?? '',
      }
    })
    await page.evaluate(() => {
      const source = document.getElementById('cv-pagination-source')
      source?.remove()
      document.querySelector('.cv-pagination-loading')?.remove()
      document.body.classList.remove('cv-pagination-busy')
    })
    return extract
  }

  /** Paginate raw export HTML and return sheet markup (Playwright). */
  async extractPaginatedOutput(html: string): Promise<CvPaginationExtract> {
    return this.withPage(async (page) => {
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 })
      return this.preparePaginatedPage(page)
    })
  }

  async renderPdfFromHtml(html: string): Promise<Buffer> {
    return this.withPage(async (page) => {
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 })
      await this.preparePaginatedPage(page)
      return this.printPageToPdf(page)
    })
  }

  /** PDF from already-paginated HTML (no bootstrap script). */
  async renderPdfFromPaginatedHtml(html: string): Promise<Buffer> {
    return this.withPage(async (page) => {
      await page.setContent(html, { waitUntil: 'networkidle', timeout: 60_000 })
      await this.ensureDocumentFontsReady(page)
      return this.printPageToPdf(page)
    })
  }

  private async ensureDocumentFontsReady(page: Page): Promise<void> {
    await page.evaluate(async () => {
      if (!document.fonts) {
        return
      }
      await document.fonts.ready
      const descriptors = [
        '400 16px "Source Sans 3"',
        '600 16px "Source Sans 3"',
        '700 16px "Source Sans 3"',
        '500 16px "Space Grotesk"',
        '700 16px "Space Grotesk"',
        '600 22px "Cormorant Garamond"',
        '700 22px "Cormorant Garamond"',
      ]
      await Promise.all(
        descriptors.map((desc) => document.fonts.load(desc).catch(() => undefined)),
      )
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
    })
  }

  private async printPageToPdf(page: Page): Promise<Buffer> {
    if (page.isClosed()) {
      throw new Error('CV PDF render page was closed before print')
    }
    await page.emulateMedia({ media: 'print' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    })
    return Buffer.from(pdf)
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      try {
        const browser = await this.browserPromise
        await browser.close()
      } catch (err) {
        this.logger.warn(`Playwright browser close failed: ${String(err)}`)
      }
      this.browserPromise = null
    }
  }
}
