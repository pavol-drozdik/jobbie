/**
 * UI-only permission hints. Backend must enforce all authorization.
 */
export type CanAction =
  | 'job.publish'
  | 'job.edit'
  | 'companyAd.publish'
  | 'companyAd.edit'
  | 'billing.manage'
  | 'credits.buy'
  | 'cvDatabase.view'
  | 'applicants.manage'

export function useCan() {
  const { user, profile, isProvider } = useAuth()

  function can(action: CanAction): boolean {
    if (!user.value) return false
    const role = profile.value?.role ?? user.value.role
    const scopes = user.value.permissionScopes ?? []

    switch (action) {
      case 'job.publish':
      case 'job.edit':
        return role === 'company'
      case 'companyAd.publish':
      case 'companyAd.edit':
        return isProvider.value || role === 'company'
      case 'billing.manage':
      case 'credits.buy':
        return role === 'company'
      case 'cvDatabase.view':
      case 'applicants.manage':
        return role === 'company'
      default:
        return false
    }
  }

  return { can }
}
