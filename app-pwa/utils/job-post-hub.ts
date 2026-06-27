import type { Job } from '~/utils/job'

/** Draft passed from `/vytvorit-ponuku/novy` → wizard (avoids draft GET before session is ready). */
export const JOB_WIZARD_BOOTSTRAP_KEY = 'job-wizard-bootstrap'

export const RESERVED_JOB_WIZARD_SEGMENTS = new Set(['novy'])

export function useJobWizardBootstrap() {
  return useState<Job | null>(JOB_WIZARD_BOOTSTRAP_KEY, () => null)
}

export function isReservedJobWizardSegment(jobId: string): boolean {
  return RESERVED_JOB_WIZARD_SEGMENTS.has(jobId.trim().toLowerCase())
}

/** Pass hub/create row into wizard so first paint does not depend on for-edit GET. */
export function primeJobWizardBootstrap(job: Job): void {
  useJobWizardBootstrap().value = job
}
