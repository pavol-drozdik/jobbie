import type { SupabaseClient } from '@supabase/supabase-js'
import { setAuthSessionAccessToken } from '~/utils/auth-session-state'
import { formatMfaAuthError } from '~/utils/mfa-auth-errors'

export type TotpFactorRow = {
  id?: string
  factor_type?: string
  status?: string
}

export type MfaListFactorsData = {
  all?: TotpFactorRow[]
  totp?: TotpFactorRow[]
}

export function collectMfaFactors(data: MfaListFactorsData | null | undefined): TotpFactorRow[] {
  if (!data) return []
  if (Array.isArray(data.all) && data.all.length > 0) return data.all
  if (Array.isArray(data.totp) && data.totp.length > 0) return data.totp
  return data.all ?? data.totp ?? []
}

export function findTotpFactor(
  factors: TotpFactorRow[],
  status: 'verified' | 'unverified',
): TotpFactorRow | undefined {
  return factors.find(
    (f) => String(f.factor_type ?? '').toLowerCase() === 'totp' && f.status === status,
  )
}

async function syncClientSessionFromSupabase(supabase: SupabaseClient): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const access = data.session?.access_token?.trim()
  if (access) {
    setAuthSessionAccessToken(access)
  }
}

/**
 * Elevate the Supabase session to AAL2 using challenge + verify (GoTrue-compatible).
 * For unenroll, always pass `requireFreshVerify: true` so a stale AAL2 JWT cannot skip verification.
 */
export async function elevateToAal2WithTotpCode(
  supabase: SupabaseClient,
  factorId: string,
  code: string,
  options?: { requireFreshVerify?: boolean },
): Promise<string | null> {
  const normalized = code.replace(/\s/g, '')
  if (normalized.length < 6) {
    return 'Zadajte 6-miestny kód z autentifikačnej aplikácie.'
  }
  if (!options?.requireFreshVerify) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel === 'aal2') {
      return null
    }
  }
  const challenge = await supabase.auth.mfa.challenge({ factorId })
  if (challenge.error || !challenge.data?.id) {
    return formatMfaAuthError(challenge.error?.message) ?? 'Výzva MFA zlyhala.'
  }
  const verify = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.data.id,
    code: normalized,
  })
  if (verify.error) {
    return formatMfaAuthError(verify.error.message)
  }
  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    return formatMfaAuthError(refreshError.message)
  }
  await syncClientSessionFromSupabase(supabase)
  const { data: aalAfter } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalAfter?.currentLevel !== 'aal2') {
    return 'Overenie dvojfaktorového kódu sa nepodarilo. Skúste znova.'
  }
  return null
}

/** @deprecated Use elevateToAal2WithTotpCode */
export const ensureMfaAal2WithTotp = elevateToAal2WithTotpCode
