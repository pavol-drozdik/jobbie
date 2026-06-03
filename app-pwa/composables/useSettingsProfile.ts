import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'

export type SettingsMeProfile = {
  display_name?: string | null
  company_name?: string | null
  bio?: string | null
  skills?: string | null
  location?: string | null
  description?: string | null
  registered_office?: string | null
  website?: string | null
  avatar_url?: string | null
  logo_url?: string | null
  phone_e164?: string | null
  phone_verified_at?: string | null
  tax_id?: string | null
  vat_id?: string | null
  registration_number?: string | null
  sector?: string | null
  public_show_account_email?: boolean
  public_profile_enabled?: boolean
  public_show_phone?: boolean
  public_show_address?: boolean
  public_allow_platform_contact?: boolean
  public_show_in_company_search?: boolean
  marketing_processing_consent?: boolean
  billing_details?: Record<string, unknown>
  customer_role?: boolean
  worker_role?: boolean
  provider_role?: boolean
  credits?: number
  notification_preferences?: {
    v?: number
    categories?: Record<
      string,
      Partial<{ in_app: boolean; email: boolean; push: boolean; sms: boolean }>
    >
  } | null
}

export function useSettingsProfile() {
  const { api } = useApi()
  const { session, refreshUser } = useAuth()

  function hasApiSession(): boolean {
    return Boolean(resolveApiBearerToken(session.value)) || hasActiveBffSession()
  }

  const loading = ref(true)
  const loadError = ref<string | null>(null)
  const profile = ref<SettingsMeProfile | null>(null)

  async function load(): Promise<SettingsMeProfile | null> {
    if (!hasApiSession()) {
      loading.value = false
      return null
    }
    loading.value = true
    loadError.value = null
    try {
      const res = await api<SettingsMeProfile>('/api/profiles/me')
      if (!res.ok || !res.data) {
        loadError.value = 'Nepodarilo sa načítať profil.'
        profile.value = null
        return null
      }
      profile.value = res.data
      return res.data
    } finally {
      loading.value = false
    }
  }

  async function patch(
    body: Record<string, unknown>,
  ): Promise<{ ok: boolean; message?: string }> {
    if (!hasApiSession()) {
      return { ok: false, message: 'Prihláste sa.' }
    }
    const res = await api<SettingsMeProfile>('/api/profiles/me', {
      method: 'PATCH',
      body,
    })
    if (!res.ok) {
      const msg =
        typeof res.data === 'object' && res.data && 'message' in res.data
          ? String((res.data as { message?: string }).message)
          : res.body || 'Uloženie zlyhalo.'
      return { ok: false, message: msg }
    }
    profile.value = res.data ?? profile.value
    await refreshUser()
    return { ok: true }
  }

  function isValidUrl(raw: string): boolean {
    const t = raw.trim()
    if (!t) return true
    try {
      const u = new URL(t.includes('://') ? t : `https://${t}`)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  return { loading, loadError, profile, load, patch, isValidUrl }
}
