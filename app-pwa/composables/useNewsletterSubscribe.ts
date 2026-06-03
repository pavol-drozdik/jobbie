export type NewsletterSubscribePhase = 'idle' | 'loading' | 'success' | 'error'

/**
 * POST /api/subscribe (public). Backend returns 201 with `{ ok: true }` when the row is saved;
 * MailerLite failures are not exposed as HTTP errors.
 */
export function useNewsletterSubscribe() {
  const phase = ref<NewsletterSubscribePhase>('idle')
  const { api } = useApi()

  async function submit(params: {
    email: string
    name?: string
    consent: boolean
  }): Promise<boolean> {
    const email = params.email.trim()
    if (!params.consent) {
      phase.value = 'idle'
      return false
    }
    if (!email) {
      phase.value = 'error'
      return false
    }
    phase.value = 'loading'
    const body: { email: string; consent: true; name?: string } = {
      email,
      consent: true,
    }
    const nameTrim = params.name?.trim()
    if (nameTrim) {
      body.name = nameTrim.slice(0, 200)
    }
    const res = await api<{ ok?: boolean }>('/api/subscribe', {
      method: 'POST',
      body,
    })
    const okPayload =
      res.ok &&
      res.data &&
      typeof res.data === 'object' &&
      'ok' in res.data &&
      res.data.ok === true
    if (okPayload) {
      phase.value = 'success'
      return true
    }
    phase.value = 'error'
    return false
  }

  function resetPhase(): void {
    phase.value = 'idle'
  }

  return { phase, submit, resetPhase }
}
