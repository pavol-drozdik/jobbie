/** Builds a preview-only HTML document from paginated output markup (no pagination script). */
export function buildCvPreviewResultDocument(options: {
  title: string
  fontLink: string
  styles: string
  outputHtml: string
}): string {
  const title = options.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${options.fontLink}" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    padding: 28px;
    background: #e6ecef;
    font-family: "Source Sans 3", Arial, sans-serif;
  }
${options.styles}
</style>
</head>
<body class="cv-export-preview">
  <div class="cv-page-export">
    <div id="cv-pagination-output">${options.outputHtml}</div>
  </div>
</body>
</html>`
}

/** Final PDF document: paginated sheets only (no pagination script). */
export function buildCvPdfPrintDocument(options: {
  title: string
  fontLink: string
  styles: string
  outputHtml: string
}): string {
  const title = options.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${options.fontLink}" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    padding: 0;
    background: #ffffff;
    font-family: "Source Sans 3", Arial, sans-serif;
  }
${options.styles}
</style>
</head>
<body class="cv-export-pdf">
  <div class="cv-page-export">
    <div id="cv-pagination-output">${options.outputHtml}</div>
  </div>
</body>
</html>`
}
