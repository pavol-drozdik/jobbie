/** Default stats dashboard when user has one or both insight roles. */
export function resolveProfileStatsDashboardPath(profile: {
  customer_role?: boolean
  provider_role?: boolean
} | null | undefined): '/dashboard/zakaznik' | '/dashboard/profesional' {
  if (profile?.provider_role && !profile.customer_role) {
    return '/dashboard/profesional'
  }
  return '/dashboard/zakaznik'
}

export function hasProfileStatsAccess(profile: {
  customer_role?: boolean
  provider_role?: boolean
} | null | undefined): boolean {
  return Boolean(profile?.customer_role || profile?.provider_role)
}
