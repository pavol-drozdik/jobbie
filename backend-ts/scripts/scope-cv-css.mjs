import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const raw = fs.readFileSync(
  path.join(__dirname, '../../jobbiecvdesign/cv-templates.css'),
  'utf8',
)

const startMark = '.template-profile-photo {'
const endMark = '.ledger-page {'
const start = raw.indexOf(startMark)
const end = raw.indexOf(endMark)
if (start < 0 || end < 0) {
  throw new Error('Could not extract resume CSS slice from jobbiecvdesign/cv-templates.css')
}

const slice = raw.slice(start, end)

/** Prefix selectors in a CSS chunk with `.cv-page-export` (handles comma lists, no @rules). */
function prefixSelectors(css, scope) {
  return css.replace(/(^|})\s*([^@{}]+)\s*\{/g, (match, before, selectors) => {
    const trimmed = selectors.trim()
    if (!trimmed) {
      return match
    }
    const prefixed = trimmed
      .split(',')
      .map((sel) => {
        const s = sel.trim()
        if (!s) {
          return s
        }
        if (s.startsWith(scope)) {
          return s
        }
        return `${scope} ${s}`
      })
      .join(', ')
    return `${before} ${prefixed} {`
  })
}

const prefixed = prefixSelectors(slice, '.cv-page-export')

const out = `export function buildCvDocumentStyles(mode: 'preview' | 'pdf'): string {
  const boxShadow = mode === 'pdf' ? 'none' : '0 24px 54px rgba(19, 33, 47, 0.16)';
  const minHeight = 'var(--paper-height)';
  const pdfLayout =
    mode === 'pdf'
      ? \`
body.cv-export-pdf {
  padding: 0 !important;
  background: #ffffff !important;
}
body.cv-export-pdf .cv-page-export .resume-page {
  margin: 0 auto;
  width: var(--paper-width);
  min-height: var(--paper-height);
  box-shadow: none;
}
\`
      : '';
  return \`
.cv-page-export {
  --paper-width: 210mm;
  --paper-height: 297mm;
  --paper: #ffffff;
  --ink: #13212f;
  --muted: #5f6d78;
  --line: rgba(19, 33, 47, 0.12);
  --soft: #eef3f5;
  color: var(--ink);
}
${prefixed}
.cv-page-export .resume-page {
  width: var(--paper-width);
  min-height: \${minHeight};
  margin: 0 auto;
  background: var(--paper);
  box-shadow: \${boxShadow};
  overflow: hidden;
}
\${pdfLayout}
.cv-page-export .rich-html-content {
  color: rgba(19, 33, 47, 0.85);
  font-size: 0.92rem;
  line-height: 1.45;
}
.cv-page-export .rich-html-content p {
  margin: 0.35rem 0;
}
.cv-page-export .rich-html-content h2 {
  margin: 0.75rem 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink);
}
.cv-page-export .rich-html-content h3 {
  margin: 0.6rem 0 0.2rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
}
.cv-page-export .rich-html-content h4 {
  margin: 0.5rem 0 0.15rem;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--ink);
}
.cv-page-export .rich-html-content strong,
.cv-page-export .rich-html-content b {
  font-weight: 800;
  color: var(--ink);
}
.cv-page-export .rich-html-content em,
.cv-page-export .rich-html-content i {
  font-style: italic;
}
.cv-page-export .rich-html-content u {
  text-decoration: underline;
}
.cv-page-export .rich-html-content s,
.cv-page-export .rich-html-content strike {
  text-decoration: line-through;
}
.cv-page-export .rich-html-content ul {
  margin: 0.5rem 0;
  padding-left: 1.35rem;
  list-style: disc outside;
}
.cv-page-export .rich-html-content ol {
  margin: 0.5rem 0;
  padding-left: 1.35rem;
  list-style: decimal outside;
}
.cv-page-export .rich-html-content li {
  margin: 0.15rem 0;
  display: list-item;
}
@page { size: A4; margin: 0; }
@media print {
  html, body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
  .cv-page-export .resume-page {
    width: 100% !important;
    min-height: var(--paper-height) !important;
    box-shadow: none !important;
  }
}
\`;
}
`

fs.writeFileSync(
  path.join(__dirname, '../src/cv/document/cv-document-styles.ts'),
  out,
)
console.log('wrote scoped resume CSS', prefixed.length, 'chars')
