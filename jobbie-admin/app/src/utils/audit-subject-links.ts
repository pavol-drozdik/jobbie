import { DEFAULT_PWA_PUBLIC_URL } from './pwa-public-url'

export function auditSubjectPublicUrl(
  subjectType: string | null,
  subjectId: string | null,
  base = DEFAULT_PWA_PUBLIC_URL,
): string | null {
  if (!subjectType || !subjectId) return null
  const b = base.replace(/\/$/, '')
  switch (subjectType) {
    case 'job_offer':
      return `${b}/app/jobs/${subjectId}`
    case 'profile':
    case 'company_profile':
      return `${b}/profil/${subjectId}`
    case 'company_ad':
      return `${b}/profesionali/${subjectId}`
    default:
      return null
  }
}

export function auditSubjectUsersRoute(subjectId: string | null): string | null {
  if (!subjectId) return null
  return `/users?id=${encodeURIComponent(subjectId)}`
}
