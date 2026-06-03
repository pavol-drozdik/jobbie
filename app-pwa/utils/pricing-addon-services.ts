export type PricingAddonServiceId =
  | 'homepage_banner'
  | 'job_list_banner'
  | 'job_list_mini_banner'
  | 'top_employers_logo'
  | 'pr_article'
  | 'mailing'
  | 'other'

export interface PricingAddonService {
  readonly id: PricingAddonServiceId
  readonly title: string
  readonly description: string
  readonly spec?: string
  readonly priceLabel: string
  readonly pricePeriod: string
}

export const PRICING_ADDON_SERVICES: readonly PricingAddonService[] = [
  {
    id: 'homepage_banner',
    title: 'Banner na domovskej stránke',
    description:
      'Zverejni tvoj reklamný banner na homepage a efektívne oslov našich používateľov.',
    spec: '1360×250 px',
    priceLabel: 'od 249 €',
    pricePeriod: '/ týždeň',
  },
  {
    id: 'job_list_banner',
    title: 'Banner v zozname pracovných ponúk',
    description:
      'Zverejni tvoj reklamný banner v časti Pracovné ponuky a efektívne zaujmi uchádzačov o prácu.',
    spec: '1360×250 px',
    priceLabel: 'od 149 €',
    pricePeriod: '/ týždeň',
  },
  {
    id: 'job_list_mini_banner',
    title: 'Mini banner',
    description:
      'Zverejni tvoj reklamný banner v časti Pracovné ponuky a efektívne zaujmi uchádzačov o prácu.',
    spec: '320×500 px',
    priceLabel: 'od 79 €',
    pricePeriod: '/ týždeň',
  },
  {
    id: 'top_employers_logo',
    title: 'Logo v sekcii TOP zamestnávatelia',
    description:
      'Zverejni logo tvojej spoločnosti s preklikom na aktuálne pracovné ponuky na homepage.',
    priceLabel: 'od 99 €',
    pricePeriod: '/ mesiac',
  },
  {
    id: 'pr_article',
    title: 'PR článok',
    description: 'Zverejni PR článok v našej blogovej sekcii.',
    priceLabel: 'od 350 €',
    pricePeriod: '/ článok',
  },
  {
    id: 'mailing',
    title: 'Mailing',
    description: 'Oslov používateľov Jobbie reklamným e-mailom.',
    priceLabel: 'od 400 €',
    pricePeriod: '/ kampaň',
  },
] as const

export const PRICING_ADDON_SERVICE_IDS: readonly PricingAddonServiceId[] = [
  ...PRICING_ADDON_SERVICES.map((s) => s.id),
  'other',
]

export function pricingAddonServiceLabel(serviceId: string): string {
  const found = PRICING_ADDON_SERVICES.find((s) => s.id === serviceId)
  if (found) return found.title
  if (serviceId === 'other') return 'Iné'
  return serviceId
}

export function pricingAddonServiceDropdownOptions(): { value: string; label: string }[] {
  return [
    ...PRICING_ADDON_SERVICES.map((s) => ({ value: s.id, label: s.title })),
    { value: 'other', label: 'Iné' },
  ]
}
