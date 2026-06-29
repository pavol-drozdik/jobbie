import { describe, expect, it, vi } from 'vitest'
import { establishOAuthCallbackSession } from '~/utils/oauth-callback-session'

function createSupabaseMock(handlers: {
  getSession: () => Promise<{ data: { session: { access_token?: string } | null } }>
  exchangeCodeForSession: (code: string) => Promise<{ error: { code?: string; message?: string } | null }>
}) {
  return {
    auth: {
      getSession: vi.fn(handlers.getSession),
      exchangeCodeForSession: vi.fn(handlers.exchangeCodeForSession),
    },
  }
}

describe('establishOAuthCallbackSession', () => {
  it('skips exchange when session already exists', async () => {
    const supabase = createSupabaseMock({
      getSession: async () => ({ data: { session: { access_token: 'at' } } }),
      exchangeCodeForSession: async () => ({ error: null }),
    })

    const result = await establishOAuthCallbackSession(supabase as never, 'code-1')
    expect(result).toEqual({ ok: true })
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('exchanges code when no session exists', async () => {
    const supabase = createSupabaseMock({
      getSession: async () => ({ data: { session: null } }),
      exchangeCodeForSession: async () => ({ error: null }),
    })

    const result = await establishOAuthCallbackSession(supabase as never, 'code-2')
    expect(result).toEqual({ ok: true })
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('code-2')
  })

  it('recovers when pkce verifier missing but auto-detect established session', async () => {
    let calls = 0
    const supabase = createSupabaseMock({
      getSession: async () => {
        calls += 1
        if (calls === 1) {
          return { data: { session: null } }
        }
        return { data: { session: { access_token: 'at' } } }
      },
      exchangeCodeForSession: async () => ({
        error: {
          code: 'pkce_code_verifier_missing',
          message: 'PKCE code verifier not found in storage.',
        },
      }),
    })

    const result = await establishOAuthCallbackSession(supabase as never, 'code-3')
    expect(result).toEqual({ ok: true })
  })
})
