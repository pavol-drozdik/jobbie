import type { SupabaseClient } from '@supabase/supabase-js'
import {
  mapSupabaseRecoveryExchangeError,
  mapSupabaseRecoveryVerifyError,
} from '~/utils/map-supabase-reset-error'
import { S } from '~/utils/strings'
import {
  readRecoveryHandoffFromRoute,
  stripRecoveryParamsFromUrl,
  type RecoveryHandoffParams,
} from '~/utils/auth-recovery'

export type BootstrapPasswordRecoveryResult =
  | { ok: true }
  | { ok: false; error: string }

const AUTO_DETECT_POLL_MS = 100
const AUTO_DETECT_MAX_WAIT_MS = 500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function hasAccessToken(session: { access_token?: string } | null | undefined): boolean {
  return Boolean(session?.access_token?.trim())
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

async function verifyRecoveryTokenHash(
  supabase: SupabaseClient,
  tokenHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  })
  if (error) {
    return {
      ok: false,
      error: mapSupabaseRecoveryVerifyError(error.code, error.message),
    }
  }
  return { ok: true }
}

async function exchangeRecoveryCode(
  supabase: SupabaseClient,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return {
      ok: false,
      error: mapSupabaseRecoveryExchangeError(error.code, error.message),
    }
  }
  return { ok: true }
}

/**
 * Establishes a Supabase recovery session from URL handoff (token_hash, PKCE code, or auto-detect).
 */
export async function bootstrapPasswordRecoverySession(
  supabase: SupabaseClient,
  handoff: RecoveryHandoffParams,
): Promise<BootstrapPasswordRecoveryResult> {
  const getSession = () => supabase.auth.getSession()

  let { data: sessionData } = await getSession()
  if (hasAccessToken(sessionData.session)) {
    stripRecoveryParamsFromUrl()
    return { ok: true }
  }

  if (handoff.tokenHash && handoff.type === 'recovery') {
    const verified = await verifyRecoveryTokenHash(supabase, handoff.tokenHash)
    if (!verified.ok) {
      return { ok: false, error: verified.error }
    }
    sessionData = (await getSession()).data
    if (hasAccessToken(sessionData.session)) {
      stripRecoveryParamsFromUrl()
      return { ok: true }
    }
  }

  if (await waitForAutoDetectedSession(getSession)) {
    stripRecoveryParamsFromUrl()
    return { ok: true }
  }

  if (handoff.code) {
    const exchanged = await exchangeRecoveryCode(supabase, handoff.code)
    if (!exchanged.ok) {
      return { ok: false, error: exchanged.error }
    }
    sessionData = (await getSession()).data
    if (hasAccessToken(sessionData.session)) {
      stripRecoveryParamsFromUrl()
      return { ok: true }
    }
  }

  return { ok: false, error: S.resetPasswordExpired }
}

export function readRecoveryHandoffForBootstrap(route?: {
  query?: Record<string, unknown>
}): RecoveryHandoffParams {
  return readRecoveryHandoffFromRoute(route)
}
