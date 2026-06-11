import type { CvDocumentExportData, CvDocumentMode } from './cv-document.types'
import { escapeHtml } from './cv-document-utils'
import { buildCvPaginationBootstrapScript } from './cv-document-pagination.node'
import { buildCvDocumentStyles, buildCvDocumentPrintStyles } from './cv-document-styles'
import { renderTemplateBody } from './cv-document-templates'

export const CV_DOCUMENT_FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Source+Sans+3:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap'

export function buildCvDocument(
  data: CvDocumentExportData,
  options?: { mode?: CvDocumentMode },
): string {
  const mode = options?.mode ?? 'preview'
  const bodyPadding = mode === 'pdf' ? '0' : '28px'
  const bodyBg = mode === 'pdf' ? '#ffffff' : '#e6ecef'
  const styles = buildCvDocumentStyles(mode)
  const body = renderTemplateBody(data)
  const paginationScript =
    mode === 'preview' || mode === 'pdf'
      ? `<script>${buildCvPaginationBootstrapScript()}</script>`
      : ''
  const loadingMarkup =
    mode === 'preview'
      ? '<p class="cv-pagination-loading">Pripravujem náhľad…</p>'
      : ''
  const bodyClass =
    mode === 'pdf'
      ? 'cv-export-pdf cv-pagination-busy'
      : 'cv-export-preview cv-pagination-busy'
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.fullName)} - CV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${CV_DOCUMENT_FONT_LINK}" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    padding: ${bodyPadding};
    background: ${bodyBg};
    font-family: "Source Sans 3", Arial, sans-serif;
  }
${styles}
</style>
</head>
<body class="${bodyClass}">
  <div class="cv-page-export">
    ${loadingMarkup}
    <div id="cv-pagination-source">${body}</div>
    <div id="cv-pagination-output"></div>
  </div>
${paginationScript}
</body>
</html>`
}

/**
 * Builds a clean, single-document HTML for direct CSS print pagination (no JS packer).
 * Playwright prints it with `preferCSSPageSize: true`; `break-inside: avoid` on entries
 * keeps blocks intact. Use `renderPdfDirect()` on the renderer side.
 */
export function buildCvDocumentPrint(data: CvDocumentExportData): string {
  const body = renderTemplateBody(data)
  const styles = buildCvDocumentPrintStyles()
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(data.fullName)} - CV</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${CV_DOCUMENT_FONT_LINK}" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    padding: 0;
    background: #ffffff;
    font-family: "Source Sans 3", Arial, sans-serif;
  }
${styles}
</style>
</head>
<body class="cv-export-pdf">
  <div class="cv-page-export">
    ${body}
  </div>
</body>
</html>`
}

export {
  escapeHtml,
  formatMultiline,
  getSafeCvFileName,
  buildAttachmentContentDisposition,
  sanitizeAsciiDownloadFilename,
  renderCvRichField,
  cvFieldLooksLikeHtml,
} from './cv-document-utils'
export type { CvDocumentExportData, CvDocumentMode, CvDocumentUiTemplate } from './cv-document.types'
export { apiTemplateKeyToUi, uiTemplateToApiKey } from './cv-template-map'
export { buildCvDocumentStyles } from './cv-document-styles'
