/**
 * Application window on job listings (`job_offers.application_deadline`).
 */
export function isApplicationDeadlinePassed(
  applicationDeadline: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (applicationDeadline == null || applicationDeadline === '') {
    return false;
  }
  const end = new Date(String(applicationDeadline));
  if (!Number.isFinite(end.getTime())) {
    return false;
  }
  return end.getTime() <= now.getTime();
}
