import type { ApplicantStatusCounts, EmployerApplicantRow } from '~/types/employer-applicants'
import type { EmployerSettableStatus } from '~/utils/applicant-status'

export type ApplicantStatusLocalUpdate = {
  applicationId: string
  oldStatus: string
  newStatus: EmployerSettableStatus
}

const COUNT_KEYS: Array<keyof ApplicantStatusCounts> = [
  'pending',
  'reviewing',
  'interview_invited',
  'rejected',
  'accepted',
  'withdrawn',
]

function isCountKey(status: string): status is keyof ApplicantStatusCounts {
  return COUNT_KEYS.includes(status as keyof ApplicantStatusCounts)
}

export function applyApplicantStatusLocally(
  applicants: EmployerApplicantRow[],
  statusCounts: ApplicantStatusCounts | null,
  updates: ApplicantStatusLocalUpdate[],
  activeTab: string,
): { applicants: EmployerApplicantRow[]; statusCounts: ApplicantStatusCounts | null } {
  if (!updates.length) {
    return { applicants, statusCounts }
  }
  const updateById = new Map(updates.map((u) => [u.applicationId, u]))
  let nextApplicants = applicants.map((row) => {
    const hit = updateById.get(row.application_id)
    if (!hit) return row
    return { ...row, status: hit.newStatus }
  })
  if (activeTab !== 'all') {
    nextApplicants = nextApplicants.filter((row) => {
      const hit = updateById.get(row.application_id)
      if (!hit) return true
      return hit.newStatus === activeTab
    })
  }
  if (!statusCounts) {
    return { applicants: nextApplicants, statusCounts }
  }
  const nextCounts = { ...statusCounts }
  for (const { oldStatus, newStatus } of updates) {
    if (oldStatus === newStatus) continue
    if (isCountKey(oldStatus)) {
      nextCounts[oldStatus] = Math.max(0, nextCounts[oldStatus] - 1)
    }
    if (isCountKey(newStatus)) {
      nextCounts[newStatus] = nextCounts[newStatus] + 1
    }
  }
  return { applicants: nextApplicants, statusCounts: nextCounts }
}

export function snapshotApplicantStatuses(
  applicants: EmployerApplicantRow[],
  applicationIds: string[],
): ApplicantStatusLocalUpdate[] {
  const idSet = new Set(applicationIds)
  return applicants
    .filter((row) => idSet.has(row.application_id))
    .map((row) => ({
      applicationId: row.application_id,
      oldStatus: row.status,
      newStatus: row.status as EmployerSettableStatus,
    }))
}

export function withNewStatus(
  snapshots: ApplicantStatusLocalUpdate[],
  newStatus: EmployerSettableStatus,
): ApplicantStatusLocalUpdate[] {
  return snapshots.map((s) => ({ ...s, newStatus }))
}
