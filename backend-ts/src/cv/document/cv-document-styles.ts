export function buildCvDocumentStyles(mode: 'preview' | 'pdf'): string {
  const boxShadow = mode === 'pdf' ? 'none' : '0 24px 54px rgba(19, 33, 47, 0.16)';
  const minHeight = mode === 'pdf' ? '0' : 'var(--paper-height)';
  const resumePageOverflow = 'visible';
  const paginatedExportLayout = `
body.cv-export-pdf .cv-page-export .resume-page:not(.cv-sheet),
body.cv-export-preview .cv-page-export .resume-page:not(.cv-sheet) {
  overflow: visible;
  height: auto;
  min-height: 0;
}
body.cv-export-pdf .cv-page-export .monochrome-page:not(.cv-sheet),
body.cv-export-preview .cv-page-export .monochrome-page:not(.cv-sheet) {
  min-height: 0;
}
body.cv-export-pdf .cv-page-export .monochrome-grid,
body.cv-export-preview .cv-page-export .monochrome-grid {
  flex: none;
}
body.cv-export-pdf .cv-page-export .monochrome-side,
body.cv-export-preview .cv-page-export .monochrome-side {
  min-height: auto;
  align-self: auto;
}
#cv-pagination-measure-host .cv-sheet.monochrome-page,
#cv-pagination-measure-host .cv-sheet.minimalist-page,
#cv-pagination-measure-host .cv-sheet.editorial-page {
  height: auto;
  min-height: 0;
  max-height: none;
  overflow: visible;
}
#cv-pagination-measure-host .cv-sheet .monochrome-grid,
#cv-pagination-measure-host .cv-sheet .minimalist-grid,
#cv-pagination-measure-host .cv-sheet .editorial-columns {
  align-items: start;
  flex: none;
}
#cv-pagination-measure-host .cv-sheet .monochrome-side,
#cv-pagination-measure-host .cv-sheet .minimalist-side,
#cv-pagination-measure-host .cv-sheet .editorial-side {
  min-height: 0;
  height: auto;
  align-self: start;
}
body.cv-export-pdf .cv-pagination-loading,
body.cv-export-pdf #cv-pagination-source {
  display: none !important;
}
body.cv-export-pdf .cv-pagination-output {
  display: block;
}
body.cv-export-pdf .cv-sheet {
  width: var(--paper-width);
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  margin: 0;
  box-shadow: none;
  overflow: hidden;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
}
body.cv-export-pdf .cv-sheet:last-child {
  page-break-after: auto;
  break-after: auto;
}
.cv-sheet.atlas-page {
  position: relative;
  display: block;
  width: var(--paper-width);
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  overflow: hidden;
  box-sizing: border-box;
}
.cv-sheet.atlas-page .atlas-sidebar {
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: var(--paper-height);
  min-height: var(--paper-height);
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
  z-index: 1;
  background-color: #102432;
  background-image:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.22), transparent 34%),
    linear-gradient(180deg, #17324a 0%, #102432 100%);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.cv-sheet.atlas-page .atlas-main {
  position: relative;
  margin-left: 40%;
  width: 60%;
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  overflow: hidden;
  box-sizing: border-box;
  background: #ffffff;
  z-index: 2;
}
.cv-sheet.atlas-page article.entry {
  break-inside: auto;
  page-break-inside: auto;
}
.cv-sheet.editorial-page .editorial-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.92fr);
  gap: 18px;
  flex: 1;
  min-height: 0;
  align-items: start;
}
.cv-sheet.editorial-page .editorial-columns > div,
.cv-sheet.editorial-page .editorial-side {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.cv-sheet.editorial-page .editorial-columns > div {
  display: grid;
  gap: 18px;
  align-content: start;
  min-height: 0;
}
.cv-sheet.editorial-page .editorial-side .section-card {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.cv-sheet.editorial-page .editorial-columns--continued {
  padding-top: 14mm;
}
.cv-sheet.minimalist-page .minimalist-grid--continued {
  padding-top: 14mm;
}
.cv-sheet.monochrome-page .monochrome-grid--continued {
  padding-top: 14mm;
}
.cv-sheet.editorial-page {
  display: flex;
  flex-direction: column;
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  overflow: hidden;
  box-sizing: border-box;
}
.cv-sheet.minimalist-page .minimalist-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 0.7fr);
  gap: 36px;
  flex: 1;
  min-height: 0;
  align-items: start;
}
.cv-sheet.minimalist-page .minimalist-main,
.cv-sheet.minimalist-page .minimalist-side {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.cv-sheet.minimalist-page {
  display: flex;
  flex-direction: column;
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  overflow: hidden;
  box-sizing: border-box;
}
.cv-sheet.monochrome-page {
  display: flex;
  flex-direction: column;
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  overflow: hidden;
  box-sizing: border-box;
}
.cv-sheet.monochrome-page .monochrome-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 0.86fr);
  flex: 1;
  min-height: 0;
  align-items: start;
}
.cv-sheet.monochrome-page .monochrome-main,
.cv-sheet.monochrome-page .monochrome-side {
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.cv-sheet.monochrome-page .monochrome-side .monochrome-card {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.cv-sheet .monochrome-side,
.cv-sheet .minimalist-side,
.cv-sheet .editorial-side {
  min-height: 0;
  height: auto;
  align-self: start;
}
.cv-sheet .monochrome-side--chrome {
  min-height: var(--paper-height);
  background: #f6f6f6;
  border-left: 1px solid rgba(17, 17, 17, 0.08);
}
`;
  const pdfLayout =
    mode === 'pdf'
      ? `
body.cv-export-pdf {
  padding: 0 !important;
  background: #ffffff !important;
}
body.cv-export-pdf .cv-page-export .resume-page {
  margin: 0 auto;
  width: var(--paper-width);
  box-shadow: none;
}
body.cv-export-pdf .cv-page-export .atlas-page {
  min-height: var(--paper-height);
}
`
      : '';
  const previewLayout =
    mode === 'preview'
      ? `
#cv-pagination-source {
  position: absolute;
  left: -99999px;
  top: 0;
  width: var(--paper-width);
  visibility: hidden;
  pointer-events: none;
}
body.cv-export-preview.cv-pagination-busy .cv-pagination-output {
  visibility: hidden;
}
.cv-pagination-loading {
  margin: 48px auto;
  max-width: 210mm;
  text-align: center;
  color: #5a6873;
  font-size: 14px;
}
body.cv-export-preview .cv-pagination-output {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding-bottom: 8px;
}
body.cv-export-preview .cv-sheet {
  width: var(--paper-width);
  height: var(--paper-height);
  min-height: var(--paper-height);
  max-height: var(--paper-height);
  margin: 0 auto;
  background: var(--paper);
  box-shadow: 0 24px 54px rgba(19, 33, 47, 0.16);
  overflow: hidden;
  box-sizing: border-box;
}
`
      : '';
  return `
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
 .cv-page-export .template-profile-photo {
    width: 32mm;
    height: 32mm;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid rgba(19, 33, 47, 0.14);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08)),
        linear-gradient(135deg, #d9e3e8, #bcc8cf);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    flex-shrink: 0;
    box-shadow: 0 10px 24px rgba(19, 33, 47, 0.12);
} .cv-page-export .template-profile-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
} .cv-page-export .template-profile-photo span {
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(19, 33, 47, 0.62);
} .cv-page-export .template-profile-photo.dark {
    border-color: rgba(255, 255, 255, 0.18);
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.03)),
        linear-gradient(135deg, #4d6473, #223849);
} .cv-page-export .template-profile-photo.dark span {
    color: rgba(255, 255, 255, 0.82);
} .cv-page-export .template-profile-photo.warm {
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
        linear-gradient(135deg, #ecd8bf, #c9a986);
} .cv-page-export .template-profile-photo.round {
    width: 32mm;
    height: 32mm;
    border-radius: 50%;
} .cv-page-export .resume-page {
    width: var(--paper-width);
    min-height: var(--paper-height);
    margin: 0 auto;
    background: var(--paper);
    box-shadow: 0 24px 54px rgba(19, 33, 47, 0.16);
    overflow: ${resumePageOverflow};
} .cv-page-export .resume-page article.entry,
.cv-page-export .cv-sheet article.entry {
    break-inside: avoid;
    page-break-inside: avoid;
}
.cv-page-export .resume-page section.atlas-block,
.cv-page-export .resume-page section.section-card,
.cv-page-export .resume-page section.monochrome-card,
.cv-page-export .cv-sheet section.atlas-block,
.cv-page-export .cv-sheet section.section-card,
.cv-page-export .cv-sheet section.monochrome-card,
.cv-page-export .resume-page section.atlas-intro:not(.cv-breakable-section),
.cv-page-export .cv-sheet section.atlas-intro:not(.cv-breakable-section),
.cv-page-export .resume-page section.editorial-panel:not(.cv-breakable-section),
.cv-page-export .cv-sheet section.editorial-panel:not(.cv-breakable-section) {
    break-inside: avoid;
    page-break-inside: avoid;
}
.cv-page-export .resume-page section.cv-breakable-section,
.cv-page-export .cv-sheet section.cv-breakable-section {
    break-inside: auto;
    page-break-inside: auto;
}
.cv-page-export .resume-page section:not(.cv-breakable-section),
.cv-page-export .cv-sheet section:not(.cv-breakable-section) {
    break-inside: avoid;
    page-break-inside: avoid;
} .cv-page-export .resume-page p, .cv-page-export .resume-page li,
.cv-page-export .cv-sheet p, .cv-page-export .cv-sheet li {
    font-size: 11.2pt;
    line-height: 1.45;
} .cv-page-export .resume-page ul,
.cv-page-export .cv-sheet ul {
    margin: 0;
    padding-left: 18px;
} .cv-page-export .resume-page li + li {
    margin-top: 4px;
} .cv-page-export .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 10pt;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
} .cv-page-export .section-title {
    margin: 0 0 10px;
    font-size: 10.5pt;
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
} .cv-page-export .entry + .entry {
    margin-top: 14px;
} .cv-page-export .entry-head {
    display: flex;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 4px;
} .cv-page-export .entry-role {
    margin: 0;
    font-size: 12.4pt;
    line-height: 1.2;
    font-weight: 700;
} .cv-page-export .entry-meta, .cv-page-export .entry-date, .cv-page-export .contact-stack, .cv-page-export .small-copy {
    color: var(--muted);
} .cv-page-export .entry-meta, .cv-page-export .entry-date, .cv-page-export .contact-stack, .cv-page-export .small-copy, .cv-page-export .skill-chip, .cv-page-export .stat-label {
    font-size: 10.3pt;
    line-height: 1.35;
} .cv-page-export .skill-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
} .cv-page-export .skill-chip {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    width: auto;
    max-width: 100%;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    font-weight: 700;
    white-space: nowrap;
} .cv-page-export .contact-stack {
    display: flex;
    flex-direction: column;
    gap: 5px;
} .cv-page-export .contact-stack span {
    width: 100%;
} .cv-page-export .two-column-list {
    columns: 2;
    column-gap: 20px;
} .cv-page-export .two-column-list li {
    break-inside: avoid;
} .cv-page-export .gallery-shell {
    max-width: 1180px;
    margin: 0 auto;
} .cv-page-export .gallery-hero {
    margin-bottom: 26px;
} .cv-page-export .gallery-hero h1, .cv-page-export .gallery-hero p {
    margin: 0;
} .cv-page-export .gallery-hero h1 {
    max-width: 780px;
    font-size: clamp(42px, 6vw, 72px);
    line-height: 0.95;
    letter-spacing: -0.05em;
} .cv-page-export .gallery-hero p {
    max-width: 760px;
    margin-top: 16px;
    color: #51616d;
    font-size: 18px;
    line-height: 1.5;
} .cv-page-export .gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
} .cv-page-export .gallery-card {
    padding: 22px;
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(19, 33, 47, 0.1);
    box-shadow: 0 16px 36px rgba(19, 33, 47, 0.08);
    backdrop-filter: blur(12px);
} .cv-page-export .gallery-card h2, .cv-page-export .gallery-card p {
    margin: 0;
} .cv-page-export .gallery-card h2 {
    font-size: 24px;
    line-height: 1.05;
} .cv-page-export .gallery-card p {
    margin-top: 10px;
    color: #5a6873;
    font-size: 15px;
    line-height: 1.5;
} .cv-page-export .gallery-card .toolbar-link {
    margin-top: 18px;
} .cv-page-export .mini-sheet {
    height: 220px;
    margin-top: 18px;
    border-radius: 18px;
    overflow: hidden;
    background: #ffffff;
} .cv-page-export .mini-sheet.atlas {
    background:
        linear-gradient(90deg, #17324a 0 29%, #ffffff 29% 100%);
} .cv-page-export .mini-sheet.atlas::before, .cv-page-export .mini-sheet.editorial::before, .cv-page-export .mini-sheet.signal::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
} .cv-page-export .mini-sheet.atlas::before {
    background:
        radial-gradient(circle at 14% 14%, rgba(255, 255, 255, 0.7) 0 16px, transparent 18px),
        linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0 70px, transparent 70px 100%),
        linear-gradient(180deg, #ffffff 0 100%);
    background-size: 100% 100%, 100% 100%, 71% 100%;
    background-position: left top, left top, right top;
    background-repeat: no-repeat;
} .cv-page-export .mini-sheet.editorial {
    background:
        linear-gradient(180deg, #dcc2a2 0 60px, #ffffff 60px 100%);
} .cv-page-export .mini-sheet.editorial::before {
    background:
        linear-gradient(180deg, rgba(22, 40, 49, 0.9) 0 2px, transparent 2px 100%),
        linear-gradient(90deg, transparent 0 50%, rgba(22, 40, 49, 0.08) 50% 51%, transparent 51% 100%),
        linear-gradient(180deg, transparent 0 72px, rgba(22, 40, 49, 0.09) 72px 100%);
} .cv-page-export .mini-sheet.signal {
    background:
        linear-gradient(180deg, #183b4b 0 74px, #ffffff 74px 100%);
} .cv-page-export .mini-sheet.minimalist {
    background: #ffffff;
    border: 1px solid rgba(19, 33, 47, 0.08);
} .cv-page-export .mini-sheet.monochrome {
    background:
        linear-gradient(180deg, #111111 0 68px, #ffffff 68px 100%);
} .cv-page-export .mini-sheet.ledger {
    background:
        linear-gradient(90deg, #f1e7d8 0 31%, #ffffff 31% 100%);
} .cv-page-export .mini-sheet.signal::before {
    background:
        linear-gradient(90deg, rgba(224, 124, 53, 0.95) 0 34%, transparent 34% 100%),
        linear-gradient(180deg, transparent 0 90px, rgba(24, 59, 75, 0.08) 90px 100%);
    mix-blend-mode: multiply;
} .cv-page-export .mini-sheet.minimalist::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    background:
        linear-gradient(180deg, rgba(19, 33, 47, 0.92) 0 2px, transparent 2px 100%),
        linear-gradient(180deg, transparent 0 40px, rgba(19, 33, 47, 0.06) 40px 42px, transparent 42px 100%),
        linear-gradient(90deg, transparent 0 64%, rgba(19, 33, 47, 0.08) 64% 65%, transparent 65% 100%);
} .cv-page-export .mini-sheet.monochrome::before, .cv-page-export .mini-sheet.ledger::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
} .cv-page-export .mini-sheet.monochrome::before {
    background:
        linear-gradient(90deg, transparent 0 63%, rgba(17, 17, 17, 0.08) 63% 64%, transparent 64% 100%),
        linear-gradient(180deg, transparent 0 92px, rgba(17, 17, 17, 0.08) 92px 100%);
} .cv-page-export .mini-sheet.ledger::before {
    background:
        linear-gradient(180deg, rgba(84, 58, 35, 0.82) 0 2px, transparent 2px 100%),
        linear-gradient(90deg, transparent 0 35%, rgba(84, 58, 35, 0.1) 35% 36%, transparent 36% 100%),
        linear-gradient(180deg, transparent 0 84px, rgba(84, 58, 35, 0.08) 84px 100%);
} .cv-page-export .print-note {
    margin-top: 22px;
    color: #5a6873;
    font-size: 14px;
} .cv-page-export .atlas-page {
    display: grid;
    grid-template-columns: 40% 1fr;
    font-family: "Source Sans 3", sans-serif;
} .cv-page-export .atlas-sidebar {
    padding: 26mm 11mm 22mm 13mm;
    color: #f4f8fa;
    background:
        radial-gradient(circle at top left, rgba(255, 255, 255, 0.22), transparent 34%),
        linear-gradient(180deg, #17324a 0%, #102432 100%);
} .cv-page-export .atlas-main {
    padding: 22mm 16mm 18mm;
} .cv-page-export .atlas-profile-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    justify-items: start;
} .cv-page-export .atlas-sidebar .atlas-profile-photo,
.cv-page-export .atlas-sidebar .template-profile-photo.atlas-profile-photo {
    width: 40mm;
    height: 40mm;
    border-radius: 50%;
    border: none;
    box-shadow: none;
} .cv-page-export .atlas-sidebar .atlas-profile-photo.dark,
.cv-page-export .atlas-sidebar .template-profile-photo.atlas-profile-photo.dark {
    border: none;
    box-shadow: none;
} .cv-page-export .atlas-name {
    margin: 0;
    font-size: 25pt;
    line-height: 0.92;
    letter-spacing: -0.04em;
    font-family: "Space Grotesk", sans-serif;
} .cv-page-export .atlas-role {
    margin: 8px 0 0;
    color: rgba(244, 248, 250, 0.8);
    font-size: 11pt;
    letter-spacing: 0.12em;
    text-transform: uppercase;
} .cv-page-export .atlas-sidebar .section-title, .cv-page-export .atlas-sidebar .entry-meta, .cv-page-export .atlas-sidebar .entry-date, .cv-page-export .atlas-sidebar .small-copy, .cv-page-export .atlas-sidebar .contact-stack {
    color: rgba(244, 248, 250, 0.82);
} .cv-page-export .atlas-sidebar .section-title {
    color: #ffffff;
} .cv-page-export .atlas-sidebar .skill-chip {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.1);
} .cv-page-export .atlas-block + .atlas-block {
    margin-top: 18px;
} .cv-page-export .atlas-intro {
    padding-bottom: 12px;
    border-bottom: 1px solid var(--line);
} .cv-page-export .atlas-stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
} .cv-page-export .atlas-main .section-title {
    color: #17324a;
} .cv-page-export .atlas-main .skill-chip {
    background: #edf3f6;
    color: #17324a;
} .cv-page-export .editorial-topbar .template-profile-photo.editorial-profile-photo,
.cv-page-export .editorial-topbar .editorial-profile-photo {
    width: 40mm;
    height: 40mm;
    border-radius: 50%;
    border: none;
    box-shadow: none;
    background: transparent;
} .cv-page-export .editorial-topbar .template-profile-photo.editorial-profile-photo.warm,
.cv-page-export .editorial-topbar .editorial-profile-photo.warm {
    border: none;
    box-shadow: none;
    background: transparent;
} .cv-page-export .editorial-page {
    padding: 18mm 16mm 16mm;
    font-family: "Source Sans 3", sans-serif;
    background:
        linear-gradient(180deg, #ffffff 0 100%);
} .cv-page-export .editorial-topbar {
    display: flex;
    grid-template-columns: 1.4fr 0.9fr;
    gap: 16px;
    margin-bottom: 14mm;
    padding-bottom: 8mm;
    border-bottom: 1px solid #d8c6ab;
} .cv-page-export .editorial-identity {
    display: flex;
    flex-direction: column;
    grid-template-columns: 1fr auto;
    gap: 18px;
    align-items: start;
    width: 100%;
} .cv-page-export .editorial-name {
    margin: 0;
    font-family: "Cormorant Garamond", serif;
    font-size: 29pt;
    line-height: 0.9;
    letter-spacing: -0.02em;
    color: #1f2a30;
} .cv-page-export .editorial-role {
    margin: 8px 0 0;
    color: #9a6c39;
    font-size: 11pt;
    letter-spacing: 0.16em;
    text-transform: uppercase;
} .cv-page-export .editorial-lead {
    margin: 10px 0 0;
    max-width: 94%;
    color: #556068;
} .cv-page-export .editorial-contact {
    display: grid;
    gap: 12px;
    align-content: start;
    padding: 14px 16px;
    align-self: start;
    border-radius: 18px;
    background: #f6f0e7;
    width: 100%;
} .cv-page-export .editorial-columns {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.92fr);
    gap: 18px;
} .cv-page-export .editorial-columns > div,
.cv-page-export .editorial-side {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
} .cv-page-export .editorial-side .section-card {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
} .cv-page-export .editorial-panel {
    padding-top: 12px;
} .cv-page-export .editorial-panel .section-title + .section-title {
    margin-top: 18px;
} .cv-page-export .editorial-panel + .editorial-panel {
    border-top: 1px solid var(--line);
} .cv-page-export .editorial-stack + .editorial-stack {
    margin-top: 16px;
} .cv-page-export .editorial-stack {
    display: flex;
    flex-direction: column;
    gap: 18px;
} .cv-page-export .editorial-side {
    display: grid;
    align-content: start;
    gap: 16px;
} .cv-page-export .editorial-side .section-card {
    padding: 14px 14px 12px;
    border-radius: 18px;
    background: #f8f5f0;
} .cv-page-export .editorial-side .skill-chip {
    background: #e2d0b4;
    color: #402910;
} .cv-page-export .signal-page {
    padding: 0;
    font-family: "Source Sans 3", sans-serif;
} .cv-page-export .signal-header {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    min-height: 84mm;
} .cv-page-export .signal-banner-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
} .cv-page-export .signal-banner {
    padding: 18mm 16mm 16mm;
    color: #f6fbfc;
    background:
        radial-gradient(circle at 86% 16%, rgba(236, 161, 104, 0.26), transparent 24%),
        linear-gradient(135deg, #183b4b 0%, #0f2430 100%);
    display: flex;
    
} .cv-page-export .signal-banner h1 {
    margin: 0;
    font-family: "Space Grotesk", sans-serif;
    font-size: 27pt;
    line-height: 0.92;
    letter-spacing: -0.05em;
} .cv-page-export .signal-banner p {
    margin: 10px 0 0;
    max-width: 92%;
    color: rgba(246, 251, 252, 0.82);
} .cv-page-export .signal-tag {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    margin-top: 16px;
    padding: 0 12px;
    border-radius: 999px;
    color: #0f2430;
    background: #f0b581;
    font-size: 10pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
} .cv-page-export .signal-contact {
    display: grid;
    gap: 12px;
    align-content: start;
    padding: 18mm 14mm 16mm;
    background: #f4efe8;
} .cv-page-export .signal-contact .section-title, .cv-page-export .signal-grid .section-title {
    color: #183b4b;
} .cv-page-export .signal-grid {
    display: grid;
    grid-template-columns: 1.05fr 0.95fr;
} .cv-page-export .signal-main, .cv-page-export .signal-side {
    padding: 14mm 15mm 16mm;
} .cv-page-export .signal-main {
    display: grid;
    gap: 16px;
} .cv-page-export .signal-side {
    background: #fbf7f2;
    display: grid;
    gap: 14px;
} .cv-page-export .signal-card {
    padding: 14px;
    border-radius: 18px;
    background: #ffffff;
    border: 1px solid rgba(24, 59, 75, 0.08);
} .cv-page-export .signal-side .skill-chip {
    color: #ffffff;
    background: #183b4b;
} .cv-page-export .signal-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
} .cv-page-export .signal-stat {
    padding: 12px;
    border-radius: 16px;
    background: #fffaf5;
    border: 1px solid rgba(224, 124, 53, 0.14);
} .cv-page-export .stat-value {
    display: block;
    font-family: "Space Grotesk", sans-serif;
    font-size: 16pt;
    line-height: 1;
    font-weight: 700;
    color: #c96d2e;
} .cv-page-export .stat-label {
    display: block;
    margin-top: 5px;
    color: #6e655f;
} .cv-page-export .minimalist-page {
    padding: 18mm 16mm 16mm;
    font-family: "Source Sans 3", sans-serif;
    background: #ffffff;
} .cv-page-export .minimalist-header {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 18px;
    align-items: last baseline;
    margin-bottom: 12mm;
    padding-bottom: 8mm;
    border-bottom: 1px solid rgba(19, 33, 47, 0.16);
} .cv-page-export .minimalist-identity {
    min-width: 0;
} .cv-page-export .minimalist-name {
    margin: 0;
    font-family: "Space Grotesk", sans-serif;
    font-size: 30pt;
    line-height: 0.9;
    letter-spacing: -0.05em;
} .cv-page-export .minimalist-role {
    margin: 8px 0 0;
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
} .cv-page-export .minimalist-lead {
    margin: 14px 0 0;
    max-width: 92%;
    line-height: 1.35;
} .cv-page-export .minimalist-contact {
    display: grid;
    justify-items: end;
    gap: 8px;
    text-align: right;
} .cv-page-export .minimalist-contact > .small-copy {
    line-height: 1.35;
} .cv-page-export .minimalist-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.65fr) minmax(0, 0.7fr);
    gap: 36px;
} .cv-page-export .minimalist-main,
.cv-page-export .minimalist-side {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
} .cv-page-export .minimalist-main {
    display: grid;
    gap: 18px;
} .cv-page-export .minimalist-main .cv-breakable-section .section-title + .section-title {
    margin-top: 18px;
} .cv-page-export .minimalist-side {
    display: grid;
    gap: 16px;
    align-content: start;
} .cv-page-export .minimalist-side section {
    padding-top: 12px;
    border-top: 1px solid rgba(19, 33, 47, 0.1);
} .cv-page-export .minimalist-side section:first-child {
    padding-top: 0;
    border-top: none;
} .cv-page-export .minimalist-page .section-title {
    color: #13212f;
} .cv-page-export .minimalist-page .skill-chip {
    background: #f1f4f6;
    color: #13212f;
} .cv-page-export .monochrome-page {
    display: flex;
    flex-direction: column;
    font-family: "Source Sans 3", sans-serif;
    background: #ffffff;
} .cv-page-export .monochrome-header {
    padding: 18mm 16mm 12mm;
    color: #ffffff;
    background: #111111;
} .cv-page-export .monochrome-header-grid {
    display: block;
} .cv-page-export .monochrome-identity {
    min-width: 0;
} .cv-page-export .monochrome-name {
    margin: 0;
    font-family: "Space Grotesk", sans-serif;
    font-size: 31pt;
    line-height: 0.9;
    letter-spacing: -0.05em;
} .cv-page-export .monochrome-role {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.76);
    font-size: 11pt;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
} .cv-page-export .monochrome-lead {
    margin: 14px 0 0;
    max-width: 92%;
    color: rgba(255, 255, 255, 0.82);
} .cv-page-export .monochrome-contact-line {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 10.3pt;
    line-height: 1.35;
} .cv-page-export .monochrome-contact {
    display: grid;
    gap: 8px;
    align-content: end;
    align-self: end;
    justify-items: end;
    text-align: right;
} .cv-page-export .monochrome-contact .template-profile-photo.monochrome-profile-photo {
    width: 32mm;
    height: 32mm;
    border-radius: 16px;
    box-shadow: none;
} .cv-page-export .monochrome-contact .small-copy, .cv-page-export .monochrome-header .eyebrow {
    color: rgba(255, 255, 255, 0.72);
} .cv-page-export .monochrome-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.34fr) minmax(0, 0.86fr);
    flex: 1;
    align-items: stretch;
} .cv-page-export .monochrome-main,
.cv-page-export .monochrome-side {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
    word-break: break-word;
} .cv-page-export .monochrome-side .monochrome-card {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
} .cv-page-export .monochrome-main, .cv-page-export .monochrome-side {
    padding: 14mm 16mm 16mm;
} .cv-page-export .monochrome-main {
    display: grid;
    gap: 18px;
} .cv-page-export .monochrome-side {
    background: #f6f6f6;
    display: grid;
    gap: 16px;
    align-content: start;
    align-self: stretch;
    min-height: 100%;
    border-left: 1px solid rgba(17, 17, 17, 0.08);
} .cv-page-export .monochrome-card {
    padding-top: 12px;
    border-top: 1px solid rgba(17, 17, 17, 0.1);
} .cv-page-export .monochrome-card:first-child {
    padding-top: 0;
    border-top: none;
} .cv-page-export .monochrome-page .section-title {
    color: #111111;
} .cv-page-export .monochrome-page .skill-chip {
    color: #111111;
    background: #ebebeb;
}


.cv-page-export .resume-page {
  width: var(--paper-width);
  min-height: ${minHeight};
  margin: 0 auto;
  background: var(--paper);
  box-shadow: ${boxShadow};
  overflow: ${resumePageOverflow};
}
${paginatedExportLayout}
${previewLayout}
${pdfLayout}
.cv-page-export .rich-html-content {
  color: rgba(19, 33, 47, 0.85);
  font-size: 0.92rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.cv-page-export .cv-sheet .rich-html-content,
.cv-page-export .cv-sheet .rich-html-content p {
  font-size: 11.2pt;
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
    min-height: 0 !important;
    height: auto !important;
    overflow: visible !important;
    box-shadow: none !important;
  }
}
`;
}

/**
 * Minimal CSS for the direct-print PDF path (no JS packer).
 * Adds heading break-after, Atlas blue stripe via fixed-attachment background,
 * and Monochrome/Editorial side-column backgrounds so they appear on every page.
 */
export function buildCvDocumentPrintStyles(): string {
  return (
    buildCvDocumentStyles('pdf') +
    `
/* --- print-direct additions (no packer) --- */

/* Prevent section headings from sitting alone at bottom of a page */
.cv-page-export h2.section-title {
  break-after: avoid;
  page-break-after: avoid;
}

/*
 * Sidebar full-height on every printed page.
 * background-attachment:fixed positions a background relative to the page viewport
 * in Chromium print mode, so it repeats on every printed page automatically.
 * The sidebar element itself becomes transparent so the page background shows through.
 * Child elements (e.g. monochrome-header) repaint their own backgrounds on top.
 */
@media print {
  /* ─── Atlas (direct-print templates only; Atlas PDF uses JS packer sheets) ─ */
  .cv-page-export .atlas-page {
    position: relative;
    min-height: var(--paper-height);
    align-items: stretch;
  }
  .cv-page-export .atlas-sidebar {
    align-self: stretch;
  }

  /* ─── Monochrome ─────────────────────────────────────────────────────────── */
  /* Grid is 1.34fr | 0.86fr (total 2.20fr). Side = 0.86/2.20 = 39.09% wide,  */
  /* starting at 60.91% from the left. A 1-px rgba stripe acts as the divider. */
  .cv-page-export .monochrome-page {
    background:
      linear-gradient(
        90deg,
        #ffffff 60.91%,
        rgba(17, 17, 17, 0.08) 60.91% calc(60.91% + 1px),
        #f6f6f6 calc(60.91% + 1px)
      );
    background-attachment: fixed;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Side element becomes transparent so the page background shows */
  .cv-page-export .monochrome-side {
    background: transparent;
    border-left: none;
  }
  /* Dark header must repaint its own background on page 1 (sits above the grey) */
  .cv-page-export .monochrome-header {
    background: #111111;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ─── Shared ─────────────────────────────────────────────────────────────── */
  .cv-page-export .atlas-page,
  .cv-page-export .monochrome-page,
  .cv-page-export .editorial-topbar {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`
  )
}
