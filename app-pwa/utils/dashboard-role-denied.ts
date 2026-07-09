import { S } from '~/utils/strings'

export type SettingsProfilDeniedKey = 'customer' | 'provider' | 'worker' | 'company' | 'billing'

/** @deprecated Use {@link SettingsProfilDeniedKey} */
export type DashboardDeniedRole = Exclude<SettingsProfilDeniedKey, 'company'>

export const SETTINGS_PROFIL_PATH = '/nastavenia/profil'

export const ACCOUNT_ROLES_SECTION_ID = 'account-roles'

export const ACCOUNT_TYPE_SECTION_ID = 'account-type'

const ALLOWED_KEYS: SettingsProfilDeniedKey[] = [
  'customer',
  'provider',
  'worker',
  'company',
  'billing',
]

export function parseSettingsProfilDeniedKey(
  denied: string | string[] | null | undefined,
): SettingsProfilDeniedKey | null {
  const key = Array.isArray(denied) ? denied[0] : denied
  if (!key || !ALLOWED_KEYS.includes(key as SettingsProfilDeniedKey)) {
    return null
  }
  return key as SettingsProfilDeniedKey
}

export function resolveDashboardDeniedMessage(
  denied: string | string[] | null | undefined,
): string {
  const raw = parseSettingsProfilDeniedKey(denied)
  if (raw === 'company') {
    return S.dashboardRoleDeniedCompany
  }
  const key = normalizeSettingsProfilDeniedKey(denied)
  if (key === 'customer') {
    return S.dashboardRoleDeniedCustomer
  }
  if (key === 'provider') {
    return S.dashboardRoleDeniedProvider
  }
  if (key === 'worker') {
    return S.dashboardRoleDeniedWorker
  }
  if (key === 'billing') {
    return S.dashboardRoleDeniedBilling
  }
  if (key === 'company') {
    return S.dashboardRoleDeniedCompany
  }
  return ''
}

export function settingsProfilScrollTargetId(
  denied: SettingsProfilDeniedKey,
): string {
  if (denied === 'company') {
    return ACCOUNT_TYPE_SECTION_ID
  }
  return ACCOUNT_ROLES_SECTION_ID
}

/** Legacy query value `company` from old middleware — treat as customer activity denial. */
export function normalizeSettingsProfilDeniedKey(
  denied: string | string[] | null | undefined,
): SettingsProfilDeniedKey | null {
  const key = parseSettingsProfilDeniedKey(denied)
  if (key === 'company') {
    return 'customer'
  }
  return key
}

export function settingsProfilDeniedRoute(role: SettingsProfilDeniedKey): {
  path: string
  query: { dashboardDenied: SettingsProfilDeniedKey }
} {
  return {
    path: SETTINGS_PROFIL_PATH,
    query: { dashboardDenied: role },
  }
}
