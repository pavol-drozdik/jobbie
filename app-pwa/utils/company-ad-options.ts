export const COMPANY_AD_PROFILE_TYPES = [
  { value: 'company', label: 'Firma' },
  { value: 'sole_trader', label: 'Živnostník' },
  { value: 'freelancer', label: 'Freelancer / súkromná osoba' },
] as const

export const COMPANY_AD_PRICE_TYPES = [
  { value: 'hourly', label: 'Hodinová sadzba' },
  { value: 'per_sqm', label: 'Cena za m²' },
  { value: 'per_project', label: 'Cena za projekt' },
  { value: 'per_unit', label: 'Cena za kus' },
  { value: 'negotiable', label: 'Cena dohodou' },
  { value: 'hidden', label: 'Neuvádzať cenu' },
] as const

export const COMPANY_AD_AVAILABILITY = [
  { value: 'immediate', label: 'Ihneď' },
  { value: '7d', label: 'Do 7 dní' },
  { value: '14d', label: 'Do 14 dní' },
  { value: '30d', label: 'Do 30 dní' },
  { value: 'by_agreement', label: 'Dohodou' },
  { value: 'busy', label: 'Momentálne vyťažený' },
] as const

export const COMPANY_AD_SERVICE_AREAS = [
  { value: 'local_city', label: 'V mojom meste' },
  { value: 'region', label: 'V celom kraji' },
  { value: 'slovakia', label: 'Celé Slovensko' },
  { value: 'online', label: 'Online / na diaľku' },
  { value: 'custom', label: 'Vlastné oblasti' },
] as const

export const COMPANY_AD_CONTACT_METHODS = [
  { value: 'platform', label: 'Cez platformu' },
  { value: 'phone', label: 'Telefonicky' },
  { value: 'email', label: 'E-mailom' },
  { value: 'website', label: 'Webstránka' },
] as const

export const COMPANY_AD_EMPLOYEE_COUNTS = [
  { value: '1', label: '1' },
  { value: '2-5', label: '2–5' },
  { value: '6-10', label: '6–10' },
  { value: '11-50', label: '11–50' },
  { value: '51-200', label: '51–200' },
  { value: '200+', label: '200+' },
] as const

export const SK_KRAJE = [
  'Bratislavský kraj',
  'Trnavský kraj',
  'Trenčiansky kraj',
  'Nitriansky kraj',
  'Žilinský kraj',
  'Banskobystrický kraj',
  'Prešovský kraj',
  'Košický kraj',
] as const

export const SUGGESTED_COMPANY_SERVICES = [
  'Rekonštrukcie bytov',
  'Maľovanie',
  'Obklady a dlažby',
  'Sadrokartón',
  'Zatepľovanie',
  'Strechy',
  'Vodoinštalácia',
  'Elektroinštalácia',
  'Upratovanie domácností',
  'Upratovanie kancelárií',
  'Tepovanie',
  'Umývanie okien',
  'Účtovníctvo',
  'Webstránky',
  'Grafika',
  'Fotografovanie',
] as const

export type CompanyAdProfileType = (typeof COMPANY_AD_PROFILE_TYPES)[number]['value']
export type CompanyAdPriceType = (typeof COMPANY_AD_PRICE_TYPES)[number]['value']
export type CompanyAdAvailability = (typeof COMPANY_AD_AVAILABILITY)[number]['value']
export type CompanyAdServiceArea = (typeof COMPANY_AD_SERVICE_AREAS)[number]['value']
export type CompanyAdContactMethod = (typeof COMPANY_AD_CONTACT_METHODS)[number]['value']

export function getProfileTypeLabel(value: string | null | undefined): string {
  return COMPANY_AD_PROFILE_TYPES.find((o) => o.value === value)?.label ?? value ?? ''
}

export function getPriceTypeLabel(value: string | null | undefined): string {
  return COMPANY_AD_PRICE_TYPES.find((o) => o.value === value)?.label ?? value ?? ''
}

export function getAvailabilityLabel(value: string | null | undefined): string {
  return COMPANY_AD_AVAILABILITY.find((o) => o.value === value)?.label ?? value ?? ''
}

export function getServiceAreaLabel(value: string): string {
  return COMPANY_AD_SERVICE_AREAS.find((o) => o.value === value)?.label ?? value
}

export function getEmployeeCountLabel(value: string | null | undefined): string {
  return COMPANY_AD_EMPLOYEE_COUNTS.find((o) => o.value === value)?.label ?? value ?? ''
}

export function companyAdNameLabel(profileType: string): string {
  if (profileType === 'sole_trader' || profileType === 'freelancer') {
    return 'Meno alebo obchodný názov'
  }
  return 'Názov firmy'
}
