import { CATEGORIES, type CategorySlug } from '~/utils/job'



/**

 * Icon identifiers consumed by {@link AppIcon} (stroke icons use currentColor).

 */

export type AppIconName =

  | 'home'

  | 'search'

  | 'building'

  | 'chat'

  | 'user'

  | 'map-pin'

  | 'clock'

  | 'bolt'

  | 'briefcase'

  | 'wrench'

  | 'leaf'

  | 'truck'

  | 'package'

  | 'music'

  | 'heart'

  | 'utensils'

  | 'car'

  | 'ellipsis'

  | 'star'

  | 'currency'

  | 'check-circle'

  | 'bell'

  | 'chevron-left'

  | 'chevron-right'

  | 'calendar'

  | 'arrow-right'

  | 'triangle-alert'

  | 'award'

  | 'menu'

  | 'x'

  | 'chevron-down'

  | 'image'

  | 'plus'

  | 'paperclip'

  | 'send'

  | 'smartphone'

  | 'bookmark'

  | 'hourglass'

  | 'settings'

  | 'pencil'

  | 'trash-2'

  | 'share-2'

  | 'users'

  | 'chart-line'

  | 'id-card'

  | 'file-lines'

  | 'bar-chart'

  | 'rocket'

  | 'reply'

  | 'mail'

  | 'shield-check'
  | 'check'
  | 'eye'
  | 'eye-off'
  | 'store'
  | 'at-sign'
  | 'loader'
  | 'copy'
  | 'upload'
  | 'graduation-cap'
  | 'languages'
  | 'code'
  | 'download'
  | 'palette'
  | 'circle-check'



/** Legacy DB / Base44 / filter values → canonical `CATEGORIES` slugs. Keep in sync with backend `LEGACY_JOB_CATEGORY_SLUG_ALIASES`. */

export const LEGACY_CATEGORY_SLUG_ALIASES: Record<string, CategorySlug> = {

  construction: 'stavba',

  moving: 'stahovanie',

  cleaning: 'domacnost',

  warehouse: 'sklad',

  garden: 'zahrada',

  events: 'eventy',

  care: 'starostlivost',

  food: 'gastro',

  restaurant: 'gastro',

  transport: 'auto',

  logistics: 'auto',

  doprava: 'auto',

  other: 'ine',

}



const CATEGORY_ICON_BY_SLUG = {

  stavba: 'wrench',

  domacnost: 'home',

  zahrada: 'leaf',

  stahovanie: 'truck',

  sklad: 'package',

  eventy: 'music',

  starostlivost: 'heart',

  gastro: 'utensils',

  /** Transport / „Doprava & Logistika“ (design: truck, not passenger car). */

  auto: 'truck',

  ine: 'ellipsis',

} as const satisfies Record<CategorySlug, AppIconName>



const categorySlugToIcon: Record<string, AppIconName> = {

  ...CATEGORY_ICON_BY_SLUG,

}



export function normalizeCategorySlug(category: string | null | undefined): CategorySlug | null {

  if (!category) return null

  const raw = category.trim().toLowerCase()

  if (!raw) return null

  const aliased = LEGACY_CATEGORY_SLUG_ALIASES[raw]

  if (aliased) return aliased

  if ((CATEGORIES as readonly string[]).includes(raw)) {

    return raw as CategorySlug

  }

  return null

}



export function getCategoryIconName(category: string | null | undefined): AppIconName {

  const slug = normalizeCategorySlug(category)

  if (!slug) return 'briefcase'

  return categorySlugToIcon[slug] ?? 'briefcase'

}



/** Keys of {@link CATEGORY_ICON_BY_SLUG} — one icon per canonical slug. */

export function getCategoryIconMapKeys(): CategorySlug[] {

  return [...CATEGORIES]

}


