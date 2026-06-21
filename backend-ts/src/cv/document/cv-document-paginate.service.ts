import { Injectable } from '@nestjs/common'
import { buildCvDocument, buildCvDocumentPrint, CV_DOCUMENT_FONT_LINK } from './cv-document-html'
import { buildCvPdfPrintDocument, buildCvPreviewResultDocument } from './cv-document-preview-html'
import { buildCvDocumentStyles } from './cv-document-styles'
import type { CvDocumentExportData } from './cv-document.types'
import { CvHtmlPdfRenderer, type CvPaginationExtract } from '../cv-html-pdf.renderer'

export type CvPaginatedDocument = {
  sheetCount: number
  previewHtml: string
}

@Injectable()
export class CvDocumentPaginateService {
  constructor(private readonly htmlPdf: CvHtmlPdfRenderer) {}

  /** Single pagination pass (pdf layout) for preview + stored PDF. */
  async paginateExportData(data: CvDocumentExportData): Promise<CvPaginationExtract> {
    const rawHtml = buildCvDocument(data, { mode: 'pdf' })
    const extracted = await this.htmlPdf.extractPaginatedOutput(rawHtml)
    if (!extracted.outputHtml) {
      throw new Error('CV pagination produced empty output.')
    }
    return extracted
  }

  /** Paginated HTML preview layout (dev `preview-html` endpoint; production preview uses PDF). */
  async buildPreviewHtml(data: CvDocumentExportData): Promise<CvPaginatedDocument> {
    const extracted = await this.paginateExportData(data)
    const previewHtml = buildCvPreviewResultDocument({
      title: data.fullName,
      fontLink: CV_DOCUMENT_FONT_LINK,
      styles: buildCvDocumentStyles('preview'),
      outputHtml: extracted.outputHtml,
    })
    return {
      sheetCount: extracted.sheetCount,
      previewHtml,
    }
  }

  /**
   * Atlas uses the JS packer so each A4 sheet has a full-height sidebar panel
   * (content on page 1, chrome stripe on continuations). Other templates use
   * direct CSS print — natural page breaks without a DOM packer.
   */
  async renderPdfFromExportData(data: CvDocumentExportData): Promise<Buffer> {
    if (data.template === 'atlas') {
      const extracted = await this.paginateExportData(data)
      const printHtml = buildCvPdfPrintDocument({
        title: data.fullName,
        fontLink: CV_DOCUMENT_FONT_LINK,
        styles: buildCvDocumentStyles('pdf'),
        outputHtml: extracted.outputHtml,
      })
      return this.htmlPdf.renderPdfFromPaginatedHtml(printHtml)
    }
    const html = buildCvDocumentPrint(data)
    return this.htmlPdf.renderPdfDirect(html)
  }
}
