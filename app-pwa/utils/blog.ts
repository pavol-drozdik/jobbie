import { BRAND_DEFAULT_THUMB_WEBP_PATH } from './brand-assets'

export const BLOG_CATEGORIES = [
  { id: 'all', label: 'Všetky' },
  { id: 'tipy', label: 'Tipy' },
  { id: 'kariera', label: 'Kariéra' },
  { id: 'brigady', label: 'Brigády' },
  { id: 'firmy', label: 'Firmy' },
  { id: 'novinky', label: 'Novinky' },
] as const

export type BlogCategoryId = (typeof BLOG_CATEGORIES)[number]['id']

export const BLOG_CATEGORY_LABELS: Record<string, string> = {
  tipy: 'Tipy',
  kariera: 'Kariéra',
  brigady: 'Brigády',
  firmy: 'Firmy',
  novinky: 'Novinky',
}

export const BLOG_DEFAULT_COVER = BRAND_DEFAULT_THUMB_WEBP_PATH

/** Blog cover / list thumbnail aspect ratio (width : height). */
export const BLOG_COVER_ASPECT_CLASS = 'aspect-[4/3]'

/** Grid card: fixed 2-line title block (text-xl, leading-tight). */
export const BLOG_CARD_TITLE_CLASS =
  'm-0 mb-2.5 min-h-[3.125rem] line-clamp-2 font-dmSans text-xl font-extrabold leading-tight text-black'

/** Grid card: fixed 3-line excerpt block. */
export const BLOG_CARD_EXCERPT_CLASS =
  'm-0 mb-4 min-h-[4.65rem] line-clamp-3 font-dmSans text-[15px] font-normal leading-[1.55] text-black/50'

/** Featured card: fixed 2-line title block. */
export const BLOG_FEATURED_TITLE_CLASS =
  'm-0 mb-3 min-h-[4.5rem] line-clamp-2 font-dmSans text-[26px] font-extrabold leading-[1.2] text-black md:min-h-[4.875rem] md:text-[30px]'

/** Featured card: fixed 3-line excerpt block. */
export const BLOG_FEATURED_EXCERPT_CLASS =
  'm-0 mb-6 min-h-[4.65rem] line-clamp-3 font-dmSans text-[17px] font-normal leading-[1.6] text-black/55'

export function blogCategoryLabel(category: string): string {
  return BLOG_CATEGORY_LABELS[category] ?? category
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('sk-SK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function blogReadingLabel(minutes: number | null | undefined): string {
  if (!minutes || minutes < 1) return ''
  return `${minutes} min čítania`
}
