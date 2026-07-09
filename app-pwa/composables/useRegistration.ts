export type AccountType = 'individual' | 'company'

export type RegistrationCredentials = {
  accountType: AccountType
  email: string
  password: string
  termsAgree: boolean
  firstName: string
  lastName: string
  companyName: string
  registeredOffice: string
  ico: string
  dic: string
  vatId: string
  /** ISO date string (YYYY-MM-DD), individual only — stored in auth metadata. */
  birthDate?: string
  /** Company profile handle — stored in auth metadata. */
  companyProfileUsername?: string
  /** Optional signup promo code (stored in auth metadata for email-confirm path). */
  promoCode?: string
}

export type RegistrationRoles = {
  customer_role: boolean
  worker_role: boolean
  provider_role: boolean
}

export type RegistrationPreferences = {
  job_interests: string | null
  location: string | null
  sector: string | null
}

export function buildRegistrationSignUpMeta(
  creds: RegistrationCredentials | null,
  prefs?: RegistrationPreferences | null,
  roleData?: RegistrationRoles | null,
): Record<string, string> {
  const meta: Record<string, string> = {}
  if (!creds) return meta
  meta.role = creds.accountType
  if (creds.accountType === 'individual') {
    meta.first_name = creds.firstName.trim()
    meta.last_name = creds.lastName.trim()
    meta.display_name = `${creds.firstName.trim()} ${creds.lastName.trim()}`.trim()
    if (creds.birthDate?.trim()) meta.birth_date = creds.birthDate.trim()
  } else {
    meta.company_name = creds.companyName.trim()
    meta.registered_office = creds.registeredOffice.trim()
    meta.ico = creds.ico.trim()
    meta.dic = creds.dic.trim()
    if (creds.vatId.trim()) meta.ic_dph = creds.vatId.trim()
    if (creds.companyProfileUsername?.trim())
      meta.profile_username = creds.companyProfileUsername.trim()
  }
  if (prefs) {
    if (prefs.job_interests != null && prefs.job_interests !== '')
      meta.job_interests = prefs.job_interests
    if (prefs.location != null && prefs.location !== '') meta.location = prefs.location
    if (prefs.sector != null && prefs.sector !== '') meta.sector = prefs.sector
  }
  if (roleData) {
    meta.customer_role = roleData.customer_role ? 'true' : 'false'
    meta.worker_role = roleData.worker_role ? 'true' : 'false'
    meta.provider_role = roleData.provider_role ? 'true' : 'false'
  }
  if (creds.promoCode?.trim()) {
    meta.registration_promo_code = creds.promoCode.trim()
  }
  return meta
}

// Multi-step signup wizard state survives route changes until welcome/clear.
export function useRegistration() {
  const credentials = useState<RegistrationCredentials | null>('reg-credentials', () => null)
  const roles = useState<RegistrationRoles | null>('reg-roles', () => null)
  const preferences = useState<RegistrationPreferences | null>('reg-preferences', () => null)

  function setCredentials(c: RegistrationCredentials) {
    credentials.value = c
  }

  function setRoles(r: RegistrationRoles) {
    roles.value = r
  }

  function setPreferences(p: RegistrationPreferences) {
    preferences.value = p
  }

  function getMetaForSignUp(
    preferencesOverride?: RegistrationPreferences | null,
    credentialsOverride?: RegistrationCredentials | null,
    rolesOverride?: RegistrationRoles | null
  ): Record<string, string> {
    return buildRegistrationSignUpMeta(
      credentialsOverride ?? credentials.value,
      preferencesOverride ?? preferences.value,
      rolesOverride ?? roles.value,
    )
  }

  function clear() {
    credentials.value = null
    roles.value = null
    preferences.value = null
  }

  return {
    credentials,
    roles,
    preferences,
    setCredentials,
    setRoles,
    setPreferences,
    getMetaForSignUp,
    clear,
  }
}
