import type { HomeFaqItem } from '~/utils/home-faq'
import type { Job } from '~/utils/job'
import type { BlogPostDetail } from '~/composables/useBlog'
import { getJobPublicLocation } from '~/utils/job'
import { ROUTES } from '~/utils/app-routes'
import { BRAND_ICON_512_PATH } from '~/utils/brand-assets'
import type { BrandSeoConfig } from '~/utils/brand-seo'

export type JsonLdObject = Record<string, unknown>

export type BreadcrumbJsonLdItem = {
  label: string
  to?: string
}

const EMPLOYMENT_TYPE_SCHEMA: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  volunteer: 'VOLUNTEER',
  freelance: 'CONTRACTOR',
}

function mapEmploymentTypes(types: string[] | undefined): string[] | undefined {
  if (!types?.length) return undefined
  const mapped = types
    .map((t) => EMPLOYMENT_TYPE_SCHEMA[t.trim().toLowerCase()] ?? t.trim().toUpperCase())
    .filter(Boolean)
  return mapped.length ? mapped : undefined
}

function mapJobLocationType(job: Job): string | undefined {
  const modes = job.work_modes?.length
    ? job.work_modes
    : job.work_mode
      ? [job.work_mode]
      : []
  if (modes.includes('remote')) return 'TELECOMMUTE'
  if (modes.includes('hybrid')) return 'TELECOMMUTE'
  return undefined
}

export type OrganizationJsonLdInput = {
  siteUrl: string
  email?: string
  logoPath?: string
  brandName?: string
  brandAlternateName?: string
  supportPhone?: string | null
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function brandNames(input?: Pick<OrganizationJsonLdInput, 'brandName' | 'brandAlternateName'>): {
  name: string
  alternateName: string
} {
  return {
    name: input?.brandName?.trim() || 'JOBBIE',
    alternateName: input?.brandAlternateName?.trim() || 'Jobbie',
  }
}

export function buildJobPostingJsonLd(job: Job, siteUrl: string): JsonLdObject {
  const description = stripHtml(job.description || job.title).slice(0, 5000)
  const location = getJobPublicLocation(job).trim()
  const payload: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    datePosted: job.created_at,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.employer_name?.trim() || 'Zamestnávateľ',
    },
    url: `${siteUrl}${ROUTES.jobDetail(job.id)}`,
  }
  if (location && location !== '—') {
    payload.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: location,
        addressCountry: job.is_foreign ? undefined : 'SK',
      },
    }
  }
  if (job.application_deadline) {
    payload.validThrough = job.application_deadline
  }
  const pay = job.compensation_amount ?? job.salary_amount
  if (pay != null && Number.isFinite(Number(pay))) {
    payload.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: 'EUR',
      value: {
        '@type': 'QuantitativeValue',
        value: Number(pay),
        unitText: job.compensation_type === 'hourly' || job.salary_type === 'hourly' ? 'HOUR' : 'MONTH',
      },
    }
  }
  const employmentType = mapEmploymentTypes(job.employment_types)
  if (employmentType?.length) {
    payload.employmentType = employmentType.length === 1 ? employmentType[0] : employmentType
  }
  const jobLocationType = mapJobLocationType(job)
  if (jobLocationType) {
    payload.jobLocationType = jobLocationType
  }
  return payload
}

export function buildBlogArticleJsonLd(
  post: BlogPostDetail,
  siteUrl: string,
  brand?: Pick<BrandSeoConfig, 'brandName'>,
): JsonLdObject {
  const headline = post.seo_title?.trim() || post.title
  const description =
    post.seo_description?.trim() || post.excerpt?.trim() || stripHtml(post.body_html).slice(0, 320)
  const authorName = post.author_name?.trim()
  const publisherName = brand?.brandName?.trim() || 'JOBBIE'
  const author: JsonLdObject = authorName
    ? {
        '@type': 'Person',
        name: authorName,
        ...(post.author_role?.trim() ? { jobTitle: post.author_role.trim() } : {}),
      }
    : {
        '@type': 'Organization',
        name: publisherName,
      }
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    description,
    datePublished: post.published_at,
    image: post.cover_image_url || `${siteUrl}${BRAND_ICON_512_PATH}`,
    author,
    publisher: {
      '@type': 'Organization',
      name: publisherName,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/jobbielogo.svg`,
      },
    },
    mainEntityOfPage: `${siteUrl}${ROUTES.blogPost(post.slug)}`,
  }
}

export function buildOrganizationJsonLd(input: OrganizationJsonLdInput): JsonLdObject {
  const logo = input.logoPath ?? '/jobbielogo.svg'
  const names = brandNames(input)
  const contactPoint: JsonLdObject = {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: input.email ?? 'info@jobbie.sk',
    availableLanguage: ['sk'],
  }
  if (input.supportPhone?.trim()) {
    contactPoint.telephone = input.supportPhone.trim()
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: names.name,
    alternateName: names.alternateName,
    url: input.siteUrl,
    logo: `${input.siteUrl}${logo.startsWith('/') ? logo : `/${logo}`}`,
    contactPoint,
  }
}

export function buildFaqPageJsonLd(items: readonly HomeFaqItem[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildWebPageJsonLd(input: {
  siteUrl: string
  path: string
  name: string
  description: string
  dateModified?: string
}): JsonLdObject {
  const url = `${input.siteUrl.replace(/\/+$/, '')}${input.path.startsWith('/') ? input.path : `/${input.path}`}`
  const payload: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: input.name,
    description: input.description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      url: input.siteUrl,
    },
  }
  if (input.dateModified) {
    payload.dateModified = input.dateModified
  }
  return payload
}

export function buildHowToJsonLd(input: {
  siteUrl: string
  path: string
  name: string
  description: string
  steps: readonly { name: string; text: string }[]
}): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: input.name,
    description: input.description,
    url: `${input.siteUrl}${input.path}`,
    step: input.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  }
}

export function buildServiceJsonLd(input: {
  siteUrl: string
  path: string
  name: string
  description: string
  providerName?: string
  imageUrl?: string | null
  areaServed?: string | null
  dateModified?: string | null
}): JsonLdObject {
  const url = `${input.siteUrl.replace(/\/+$/, '')}${input.path.startsWith('/') ? input.path : `/${input.path}`}`
  const payload: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: input.name,
    description: input.description,
    url,
    provider: {
      '@type': 'Organization',
      name: input.providerName?.trim() || input.name,
    },
  }
  if (input.imageUrl?.trim()) {
    payload.image = input.imageUrl.trim()
  }
  if (input.areaServed?.trim()) {
    payload.areaServed = {
      '@type': 'AdministrativeArea',
      name: input.areaServed.trim(),
    }
  }
  if (input.dateModified?.trim()) {
    payload.dateModified = input.dateModified.trim()
  }
  return payload
}

export function buildWebSiteJsonLd(
  siteUrl: string,
  brand?: Pick<BrandSeoConfig, 'brandName'>,
): JsonLdObject {
  const name = brand?.brandName?.trim() || 'JOBBIE'
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}${ROUTES.find}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildBreadcrumbListJsonLd(
  items: readonly BreadcrumbJsonLdItem[],
  siteUrl: string,
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const entry: JsonLdObject = {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
      }
      if (item.to) {
        entry.item = `${siteUrl.replace(/\/+$/, '')}${item.to.startsWith('/') ? item.to : `/${item.to}`}`
      }
      return entry
    }),
  }
}
