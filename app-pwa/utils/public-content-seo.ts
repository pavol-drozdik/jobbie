import type { BlogPostDetail } from '~/composables/useBlog'
import type { CompanyAd } from '~/utils/company-ad'
import {
  getCompanyAdCardLocation,
  getCompanyAdOwnerDisplayName,
} from '~/utils/company-ad-display'
import {
  getCategoryLabel,
  getJobCardPayDisplay,
  getJobCardThumbnailSrc,
  getJobPublicLocation,
  type Job,
} from '~/utils/job'
import { ROUTES } from '~/utils/app-routes'
import { SEO_DEFAULT_DESCRIPTION } from '~/utils/seo-config'
import { S } from '~/utils/strings'
import type { BrandSeoConfig } from '~/utils/brand-seo'
import {
  buildBlogArticleJsonLd,
  buildBreadcrumbListJsonLd,
  buildJobPostingJsonLd,
  buildServiceJsonLd,
  type BreadcrumbJsonLdItem,
  type JsonLdObject,
} from '~/utils/seo-json-ld'

export type PublicContentSeoMeta = {
  title: string
  description: string
  canonicalPath: string
  ogImage?: string | null
  ogType?: string
  dateModified?: string
  articlePublishedTime?: string
  noindex?: boolean
}

const META_DESCRIPTION_MAX = 160

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateMeta(text: string, max = META_DESCRIPTION_MAX): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trim()}…`
}

export function isJobPublicIndexable(job: Job): boolean {
  return job.is_active === true && job.is_draft !== true && job.is_deleted !== true
}

export function isCompanyAdPublicIndexable(ad: CompanyAd): boolean {
  return ad.status === 'active'
}

export function buildJobDetailSeoMeta(job: Job): PublicContentSeoMeta {
  const plain = stripHtml(job.description || '').trim() || job.title
  const location = getJobPublicLocation(job).trim()
  const pay = getJobCardPayDisplay(job)
  const category = getCategoryLabel(job.category)
  const parts = [job.title]
  if (location && location !== '—') parts.push(location)
  if (category) parts.push(category)
  if (pay && pay !== '—') parts.push(pay)
  const description = truncateMeta(parts.join(' · ') || plain)
  return {
    title: job.title,
    description,
    canonicalPath: ROUTES.jobDetail(job.id),
    ogImage: getJobCardThumbnailSrc(job),
    ogType: 'website',
    dateModified: job.updated_at ?? job.created_at,
    noindex: !isJobPublicIndexable(job),
  }
}

export function buildBlogPostDetailSeoMeta(post: BlogPostDetail): PublicContentSeoMeta {
  const description = truncateMeta(
    post.seo_description?.trim() ||
      post.excerpt?.trim() ||
      stripHtml(post.body_html) ||
      post.title,
  )
  return {
    title: post.seo_title?.trim() || post.title,
    description,
    canonicalPath: ROUTES.blogPost(post.slug),
    ogImage: post.cover_image_url,
    ogType: 'article',
    articlePublishedTime: post.published_at,
  }
}

export function buildProfessionalAdDetailSeoMeta(ad: CompanyAd): PublicContentSeoMeta {
  const plain = stripHtml(ad.body || '').trim() || ad.tagline?.trim() || ad.title
  const location = getCompanyAdCardLocation(ad).trim()
  const parts = [ad.title]
  if (ad.tagline?.trim()) parts.push(ad.tagline.trim())
  if (location && location !== '—') parts.push(location)
  return {
    title: ad.title,
    description: truncateMeta(parts.join(' · ') || plain),
    canonicalPath: ROUTES.professionalDetail(ad.id),
    ogImage: ad.thumbnail_url,
    ogType: 'website',
    dateModified: ad.updated_at ?? ad.created_at,
    noindex: !isCompanyAdPublicIndexable(ad),
  }
}

export function buildJobDetailBreadcrumbs(job: Job): BreadcrumbJsonLdItem[] {
  const items: BreadcrumbJsonLdItem[] = [
    { label: 'Domov', to: ROUTES.home },
    { label: S.jobOffers, to: job.is_foreign ? ROUTES.foreignFind : ROUTES.find },
  ]
  const category = getCategoryLabel(job.category)
  if (category) items.push({ label: category })
  if (job.title) items.push({ label: job.title })
  return items
}

export function buildBlogPostDetailBreadcrumbs(post: BlogPostDetail): BreadcrumbJsonLdItem[] {
  return [
    { label: 'Domov', to: ROUTES.home },
    { label: 'Blog', to: ROUTES.blog },
    { label: post.title },
  ]
}

export function buildProfessionalAdDetailBreadcrumbs(ad: CompanyAd): BreadcrumbJsonLdItem[] {
  return [
    { label: 'Domov', to: ROUTES.home },
    { label: S.firmyHubTitle, to: ROUTES.professionalsCatalog },
    { label: ad.title },
  ]
}

export function buildJobDetailJsonLd(
  job: Job,
  siteUrl: string,
  breadcrumbs: readonly BreadcrumbJsonLdItem[],
): JsonLdObject[] {
  const out: JsonLdObject[] = []
  if (isJobPublicIndexable(job)) {
    out.push(buildJobPostingJsonLd(job, siteUrl))
  }
  if (breadcrumbs.length) {
    out.push(buildBreadcrumbListJsonLd(breadcrumbs, siteUrl))
  }
  return out
}

export function buildBlogPostDetailJsonLd(
  post: BlogPostDetail,
  siteUrl: string,
  breadcrumbs: readonly BreadcrumbJsonLdItem[],
  brand: BrandSeoConfig,
): JsonLdObject[] {
  return [
    buildBlogArticleJsonLd(post, siteUrl, brand),
    ...(breadcrumbs.length ? [buildBreadcrumbListJsonLd(breadcrumbs, siteUrl)] : []),
  ]
}

export function buildProfessionalAdDetailJsonLd(
  ad: CompanyAd,
  siteUrl: string,
  breadcrumbs: readonly BreadcrumbJsonLdItem[],
): JsonLdObject[] {
  const out: JsonLdObject[] = []
  if (isCompanyAdPublicIndexable(ad)) {
    const description = buildProfessionalAdDetailSeoMeta(ad).description
    const areaServed = getCompanyAdCardLocation(ad).trim()
    out.push(
      buildServiceJsonLd({
        siteUrl,
        path: ROUTES.professionalDetail(ad.id),
        name: ad.title,
        description: ad.tagline?.trim() || description,
        providerName: getCompanyAdOwnerDisplayName(ad) || ad.title,
        imageUrl: ad.thumbnail_url,
        areaServed: areaServed && areaServed !== '—' ? areaServed : null,
        dateModified: ad.updated_at,
      }),
    )
  }
  if (breadcrumbs.length) {
    out.push(buildBreadcrumbListJsonLd(breadcrumbs, siteUrl))
  }
  return out
}

export type PublicDetailSeoKind = 'job' | 'blog' | 'company_ad'

export type PublicDetailSeoPayload = PublicContentSeoMeta & {
  jsonLd: JsonLdObject | JsonLdObject[] | null
}

/** Single entry point for automatic detail-page SEO (meta + JSON-LD + robots). */
export function buildPublicDetailSeoPayload(input: {
  kind: PublicDetailSeoKind
  siteUrl: string
  brand: BrandSeoConfig
  breadcrumbs: readonly BreadcrumbJsonLdItem[]
  job?: Job | null
  blogPost?: BlogPostDetail | null
  companyAd?: CompanyAd | null
  fallbackPath: string
}): PublicDetailSeoPayload {
  const { kind, siteUrl, brand, breadcrumbs, fallbackPath } = input
  if (kind === 'job' && input.job) {
    const meta = buildJobDetailSeoMeta(input.job)
    return {
      ...meta,
      jsonLd: siteUrl ? buildJobDetailJsonLd(input.job, siteUrl, breadcrumbs) : null,
    }
  }
  if (kind === 'blog' && input.blogPost) {
    const meta = buildBlogPostDetailSeoMeta(input.blogPost)
    return {
      ...meta,
      noindex: false,
      jsonLd: siteUrl
        ? buildBlogPostDetailJsonLd(input.blogPost, siteUrl, breadcrumbs, brand)
        : null,
    }
  }
  if (kind === 'company_ad' && input.companyAd) {
    const meta = buildProfessionalAdDetailSeoMeta(input.companyAd)
    return {
      ...meta,
      jsonLd: siteUrl
        ? buildProfessionalAdDetailJsonLd(input.companyAd, siteUrl, breadcrumbs)
        : null,
    }
  }
  return {
    title: 'Jobbie',
    description: SEO_DEFAULT_DESCRIPTION,
    canonicalPath: fallbackPath,
    jsonLd: null,
    noindex: true,
  }
}
