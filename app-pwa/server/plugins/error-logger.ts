import { setResponseHeader } from 'h3'

/**
 * Logs SSR errors and exposes them via X-SSR-Error response header for DevTools.
 * Temporary — remove after the production 500 issue is diagnosed.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, ctx) => {
    const event = (ctx as { event?: Parameters<typeof setResponseHeader>[0] }).event
    const path = (event as { path?: string } | undefined)?.path ?? '(unknown)'
    const err = error as Error & { statusCode?: number; cause?: unknown }
    const msg = err?.message ?? String(error)
    const stack = (err?.stack ?? '').split('\n').slice(0, 8).join(' | ')
    const cause = err?.cause ? String((err.cause as Error).message ?? err.cause) : ''
    console.error('[SSR-ERROR]', { path, message: msg, cause, stack })
    if (event) {
      try {
        const short = `${path} | ${msg.slice(0, 300)} | cause: ${cause.slice(0, 150)}`
        setResponseHeader(event, 'X-SSR-Error', short)
      } catch {
        // best-effort
      }
    }
  })
})
