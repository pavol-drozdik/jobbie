import { onCLS, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return
  }
  if (!isAnalyticsConsentGranted()) {
    return
  }
  const config = useRuntimeConfig().public
  const raw = String(config.webVitalsSampleRate ?? '0').trim()
  const rate = Math.min(Math.max(parseFloat(raw) || 0, 0), 1)
  if (rate <= 0 || Math.random() > rate) {
    return
  }
  const { api } = useApi()
  const buffer: Array<{
    name: string
    value: number
    id?: string
    navigationType?: string
  }> = []
  let flushTimer: ReturnType<typeof setTimeout> | undefined

  function flush(): void {
    if (buffer.length === 0) {
      return
    }
    const metrics = buffer.splice(0, buffer.length)
    const path = window.location.pathname.slice(0, 512)
    void api('/api/metrics/web-vitals', {
      method: 'POST',
      body: { path, metrics },
      skipSessionExpiry: true,
    }).catch(() => {})
  }

  function scheduleFlush(): void {
    if (flushTimer) {
      clearTimeout(flushTimer)
    }
    flushTimer = setTimeout(() => {
      flushTimer = undefined
      flush()
    }, 2500)
  }

  function enqueue(metric: Metric): void {
    buffer.push({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      navigationType:
        'navigationType' in metric
          ? String((metric as { navigationType?: string }).navigationType ?? '')
          : undefined,
    })
    scheduleFlush()
  }

  onLCP(enqueue)
  onCLS(enqueue)
  onINP(enqueue)
  onTTFB(enqueue)

  window.addEventListener(
    'pagehide',
    () => {
      flush()
    },
    { once: true },
  )
})
