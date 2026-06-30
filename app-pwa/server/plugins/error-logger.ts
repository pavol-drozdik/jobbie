/**
 * Logs SSR errors to the Worker console so they appear in Cloudflare Pages real-time logs.
 * Temporary — remove after the production 500 issue is diagnosed.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, ctx) => {
    const event = (ctx as { event?: { path?: string } }).event
    console.error('[SSR-ERROR]', {
      path: event?.path ?? '(unknown)',
      message: (error as Error)?.message ?? String(error),
      stack: ((error as Error)?.stack ?? '').split('\n').slice(0, 6).join(' | '),
    })
  })
})
