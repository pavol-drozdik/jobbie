import { S } from '~/utils/strings'
import type { CompanyAd, CompanyAdListItem, CompanyAdStatus } from '~/utils/company-ad'

/** Draft passed from /firmy/novy → /firmy/add/:adId (avoids draft GET before session is ready). */
export const FIRMY_WIZARD_BOOTSTRAP_KEY = 'firmy-wizard-bootstrap'

export function useFirmyWizardBootstrap() {
  return useState<CompanyAd | null>(FIRMY_WIZARD_BOOTSTRAP_KEY, () => null)
}

export function isCompanyAdActive(ad: Pick<CompanyAdListItem, 'status' | 'ends_at'>): boolean {
  if (ad.status !== 'active') return false
  if (!ad.ends_at) return true
  return new Date(ad.ends_at).getTime() > Date.now()
}

export function isCompanyAdInactive(ad: Pick<CompanyAdListItem, 'status' | 'ends_at'>): boolean {
  if (ad.status === 'draft') return false
  if (isCompanyAdActive(ad)) return false
  return true
}

export function companyAdStatusLabel(
  ad: Pick<CompanyAdListItem, 'status' | 'ends_at'>,
): string {
  if (ad.status === 'draft') return S.firmyHubStatusDraft
  if (isCompanyAdActive(ad)) return S.firmyHubStatusActive
  return S.firmyHubStatusInactive
}

/**
 * @deprecated Hub rows use `CategoryHubGlyph` / `CategoryIcon` instead of gradient bars.
 * Gradients keyed by `CATEGORIES` slugs in `utils/job.ts`.
 */
const CATEGORY_SWATCH: Record<string, string> = {
  stavba: 'bg-gradient-to-br from-amber-600 to-stone-900',
  domacnost: 'bg-gradient-to-br from-sky-500 to-blue-800',
  zahrada: 'bg-gradient-to-br from-lime-600 to-green-900',
  stahovanie: 'bg-gradient-to-br from-orange-500 to-amber-900',
  sklad: 'bg-gradient-to-br from-zinc-500 to-zinc-900',
  eventy: 'bg-gradient-to-br from-fuchsia-500 to-pink-700',
  starostlivost: 'bg-gradient-to-br from-rose-500 to-red-900',
  gastro: 'bg-gradient-to-br from-yellow-500 to-orange-800',
  auto: 'bg-gradient-to-br from-slate-500 to-slate-800',
  ine: 'bg-gradient-to-br from-violet-500 to-indigo-800',
}

export function companyAdCategorySwatch(category: string): string {
  return CATEGORY_SWATCH[category] ?? 'bg-gradient-to-br from-marketing-green to-[#15803d]'
}

export function partitionCompanyAds(ads: CompanyAdListItem[]): {
  draft: CompanyAdListItem[]
  published: CompanyAdListItem[]
  inactive: CompanyAdListItem[]
} {
  const draft: CompanyAdListItem[] = []
  const published: CompanyAdListItem[] = []
  const inactive: CompanyAdListItem[] = []
  for (const ad of ads) {
    if (ad.status === 'draft') {
      draft.push(ad)
    } else if (isCompanyAdActive(ad)) {
      published.push(ad)
    } else {
      inactive.push(ad)
    }
  }
  return { draft, published, inactive }
}
