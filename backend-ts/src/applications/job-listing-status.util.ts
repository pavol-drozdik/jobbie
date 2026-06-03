/** Derived listing status for employer job hub filters (not stored on job_offers). */
export type JobListingStatus =
  | 'draft'
  | 'published'
  | 'paused'
  | 'expired'
  | 'archived';

export type JobRowForListingStatus = {
  is_draft: boolean;
  is_active: boolean;
  expires_at: string | null;
};

export function deriveJobListingStatus(job: JobRowForListingStatus): JobListingStatus {
  if (job.is_draft) return 'draft';
  const expiresAt = job.expires_at ? new Date(job.expires_at).getTime() : null;
  const expired = expiresAt != null && expiresAt <= Date.now();
  if (expired) return 'expired';
  if (job.is_active) return 'published';
  return 'paused';
}

/** v1: archived = paused (inactive, non-draft, not expired). */
export function matchesJobListingFilter(
  job: JobRowForListingStatus,
  filter: string | undefined,
): boolean {
  if (!filter || filter === 'all') return true;
  const status = deriveJobListingStatus(job);
  if (filter === 'archived') return status === 'paused';
  return status === filter;
}
