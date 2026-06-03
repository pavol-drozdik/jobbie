/** Brand and public contact values from runtime config (SEO / trust UI). */

export type BrandSeoConfig = {
  brandName: string
  brandAlternateName: string
  supportEmail: string
  supportPhone: string | null
  socialInstagramUrl: string | null
  socialFacebookUrl: string | null
  legalPublished: boolean
}

const PLACEHOLDER_PHONE_PATTERN = /900\s*000/

function isPlaceholderPhone(value: string): boolean {
  return PLACEHOLDER_PHONE_PATTERN.test(value)
}

function isGenericSocialUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  try {
    const url = new URL(trimmed)
    const path = url.pathname.replace(/\/+$/, '')
    return path === '' || path === '/'
  } catch {
    return true
  }
}

export function readBrandSeoConfigFromRuntime(
  publicConfig: Record<string, unknown>,
): BrandSeoConfig {
  const rawPhone = String(publicConfig.supportPhone ?? '').trim()
  const rawInstagram = String(publicConfig.socialInstagramUrl ?? '').trim()
  const rawFacebook = String(publicConfig.socialFacebookUrl ?? '').trim()
  return {
    brandName: String(publicConfig.brandName ?? 'JOBBIE').trim() || 'JOBBIE',
    brandAlternateName:
      String(publicConfig.brandAlternateName ?? 'Jobbie').trim() || 'Jobbie',
    supportEmail: String(publicConfig.supportEmail ?? 'info@jobbie.sk').trim() || 'info@jobbie.sk',
    supportPhone: rawPhone && !isPlaceholderPhone(rawPhone) ? rawPhone : null,
    socialInstagramUrl:
      rawInstagram && !isGenericSocialUrl(rawInstagram) ? rawInstagram : null,
    socialFacebookUrl:
      rawFacebook && !isGenericSocialUrl(rawFacebook) ? rawFacebook : null,
    legalPublished:
      publicConfig.legalPublished === '1' ||
      publicConfig.legalPublished === 1 ||
      String(publicConfig.legalPublished ?? '').trim().toLowerCase() === 'true',
  }
}

export function useBrandSeoConfig(): BrandSeoConfig {
  const config = useRuntimeConfig()
  return readBrandSeoConfigFromRuntime(config.public as Record<string, unknown>)
}
