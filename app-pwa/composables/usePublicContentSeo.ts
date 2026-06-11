import type { BlogPostDetail } from '~/composables/useBlog'
import type { CompanyAd } from '~/utils/company-ad'
import type { Job } from '~/utils/job'
import type { BreadcrumbJsonLdItem } from '~/utils/seo-json-ld'
import { normalizeSiteUrl } from '~/utils/seo-config'
import { useBrandSeoConfig } from '~/utils/brand-seo'
import {
  buildBlogPostDetailBreadcrumbs,
  buildBlogPostDetailJsonLd,
  buildBlogPostDetailSeoMeta,
  buildJobDetailBreadcrumbs,
  buildJobDetailJsonLd,
  buildJobDetailSeoMeta,
  buildProfessionalAdDetailBreadcrumbs,
  buildProfessionalAdDetailJsonLd,
  buildProfessionalAdDetailSeoMeta,
} from '~/utils/public-content-seo'

type ContentRef<T> = Ref<T | null | undefined> | ComputedRef<T | null | undefined>

function resolveContent<T>(source: ContentRef<T>): T | null {
  const value = unref(source)
  return value ?? null
}

/**
 * Applies full SEO (meta, canonical, OG, JSON-LD) from a loaded job offer.
 * Call once per job detail page after `job` is populated (SSR or client).
 */
export function useJobDetailSeo(
  job: ContentRef<Job>,
  options: { fallbackTitle?: string } = {},
): void {
  const route = useRoute()
  const config = useRuntimeConfig()
  const siteUrl = computed(() =>
    normalizeSiteUrl(String(config.public.siteUrl || '')),
  )
  const breadcrumbs = computed(() => {
    const j = resolveContent(job)
    return j ? buildJobDetailBreadcrumbs(j) : []
  })
  usePageSeo(() => {
    const j = resolveContent(job)
    if (!j) {
      return {
        title: options.fallbackTitle ?? 'Pracovné ponuky',
        noindex: true,
        canonicalPath: route.path,
      }
    }
    const meta = buildJobDetailSeoMeta(j)
    const site = siteUrl.value
    return {
      title: meta.title,
      description: meta.description,
      canonicalPath: meta.canonicalPath,
      ogImage: meta.ogImage,
      ogType: meta.ogType,
      dateModified: meta.dateModified,
      noindex: meta.noindex,
      jsonLd: site ? buildJobDetailJsonLd(j, site, breadcrumbs.value) : null,
    }
  })
}

/** Full SEO for a public blog article. */
export function useBlogPostDetailSeo(post: ContentRef<BlogPostDetail>): void {
  const route = useRoute()
  const brand = useBrandSeoConfig()
  const config = useRuntimeConfig()
  const siteUrl = computed(() =>
    normalizeSiteUrl(String(config.public.siteUrl || '')),
  )
  const breadcrumbs = computed(() => {
    const p = resolveContent(post)
    return p ? buildBlogPostDetailBreadcrumbs(p) : []
  })
  usePageSeo(() => {
    const p = resolveContent(post)
    if (!p) {
      return { title: 'Blog', noindex: true, canonicalPath: route.path }
    }
    const meta = buildBlogPostDetailSeoMeta(p)
    const site = siteUrl.value
    return {
      title: meta.title,
      description: meta.description,
      canonicalPath: meta.canonicalPath,
      ogImage: meta.ogImage,
      ogType: meta.ogType,
      articlePublishedTime: meta.articlePublishedTime,
      jsonLd: site
        ? buildBlogPostDetailJsonLd(p, site, breadcrumbs.value, brand)
        : null,
    }
  })
}

/** Full SEO for a public professional / company ad detail. */
export function useProfessionalAdDetailSeo(
  ad: ContentRef<CompanyAd>,
  options: { fallbackTitle?: string } = {},
): void {
  const route = useRoute()
  const config = useRuntimeConfig()
  const siteUrl = computed(() =>
    normalizeSiteUrl(String(config.public.siteUrl || '')),
  )
  const breadcrumbs = computed(() => {
    const a = resolveContent(ad)
    return a ? buildProfessionalAdDetailBreadcrumbs(a) : []
  })
  usePageSeo(() => {
    const a = resolveContent(ad)
    if (!a) {
      return {
        title: options.fallbackTitle ?? 'Profesionáli',
        noindex: true,
        canonicalPath: route.path,
      }
    }
    const meta = buildProfessionalAdDetailSeoMeta(a)
    const site = siteUrl.value
    return {
      title: meta.title,
      description: meta.description,
      canonicalPath: meta.canonicalPath,
      ogImage: meta.ogImage,
      ogType: meta.ogType,
      dateModified: meta.dateModified,
      noindex: meta.noindex,
      jsonLd: site ? buildProfessionalAdDetailJsonLd(a, site, breadcrumbs.value) : null,
    }
  })
}
