import {
  SEO_DEFAULT_DESCRIPTION,
  SEO_DEFAULT_OG_IMAGE_PATH,
  SEO_DEFAULT_TITLE,
  formatBrandedSeoTitle,
  normalizeSiteUrl,
  parseAllowIndexing,
  parseLegalPublished,
} from '~/utils/seo-config'
import { pathShouldNoindex } from '~/utils/seo-route-policy'
import { useBrandSeoConfig } from '~/utils/brand-seo'
import type { JsonLdObject } from '~/utils/seo-json-ld'
import type { SeoAlternateFeed } from '~/utils/seo-feed-links'

export type PageSeoInput = {
  title?: string
  description?: string
  /** Path only, e.g. `/ponuka/uuid` */
  canonicalPath?: string
  /** Whitelisted query keys for canonical URL (e.g. catalog `q`, `category`). */
  canonicalQuery?: Record<string, string>
  ogImage?: string | null
  ogType?: string
  robots?: string
  jsonLd?: JsonLdObject | JsonLdObject[] | null
  /** Force noindex even when route policy allows indexing */
  noindex?: boolean
  /** Override route policy (e.g. disabled public profile) */
  indexable?: boolean
  pagination?: { prev?: string; next?: string }
  dateModified?: string
  articlePublishedTime?: string
  alternateFeeds?: SeoAlternateFeed[]
}

const JSON_LD_SCRIPT_KEYS = [
  'seo-jsonld-0',
  'seo-jsonld-1',
  'seo-jsonld-2',
  'seo-jsonld-3',
  'seo-jsonld-4',
  'seo-jsonld-5',
] as const

function resolveAbsoluteUrl(siteUrl: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const base = siteUrl.replace(/\/+$/, '')
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${base}${path}`
}

function buildCanonicalHref(
  siteUrl: string,
  path: string,
  query?: Record<string, string>,
): string | undefined {
  if (!siteUrl) return undefined
  const base = resolveAbsoluteUrl(siteUrl, path)
  if (!query || Object.keys(query).length === 0) {
    return base
  }
  const params = new URLSearchParams(query)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

export function usePageSeo(input: MaybeRefOrGetter<PageSeoInput>): void {
  const route = useRoute()
  const config = useRuntimeConfig()
  const brand = useBrandSeoConfig()
  const siteUrl = computed(() =>
    normalizeSiteUrl(config.public.siteUrl as string | undefined),
  )
  const allowIndexing = computed(() =>
    parseAllowIndexing(String(config.public.allowIndexing ?? '')),
  )
  const legalPublished = computed(() =>
    parseLegalPublished(String(config.public.legalPublished ?? '')),
  )
  const resolved = computed(() => toValue(input))
  /** Page-only title; `nuxt.config` `titleTemplate` appends ` — JOBBIE` to the document title. */
  const pageTitle = computed(() => {
    const raw = resolved.value.title?.trim()
    return raw || SEO_DEFAULT_TITLE
  })
  const brandedTitle = computed(() =>
    formatBrandedSeoTitle(pageTitle.value, brand.brandName),
  )
  const description = computed(
    () => resolved.value.description?.trim() || SEO_DEFAULT_DESCRIPTION,
  )
  const canonicalUrl = computed(() => {
    const path = resolved.value.canonicalPath ?? route.path
    return buildCanonicalHref(siteUrl.value, path, resolved.value.canonicalQuery)
  })
  const ogImageUrl = computed(() => {
    const raw = resolved.value.ogImage?.trim()
    const path = raw || SEO_DEFAULT_OG_IMAGE_PATH
    const origin = siteUrl.value
    if (!origin) return path.startsWith('http') ? path : undefined
    return resolveAbsoluteUrl(origin, path)
  })
  const robotsContent = computed(() => {
    if (resolved.value.robots) return resolved.value.robots
    const indexable = resolved.value.indexable
    if (
      indexable === false ||
      resolved.value.noindex ||
      pathShouldNoindex(route.path, legalPublished.value)
    ) {
      return 'noindex, nofollow'
    }
    if (indexable !== true && !allowIndexing.value) return 'noindex, nofollow'
    return 'index, follow'
  })
  const jsonLdScripts = computed(() => {
    const ld = resolved.value.jsonLd
    if (!ld) return []
    const list = Array.isArray(ld) ? ld : [ld]
    return list.slice(0, JSON_LD_SCRIPT_KEYS.length).map((item, index) => ({
      key: JSON_LD_SCRIPT_KEYS[index] ?? `seo-jsonld-${index}`,
      type: 'application/ld+json',
      innerHTML: JSON.stringify(item),
    }))
  })
  useSeoMeta({
    title: () => pageTitle.value,
    description: () => description.value,
    robots: () => robotsContent.value,
    ogTitle: () => brandedTitle.value,
    ogDescription: () => description.value,
    ogType: () => resolved.value.ogType ?? 'website',
    ogUrl: () => canonicalUrl.value,
    ogImage: () => ogImageUrl.value,
    ogLocale: 'sk_SK',
    twitterCard: 'summary_large_image',
    twitterTitle: () => brandedTitle.value,
    twitterDescription: () => description.value,
    twitterImage: () => ogImageUrl.value,
    ...(resolved.value.dateModified
      ? { articleModifiedTime: () => resolved.value.dateModified }
      : {}),
    ...(resolved.value.articlePublishedTime
      ? { articlePublishedTime: () => resolved.value.articlePublishedTime }
      : {}),
  })
  useHead(() => {
    const links: Array<Record<string, string>> = []
    if (canonicalUrl.value) {
      links.push({ rel: 'canonical', href: canonicalUrl.value })
    }
    const pagination = resolved.value.pagination
    if (pagination?.prev) {
      links.push({ rel: 'prev', href: pagination.prev })
    }
    if (pagination?.next) {
      links.push({ rel: 'next', href: pagination.next })
    }
    for (const feed of resolved.value.alternateFeeds ?? []) {
      if (!feed.href?.trim()) continue
      links.push({
        rel: 'alternate',
        type: feed.type,
        href: feed.href,
        ...(feed.title ? { title: feed.title } : {}),
      })
    }
    return {
      link: links,
      script: jsonLdScripts.value,
    }
  })
}

/** Apply noindex on private layouts (settings, auth). */
export function useRobotsMeta(): void {
  usePageSeo({ noindex: true })
}
