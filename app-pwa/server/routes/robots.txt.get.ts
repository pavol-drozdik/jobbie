import { parseAllowIndexing } from '~/utils/seo-config'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const allowIndexing = parseAllowIndexing(String(config.public.allowIndexing ?? ''))
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  if (!allowIndexing) {
    return [
      '# Do not index or crawl this deployment (NUXT_PUBLIC_ALLOW_INDEXING is not enabled).',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n')
  }
  const siteUrl = String(config.public.siteUrl || '').replace(/\/+$/, '')
  const sitemapLine = siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : 'Sitemap: /sitemap.xml'
  const llmsLine = siteUrl ? `# LLMs: ${siteUrl}/llms.txt` : '# LLMs: /llms.txt'
  return [
    llmsLine,
    'User-agent: *',
    'Allow: /',
    'Disallow: /auth/',
    'Disallow: /nastavenia/',
    'Disallow: /platba',
    'Disallow: /chat/',
    'Disallow: /dashboard/',
    'Disallow: /profil',
    'Disallow: /zivotopisy/',
    'Disallow: /vytvorit-ponuku/',
    'Disallow: /vytvorit-zahranicnu-ponuku/',
    'Disallow: /spravca-uchadzacov/',
    'Disallow: /moje-reklamy/',
    'Disallow: /app/',
    'Disallow: /unsubscribe/',
    'Disallow: /preferences/',
    sitemapLine,
    '',
  ].join('\n')
})
