/** Cloudflare Pages default / preview hostnames for project `jobbie-pwa`. */
const PAGES_DEV_PROJECT = 'jobbie-pwa'

function hostWithoutPort(host: string): string {
  return host.toLowerCase().split(':')[0] ?? ''
}

/** `jobbie-pwa.pages.dev` and `*.jobbie-pwa.pages.dev` branch/deploy previews. */
export function isJobbiePagesDevHost(host: string | undefined): boolean {
  if (!host?.trim()) return false
  const h = hostWithoutPort(host)
  return h === `${PAGES_DEV_PROJECT}.pages.dev` || h.endsWith(`.${PAGES_DEV_PROJECT}.pages.dev`)
}

export function buildCanonicalRedirectUrl(
  siteUrl: string,
  pathname: string,
  search: string,
): string | null {
  const origin = siteUrl.trim()
  if (!origin) return null
  try {
    return new URL(`${pathname}${search}`, origin).toString()
  } catch {
    return null
  }
}
