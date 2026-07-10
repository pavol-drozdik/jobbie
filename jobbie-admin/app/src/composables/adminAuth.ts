import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computed, ref } from 'vue'
import { ADMIN_API_BASE_URL } from '../config/admin-api-url'
import { parseAdminLoginApiError } from '../utils/map-admin-login-error'

const ACCESS_STORAGE_KEY = 'jb_admin_access_token'
const REFRESH_STORAGE_KEY = 'jb_admin_refresh_token'

const accessToken = ref<string | null>(null)
const authError = ref<string | null>(null)
const lastAuthErrorCode = ref<string | null>(null)
const loading = ref(false)

let supabase: SupabaseClient | null = null

const adminApiBase = ADMIN_API_BASE_URL

function getSupabaseOptional(): SupabaseClient | null {
  if (supabase) return supabase
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  supabase = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return supabase
}

function persistTokens(access: string, refresh: string): void {
  try {
    sessionStorage.setItem(ACCESS_STORAGE_KEY, access)
    sessionStorage.setItem(REFRESH_STORAGE_KEY, refresh)
  } catch {
    /* private mode */
  }
}

function clearPersistedTokens(): void {
  try {
    sessionStorage.removeItem(ACCESS_STORAGE_KEY)
    sessionStorage.removeItem(REFRESH_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

async function syncToken(): Promise<void> {
  if (accessToken.value) return
  const stored = sessionStorage.getItem(ACCESS_STORAGE_KEY)
  if (stored) {
    accessToken.value = stored
    const client = getSupabaseOptional()
    const refresh = sessionStorage.getItem(REFRESH_STORAGE_KEY)
    if (client && refresh) {
      await client.auth.setSession({
        access_token: stored,
        refresh_token: refresh,
      })
    }
    return
  }
  const client = getSupabaseOptional()
  if (!client) return
  const { data } = await client.auth.getSession()
  accessToken.value = data.session?.access_token ?? null
}

export function useAdminAuth() {
  const isAuthenticated = computed(() => !!accessToken.value)

  async function init(): Promise<void> {
    await syncToken()
    const client = getSupabaseOptional()
    client?.auth.onAuthStateChange(() => {
      void syncToken()
    })
  }

  async function signIn(
    email: string,
    password: string,
  ): Promise<boolean> {
    loading.value = true
    authError.value = null
    lastAuthErrorCode.value = null
    try {
      let res: Response
      try {
        res = await fetch(`${adminApiBase}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (import.meta.env.DEV) {
          console.warn('[admin-auth] login fetch failed', msg)
        }
        const { message, code } = parseAdminLoginApiError(0, msg)
        authError.value = message
        lastAuthErrorCode.value = code
        return false
      }

      const text = await res.text()
      if (!res.ok) {
        if (import.meta.env.DEV) {
          console.warn('[admin-auth] signIn failed', res.status, text)
        }
        const { message, code } = parseAdminLoginApiError(res.status, text)
        authError.value = message
        lastAuthErrorCode.value = code
        return false
      }

      const data = JSON.parse(text) as {
        access_token?: string
        refresh_token?: string
      }
      if (!data.access_token || !data.refresh_token) {
        authError.value = 'Prihlásenie nevrátilo platnú reláciu.'
        return false
      }

      accessToken.value = data.access_token
      persistTokens(data.access_token, data.refresh_token)

      const client = getSupabaseOptional()
      if (client) {
        await client.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        })
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (import.meta.env.DEV) {
        console.warn('[admin-auth] signIn unexpected', msg)
      }
      authError.value = parseAdminLoginApiError(0, msg).message
      return false
    } finally {
      loading.value = false
    }
  }

  async function signOut(): Promise<void> {
    clearPersistedTokens()
    accessToken.value = null
    const client = getSupabaseOptional()
    if (client) {
      await client.auth.signOut()
    }
  }

  function getAccessToken(): string | null {
    return accessToken.value
  }

  return {
    loading,
    authError,
    lastAuthErrorCode,
    isAuthenticated,
    init,
    signIn,
    signOut,
    getAccessToken,
  }
}
