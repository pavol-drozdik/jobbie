import { formatCompensationAmountSk } from '~/utils/job'
import {
  getAvailabilityLabel,
  getPriceTypeLabel,
  getServiceAreaLabel,
} from '~/utils/company-ad-options'
import type { CompanyAd, CompanyAdListItem } from '~/utils/company-ad'

const PRICE_UNIT_SUFFIX: Record<string, string> = {
  hourly: '/ hod.',
  per_sqm: '/ m²',
  per_project: '',
  per_unit: '/ ks',
}

export function getCompanyAdLocationDisplay(
  ad: Pick<
    CompanyAd,
    'city' | 'region' | 'street_address' | 'postal_code' | 'show_exact_address'
  >,
): string {
  const parts: string[] = []
  if (ad.city) parts.push(ad.city)
  if (ad.region) parts.push(ad.region)
  if (ad.show_exact_address) {
    if (ad.street_address) parts.push(ad.street_address)
    if (ad.postal_code) parts.push(ad.postal_code)
  }
  return parts.join(', ')
}

export function getCompanyAdCardLocation(
  ad: Pick<CompanyAd, 'city' | 'region' | 'street_address' | 'postal_code' | 'show_exact_address'> & {
    owner_location?: string | null
  },
): string {
  const fromAd = getCompanyAdLocationDisplay(ad)
  if (fromAd) return fromAd
  return (ad.owner_location ?? '').trim()
}

export function getCompanyAdPriceDisplay(
  ad: Pick<
    CompanyAd,
    'price_type' | 'price_min' | 'price_max' | 'price_negotiable' | 'price_note'
  >,
): string {
  const type = ad.price_type ?? 'negotiable'
  if (type === 'hidden') return ''
  if (type === 'negotiable' || ad.price_negotiable) return 'Cena dohodou'

  const suffix = PRICE_UNIT_SUFFIX[type] ?? ''
  const min = ad.price_min
  const max = ad.price_max

  if (min != null && max != null && max !== min) {
    return `${formatCompensationAmountSk(min)} – ${formatCompensationAmountSk(max)} €${suffix}`
  }
  if (min != null) {
    const typeLabel = getPriceTypeLabel(type)
    if (type === 'per_project') {
      return `Cena za projekt od ${formatCompensationAmountSk(min)} €`
    }
    return `Od ${formatCompensationAmountSk(min)} €${suffix}`
  }
  if (type === 'negotiable') return 'Cena dohodou'
  return getPriceTypeLabel(type) || 'Cena dohodou'
}

export function getCompanyAdServiceAreasDisplay(serviceAreas: string[]): string {
  return serviceAreas
    .filter((a) => a !== 'custom')
    .map((a) => getServiceAreaLabel(a))
    .filter(Boolean)
    .join(' · ')
}

export function getCompanyAdServiceAreasFullDisplay(
  ad: Pick<CompanyAd, 'service_areas' | 'custom_service_areas'>,
): string {
  const areas = ad.service_areas ?? []
  const parts: string[] = []
  const enumLine = getCompanyAdServiceAreasDisplay(areas)
  if (enumLine) parts.push(enumLine)
  if (areas.includes('custom')) {
    const custom = (ad.custom_service_areas ?? [])
      .map((s) => s.trim())
      .filter(Boolean)
    if (custom.length > 0) parts.push(custom.join(' · '))
  }
  return parts.join(' · ')
}

export function getCompanyAdAvailabilityDisplay(ad: Pick<CompanyAd, 'availability'>): string {
  if (!ad.availability) return ''
  return getAvailabilityLabel(ad.availability)
}

export function getCompanyAdServicesPreview(services: string[], max = 3): string[] {
  return services.slice(0, max)
}

/** Display name of the profile account that owns/published the ad (not contact_person on the ad). */
export function getCompanyAdOwnerDisplayName(
  ad: Pick<
    CompanyAd,
    'profile_type' | 'owner_role' | 'owner_display_name' | 'owner_company_name'
  >,
): string {
  const company = (ad.owner_company_name ?? '').trim()
  const display = (ad.owner_display_name ?? '').trim()
  const useCompanyFirst =
    ad.owner_role === 'company' || ad.profile_type === 'company'
  if (useCompanyFirst) {
    return company || display
  }
  return display || company
}

export function getCompanyAdOwnerAvatarUrl(
  ad: Pick<
    CompanyAd,
    'profile_type' | 'owner_role' | 'owner_logo_url' | 'owner_avatar_url'
  >,
): string {
  const useCompanyFirst =
    ad.owner_role === 'company' || ad.profile_type === 'company'
  if (useCompanyFirst) {
    return (ad.owner_logo_url ?? ad.owner_avatar_url ?? '').trim()
  }
  return (ad.owner_avatar_url ?? ad.owner_logo_url ?? '').trim()
}
