import type { SupabaseClient } from '@supabase/supabase-js'

const AUTO_DETECT_POLL_MS = 100
const AUTO_DETECT_MAX_WAIT_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasAccessToken(session: { access_token?: string } | null | undefined): boolean {
  return Boolean(session?.access_token?.trim())
}

function isPkceVerifierMissingError(code?: string | null, message?: string | null): boolean {
  const normalizedCode = (code ?? '').trim().toLowerCase()
  const msg = (message ?? '').toLowerCase()
  return (
    normalizedCode === 'pkce_code_verifier_missing' ||
    msg.includes('pkce code verifier not found')
  )
}

async function waitForAutoDetectedSession(
  getSession: () => Promise<{ data: { session: { access_token?: string } | null } }>,
): Promise<boolean> {
  const deadline = Date.now() + AUTO_DETECT_MAX_WAIT_MS
  while (Date.now() < deadline) {
    const { data } = await getSession()
    if (hasAccessToken(data.session)) {
      return true
    }
    await sleep(AUTO_DETECT_POLL_MS)
  }
  return false
}

/** Exchange OAuth PKCE code when detectSessionInUrl has not already established a session. */
export async function establishOAuthCallbackSession(
  supabase: SupabaseClient,
  code: string,
): Promise<{ ok: true } | { ok: false; code?: string; message?: string }> {
  const getSession = () => supabase.auth.getSession()

  const { data: existing } = await getSession()
  if (hasAccessToken(existing.session)) {
    return { ok: true }
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) {
    return { ok: true }
  }

  if (isPkceVerifierMissingError(error.code, error.message)) {
    if (await waitForAutoDetectedSession(getSession)) {
      return { ok: true }
    }
  }

  return {
    ok: false,
    code: error.code,
    message: error.message?.trim() || undefined,
  }
}
