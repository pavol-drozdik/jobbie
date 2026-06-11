import { ROUTES } from '~/utils/app-routes'

export type LlmsTxtInput = {
  siteUrl: string
  brandName?: string
}

function abs(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/**
 * Site-level llms.txt (curated index for AI agents). Not a full URL dump.
 */
export function buildLlmsTxt(input: LlmsTxtInput): string {
  const brand = input.brandName?.trim() || 'JOBBIE'
  const site = input.siteUrl.replace(/\/+$/, '')
  const lines = [
    `# ${brand}`,
    '',
    `> Slovenská platforma pre brigády, pracovné ponuky, sezónne práce (napr. kosenie trávy, pomoc v záhrade) a služby profesionálov.`,
    '',
    'Pre jednotlivé inzeráty použite katalóg alebo syndikačné feedy nižšie. Kompletný zoznam URL je v sitemap.xml.',
    '',
    '## Katalóg ponúk',
    '',
    `- [Pracovné ponuky](${abs(site, ROUTES.find)}): brigády, sezónne práce, kosenie trávy, pomoc v domácnosti a ďalšie ponuky na Slovensku.`,
    `- [Zahraničné pracovné ponuky](${abs(site, ROUTES.foreignFind)}): práca v zahraničí pre slovenských uchádzačov.`,
    `- [Profesionáli](${abs(site, ROUTES.professionalsCatalog)}): inzeráty služieb a ponuky profesionálov (remeselníci, pomocníci, sezónne služby).`,
    `- [Detail ponuky](${abs(site, ROUTES.jobDetail('{id}'))}): jednotlivá pracovná ponuka podľa UUID.`,
    `- [Detail profesionála](${abs(site, ROUTES.professionalDetail('{id}'))}): jednotlivý inzerát podľa UUID.`,
    '',
    '## Syndikácia',
    '',
    `- [RSS — pracovné ponuky](${abs(site, '/feeds/jobs.rss')})`,
    `- [JSON Feed — pracovné ponuky](${abs(site, '/feeds/jobs.json')})`,
    `- [RSS — profesionáli](${abs(site, '/feeds/ads.rss')})`,
    `- [JSON Feed — profesionáli](${abs(site, '/feeds/ads.json')})`,
    `- [Sitemap](${abs(site, '/sitemap.xml')})`,
    '',
    '## Informácie',
    '',
    `- [Cenník](${abs(site, ROUTES.pricing)})`,
    `- [Blog](${abs(site, ROUTES.blog)})`,
    `- [Ponuky na e-mail](${abs(site, '/ponuky-na-email')})`,
    `- [Bezpečnosť](${abs(site, ROUTES.security)})`,
    '',
  ]
  return lines.join('\n')
}
