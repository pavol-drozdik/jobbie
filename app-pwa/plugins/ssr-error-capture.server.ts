import { setResponseHeader } from 'h3'

/**
 * Captures Nuxt app:error (page setup throws) during SSR and exposes the
 * error details in the X-SSR-Page-Error response header for DevTools diagnosis.
 * Temporary — remove after the production 500 issue is fixed.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:error', (error) => {
    const event = useRequestEvent()
    if (!event) return
    const err = error as Error & { statusCode?: number; cause?: unknown; stack?: string }
    const msg = err?.message ?? String(error)
    const status = err?.statusCode ?? 0
    const cause = err?.cause ? String((err.cause as Error).message ?? err.cause) : ''
    const stack = (err?.stack ?? '').split('\n').slice(0, 6).join(' | ')
    const header = `status=${status} | ${msg.slice(0, 300)} | cause: ${cause.slice(0, 150)} | ${stack.slice(0, 300)}`
    try {
      setResponseHeader(event, 'X-SSR-Page-Error', header)
    } catch {
      // best-effort
    }
  })
})
