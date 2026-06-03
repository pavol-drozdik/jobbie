/**
 * Batched client-side UI events (nav, click, form submit) for compliance telemetry.
 * Enable with NUXT_PUBLIC_AUDIT_CLIENT_EVENTS=1.
 * Optional NUXT_PUBLIC_AUDIT_CLIENT_SAMPLE_RATE (0..1, default 0.4).
 */
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'
import { getOrCreateAnalyticsSessionId } from '~/utils/analytics-session-id'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return
  }
  const config = useRuntimeConfig().public
  if (String(config.auditClientEvents) !== '1') {
    return
  }
  if (!isAnalyticsConsentGranted()) {
    return
  }
  const { user } = useAuth()
  const { api } = useApi()
  const batch: Array<{
    type: string
    path?: string
    target?: string
    ts: string
    session_id: string
  }> = []
  let timer: ReturnType<typeof setTimeout> | null = null
  const sampleRaw = String(config.auditClientSampleRate ?? '').trim()
  const sample =
    sampleRaw === ''
      ? 0.4
      : Math.min(1, Math.max(0, Number(sampleRaw) || 0.4))
  const analyticsSessionId = getOrCreateAnalyticsSessionId()
  const flush = async () => {
    if (batch.length === 0 || !user.value) {
      return
    }
    const toSend = batch.splice(0, batch.length)
    try {
      await api('/api/analytics/client-events', {
        method: 'POST',
        body: { events: toSend },
        skipSessionExpiry: true,
      })
    } catch {
      // optional
    }
  }
  const schedule = () => {
    if (timer) {
      clearTimeout(timer)
    }
    if (batch.length >= 20) {
      void flush()
      return
    }
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, 10000)
  }
  const router = useRouter()
  router.afterEach((to) => {
    if (!user.value) {
      return
    }
    if (Math.random() > sample) {
      return
    }
    batch.push({
      type: 'nav',
      path: to.path,
      ts: new Date().toISOString(),
      session_id: analyticsSessionId,
    })
    schedule()
  })
  const onAct = (ev: Event) => {
    if (!user.value) {
      return
    }
    if (Math.random() > sample) {
      return
    }
    const t = ev.target
    if (!(t instanceof Element)) {
      return
    }
    const el = t.closest('a,button,[type=submit],form') as HTMLElement | null
    if (!el) {
      return
    }
    const kind =
      el.tagName === 'FORM' || (ev.type === 'submit' && el.closest('form'))
        ? 'submit'
        : 'click'
    const tag = el.tagName.toLowerCase()
    const dataAction = el.getAttribute('data-audit') ?? el.getAttribute('aria-label') ?? tag
    batch.push({
      type: kind,
      target: dataAction,
      path: window.location.pathname,
      ts: new Date().toISOString(),
      session_id: analyticsSessionId,
    })
    schedule()
  }
  document.addEventListener('click', onAct, true)
  document.addEventListener('submit', onAct, true)
})
