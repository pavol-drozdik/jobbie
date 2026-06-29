const OAUTH_SIGNUP_PENDING_KEY = 'jobbie:oauth-signup-pending'

export type OAuthSignupPending = {
  meta: Record<string, string>
  newsletterSubscribe?: boolean
}

export function saveOAuthSignupPending(payload: OAuthSignupPending): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(OAUTH_SIGNUP_PENDING_KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

export function readOAuthSignupPending(): OAuthSignupPending | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(OAUTH_SIGNUP_PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OAuthSignupPending
    if (!parsed?.meta || typeof parsed.meta !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function clearOAuthSignupPending(): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(OAUTH_SIGNUP_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

/** Build Nest PATCH body from Supabase signup metadata (OAuth registration wizard). */
export function buildProfilePatchFromSignupMeta(
  meta: Record<string, string>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  const role = meta.role === 'company' ? 'company' : 'individual'

  if (role === 'individual') {
    const first = meta.first_name?.trim() ?? ''
    const last = meta.last_name?.trim() ?? ''
    const display = meta.display_name?.trim() || `${first} ${last}`.trim()
    if (display) patch.display_name = display
    if (first) patch.first_name = first
    if (last) patch.last_name = last
  } else {
    if (meta.company_name?.trim()) patch.company_name = meta.company_name.trim()
    if (meta.registered_office?.trim()) patch.registered_office = meta.registered_office.trim()
    if (meta.ico?.trim()) patch.registration_number = meta.ico.trim()
    if (meta.dic?.trim()) patch.tax_id = meta.dic.trim()
    if (meta.ic_dph?.trim()) patch.vat_id = meta.ic_dph.trim()
  }

  if (meta.job_interests?.trim()) patch.job_interests = meta.job_interests.trim()
  if (meta.location?.trim()) patch.location = meta.location.trim()
  if (meta.sector?.trim()) patch.sector = meta.sector.trim()

  if (meta.customer_role === 'true' || meta.customer_role === 'false') {
    patch.customer_role = meta.customer_role === 'true'
  }
  if (meta.worker_role === 'true' || meta.worker_role === 'false') {
    patch.worker_role = meta.worker_role === 'true'
  }
  if (meta.provider_role === 'true' || meta.provider_role === 'false') {
    patch.provider_role = meta.provider_role === 'true'
  }

  return patch
}
