export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'interview_invited'
  | 'rejected'
  | 'accepted'
  | 'withdrawn'

export const APPLICANT_STATUS_TABS: Array<{
  id: 'all' | ApplicationStatus
  label: string
}> = [
  { id: 'all', label: 'Všetci' },
  { id: 'pending', label: 'Noví' },
  { id: 'reviewing', label: 'V posudzovaní' },
  { id: 'interview_invited', label: 'Pozvať na pohovor' },
  { id: 'rejected', label: 'Zamietnutí' },
  { id: 'accepted', label: 'Prijatí' },
  { id: 'withdrawn', label: 'Stiahnuté' },
]

/** Filter tabs on employer applicant list (short labels; excludes withdrawn). */
export const APPLICANT_LIST_STATUS_TABS: Array<{
  id: 'all' | ApplicationStatus
  label: string
}> = [
  { id: 'all', label: 'Všetci' },
  { id: 'pending', label: 'Noví' },
  { id: 'reviewing', label: 'Posudzovanie' },
  { id: 'interview_invited', label: 'Pohovor' },
  { id: 'rejected', label: 'Zamietnutí' },
  { id: 'accepted', label: 'Prijatí' },
]

export const STATUS_SK_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Nový',
  reviewing: 'V posudzovaní',
  interview_invited: 'Pozvaný na pohovor',
  rejected: 'Zamietnutý',
  accepted: 'Prijatý',
  withdrawn: 'Stiahnuté kandidátom',
}

/** Initial status for new applications (badge only — not in status dropdown). */
export const APPLICATION_INITIAL_STATUS: ApplicationStatus = 'pending'

/** Employer workflow statuses selectable in dropdown / API patch. */
export const EMPLOYER_STATUS_DROPDOWN_STATUSES = [
  'accepted',
  'interview_invited',
  'rejected',
] as const satisfies readonly ApplicationStatus[]

export type EmployerSettableStatus = (typeof EMPLOYER_STATUS_DROPDOWN_STATUSES)[number]

/** @deprecated use EMPLOYER_STATUS_DROPDOWN_STATUSES */
export const EMPLOYER_SETTABLE_STATUSES: ApplicationStatus[] = [
  ...EMPLOYER_STATUS_DROPDOWN_STATUSES,
]

export function isEmployerStatusPicklistValue(status: string): status is EmployerSettableStatus {
  return (EMPLOYER_STATUS_DROPDOWN_STATUSES as readonly string[]).includes(status)
}

/** Empty when status is initial/legacy — dropdown shows placeholder only. */
export function employerStatusPicklistValue(status: string): string {
  return isEmployerStatusPicklistValue(status) ? status : ''
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-100 text-blue-800'
    case 'reviewing':
      return 'bg-amber-100 text-amber-900'
    case 'interview_invited':
      return 'bg-marketing-green/20 text-marketing-green'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    case 'accepted':
      return 'bg-emerald-100 text-emerald-900'
    case 'withdrawn':
      return 'bg-black/10 text-black/50'
    default:
      return 'bg-black/10 text-black/60'
  }
}
