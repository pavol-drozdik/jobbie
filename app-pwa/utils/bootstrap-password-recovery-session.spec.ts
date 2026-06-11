import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  bootstrapPasswordRecoverySession,
} from '~/utils/bootstrap-password-recovery-session'
import { S } from '~/utils/strings'

function createSupabaseMock(opts: {
  initialSession?: { access_token?: string } | null
  verifyOtpError?: { code: string; message: string }
  exchangeError?: { code: string; message: string }
  afterVerifySession?: { access_token?: string } | null
  afterExchangeSession?: { access_token?: string } | null
}) {
  let session = opts.initialSession ?? null
  return {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      verifyOtp: vi.fn(async () => {
        if (opts.verifyOtpError) {
          return { error: opts.verifyOtpError, data: { session: null, user: null } }
        }
        session = opts.afterVerifySession ?? { access_token: 'verified-token' }
        return { error: null, data: { session, user: null } }
      }),
      exchangeCodeForSession: vi.fn(async () => {
        if (opts.exchangeError) {
          return { error: opts.exchangeError, data: { session: null } }
        }
        session = opts.afterExchangeSession ?? { access_token: 'exchanged-token' }
        return { error: null, data: { session } }
      }),
    },
  }
}

describe('bootstrapPasswordRecoverySession', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { href: 'http://localhost:3001/auth/reset-password?token_hash=abc&type=recovery' },
      history: { replaceState: vi.fn() },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok when session already exists', async () => {
    const supabase = createSupabaseMock({
      initialSession: { access_token: 'existing' },
    })
    const result = await bootstrapPasswordRecoverySession(
      supabase as never,
      {},
    )
    expect(result).toEqual({ ok: true })
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('prefers verifyOtp when token_hash is present', async () => {
    const supabase = createSupabaseMock({ initialSession: null })
    const result = await bootstrapPasswordRecoverySession(
      supabase as never,
      { tokenHash: 'hash123', type: 'recovery' },
    )
    expect(result).toEqual({ ok: true })
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      type: 'recovery',
      token_hash: 'hash123',
    })
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('falls back to exchangeCodeForSession when only code is present', async () => {
    const supabase = createSupabaseMock({ initialSession: null })
    const result = await bootstrapPasswordRecoverySession(
      supabase as never,
      { code: 'pkce-code' },
    )
    expect(result).toEqual({ ok: true })
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code')
  })

  it('returns expired message when verifyOtp fails', async () => {
    const supabase = createSupabaseMock({
      initialSession: null,
      verifyOtpError: { code: 'otp_expired', message: 'expired' },
    })
    const result = await bootstrapPasswordRecoverySession(
      supabase as never,
      { tokenHash: 'hash123', type: 'recovery' },
    )
    expect(result).toEqual({ ok: false, error: S.resetPasswordExpired })
  })

  it('returns pkce verifier message when code exchange lacks verifier', async () => {
    const supabase = createSupabaseMock({
      initialSession: null,
      exchangeError: {
        code: 'pkce_code_verifier_missing',
        message: 'PKCE code verifier not found in storage.',
      },
    })
    const result = await bootstrapPasswordRecoverySession(
      supabase as never,
      { code: 'pkce-code' },
    )
    expect(result).toEqual({ ok: false, error: S.resetPasswordPkceVerifierMissing })
  })
})
