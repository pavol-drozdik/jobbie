/** Countries for foreign job place-of-work (Slovak labels; stored in `job_offers.location`). */
export const FOREIGN_WORK_COUNTRY_OPTIONS = [
  { value: 'Rakúsko', label: 'Rakúsko' },
  { value: 'Nemecko', label: 'Nemecko' },
  { value: 'Česko', label: 'Česko' },
  { value: 'Maďarsko', label: 'Maďarsko' },
  { value: 'Poľsko', label: 'Poľsko' },
  { value: 'Švajčiarsko', label: 'Švajčiarsko' },
  { value: 'Taliansko', label: 'Taliansko' },
  { value: 'Holandsko', label: 'Holandsko' },
  { value: 'Belgicko', label: 'Belgicko' },
  { value: 'Francúzsko', label: 'Francúzsko' },
  { value: 'Španielsko', label: 'Španielsko' },
  { value: 'Portugalsko', label: 'Portugalsko' },
  { value: 'Írsko', label: 'Írsko' },
  { value: 'Spojené kráľovstvo', label: 'Spojené kráľovstvo' },
  { value: 'Dánsko', label: 'Dánsko' },
  { value: 'Švédsko', label: 'Švédsko' },
  { value: 'Nórsko', label: 'Nórsko' },
  { value: 'Fínsko', label: 'Fínsko' },
  { value: 'Island', label: 'Island' },
  { value: 'Estónsko', label: 'Estónsko' },
  { value: 'Lotyšsko', label: 'Lotyšsko' },
  { value: 'Litva', label: 'Litva' },
  { value: 'Rumunsko', label: 'Rumunsko' },
  { value: 'Bulharsko', label: 'Bulharsko' },
  { value: 'Chorvátsko', label: 'Chorvátsko' },
  { value: 'Slovinsko', label: 'Slovinsko' },
  { value: 'Srbsko', label: 'Srbsko' },
  { value: 'Bosna a Hercegovina', label: 'Bosna a Hercegovina' },
  { value: 'Severné Macedónsko', label: 'Severné Macedónsko' },
  { value: 'Albánsko', label: 'Albánsko' },
  { value: 'Grécko', label: 'Grécko' },
  { value: 'Cyprus', label: 'Cyprus' },
  { value: 'Malta', label: 'Malta' },
  { value: 'Luxembursko', label: 'Luxembursko' },
  { value: 'Ukrajina', label: 'Ukrajina' },
  { value: 'USA', label: 'USA' },
  { value: 'Kanada', label: 'Kanada' },
  { value: 'Austrália', label: 'Austrália' },
  { value: 'Nový Zéland', label: 'Nový Zéland' },
  { value: 'Izrael', label: 'Izrael' },
  { value: 'Spojené arabské emiráty', label: 'Spojené arabské emiráty' },
  { value: 'Turecko', label: 'Turecko' },
] as const

export type ForeignWorkCountryValue =
  (typeof FOREIGN_WORK_COUNTRY_OPTIONS)[number]['value']

const countryValues = new Set<string>(
  FOREIGN_WORK_COUNTRY_OPTIONS.map((o) => o.value),
)

export function isKnownForeignWorkCountry(value: string): boolean {
  return countryValues.has(value.trim())
}

export function foreignWorkCountryDropdownOptions(): Array<{
  value: string
  label: string
}> {
  return FOREIGN_WORK_COUNTRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
}

export function foreignWorkLocationFilterOptions(): Array<{
  value: string
  label: string
}> {
  return [{ value: '', label: 'Kdekoľvek' }, ...foreignWorkCountryDropdownOptions()]
}
