import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { computed, ref } from 'vue'

const accessToken = ref<string | null>(null)
const authError = ref<string | null>(null)
const loading = ref(false)

let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!supabase) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    }
    supabase = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  }
  return supabase
}

async function syncToken(): Promise<void> {
  const client = getSupabase()
  const { data } = await client.auth.getSession()
  accessToken.value = data.session?.access_token ?? null
}

export function useAdminAuth() {
  const isAuthenticated = computed(() => !!accessToken.value)

  async function init(): Promise<void> {
    await syncToken()
    getSupabase().auth.onAuthStateChange(() => {
      void syncToken()
    })
  }

  async function signIn(email: string, password: string): Promise<boolean> {
    loading.value = true
    authError.value = null
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    loading.value = false
    if (error) {
      authError.value = 'Prihlásenie zlyhalo.'
      return false
    }
    await syncToken()
    return true
  }

  async function signOut(): Promise<void> {
    await getSupabase().auth.signOut()
    accessToken.value = null
  }

  async function ensureMfa(): Promise<{ ok: boolean; needsVerify: boolean }> {
    const client = getSupabase()
    const { data: aal, error: aalErr } =
      await client.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalErr) {
      authError.value = aalErr.message
      return { ok: false, needsVerify: false }
    }
    if (aal.currentLevel === 'aal2') {
      await syncToken()
      return { ok: true, needsVerify: false }
    }
    const { data: factors } = await client.auth.mfa.listFactors()
    const totp = factors?.totp?.find((f) => f.status === 'verified')
    if (!totp) {
      authError.value =
        'Účet nemá overené TOTP MFA. Nastavte ho v Supabase / hlavnej aplikácii.'
      return { ok: false, needsVerify: false }
    }
    return { ok: false, needsVerify: true }
  }

  async function verifyTotp(code: string): Promise<boolean> {
    const client = getSupabase()
    const { data: factors } = await client.auth.mfa.listFactors()
    const totp = factors?.totp?.find((f) => f.status === 'verified')
    if (!totp) {
      authError.value = 'Chýba TOTP faktor.'
      return false
    }
    const { data: challenge, error: chErr } = await client.auth.mfa.challenge({
      factorId: totp.id,
    })
    if (chErr || !challenge) {
      authError.value = chErr?.message ?? 'MFA challenge failed'
      return false
    }
    const { error } = await client.auth.mfa.verify({
      factorId: totp.id,
      challengeId: challenge.id,
      code: code.trim(),
    })
    if (error) {
      authError.value = 'Neplatný kód.'
      return false
    }
    await client.auth.refreshSession()
    await syncToken()
    authError.value = null
    return true
  }

  function getAccessToken(): string | null {
    return accessToken.value
  }

  return {
    loading,
    authError,
    isAuthenticated,
    init,
    signIn,
    signOut,
    ensureMfa,
    verifyTotp,
    getAccessToken,
  }
}
