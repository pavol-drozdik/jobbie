import { normalizeSiteUrl } from '~/utils/seo-config'
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '~/utils/seo-json-ld'
import { useBrandSeoConfig } from '~/utils/brand-seo'
import { usePageSeo } from '~/composables/usePageSeo'

/** Site-wide Organization + WebSite JSON-LD on marketing layout. */
export function useGlobalSiteSeo(): void {
  const config = useRuntimeConfig()
  const brand = useBrandSeoConfig()
  const siteUrl = computed(() =>
    normalizeSiteUrl(config.public.siteUrl as string | undefined),
  )
  const jsonLd = computed(() => {
    const origin = siteUrl.value
    if (!origin) return null
    return [
      buildOrganizationJsonLd({
        siteUrl: origin,
        email: brand.supportEmail,
        brandName: brand.brandName,
        brandAlternateName: brand.brandAlternateName,
        supportPhone: brand.supportPhone,
      }),
      buildWebSiteJsonLd(origin, brand),
    ]
  })
  usePageSeo(() => ({
    jsonLd: jsonLd.value,
  }))
}
