import type { Job } from '~/utils/job'

export type JobListingStatus = 'draft' | 'published' | 'paused' | 'expired' | 'archived'

/** Matches backend `isJobListingLiveForTop` / publish charge guards. */
export function isJobListingPubliclyLive(
  job: Pick<Job, 'is_active' | 'is_draft'>,
): boolean {
  return job.is_active === true && job.is_draft !== true
}

export function deriveJobListingStatus(job: Pick<Job, 'is_draft' | 'is_active' | 'expires_at'>): JobListingStatus {
  if (job.is_draft) return 'draft'
  const expiresAt = job.expires_at ? new Date(job.expires_at).getTime() : null
  if (expiresAt != null && expiresAt <= Date.now()) return 'expired'
  if (job.is_active) return 'published'
  return 'paused'
}

export const JOB_LISTING_STATUS_LABELS: Record<JobListingStatus, string> = {
  draft: 'Koncept',
  published: 'Zverejnené',
  paused: 'Pozastavené',
  expired: 'Expirované',
  archived: 'Archivované',
}

export function jobListingStatusLabel(job: Pick<Job, 'is_draft' | 'is_active' | 'expires_at'>): string {
  return JOB_LISTING_STATUS_LABELS[deriveJobListingStatus(job)]
}
