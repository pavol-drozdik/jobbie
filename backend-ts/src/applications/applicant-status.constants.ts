/** Canonical application statuses stored in `applications.status`. */
export const APPLICATION_STATUSES = [
  'pending',
  'reviewing',
  'interview_invited',
  'rejected',
  'accepted',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Initial status for new applications (display only; not employer picklist). */
export const APPLICATION_INITIAL_STATUS = 'pending' as const;

/** Employer workflow statuses via UI/API (not pending/reviewing/withdrawn). */
export const EMPLOYER_SETTABLE_STATUSES = [
  'accepted',
  'interview_invited',
  'rejected',
] as const;

export type EmployerSettableStatus = (typeof EMPLOYER_SETTABLE_STATUSES)[number];

export const AUTO_REPLY_STATUS_TYPES = ['rejected', 'interview_invited'] as const;

export type AutoReplyStatusType = (typeof AUTO_REPLY_STATUS_TYPES)[number];

export const STATUS_SK_LABELS: Record<ApplicationStatus, string> = {
  pending: 'Nový',
  reviewing: 'V posudzovaní',
  interview_invited: 'Pozvaný na pohovor',
  rejected: 'Zamietnutý',
  accepted: 'Prijatý',
  withdrawn: 'Stiahnuté kandidátom',
};

export function isEmployerSettableStatus(s: string): s is EmployerSettableStatus {
  return (EMPLOYER_SETTABLE_STATUSES as readonly string[]).includes(s);
}

export function isAutoReplyStatus(s: string): s is AutoReplyStatusType {
  return (AUTO_REPLY_STATUS_TYPES as readonly string[]).includes(s);
}
