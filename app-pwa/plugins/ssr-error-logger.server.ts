/**
 * Catches Vue SSR render errors and logs them to the CF Pages Worker console.
 * Temporary — remove after the production 500 issue on /ponuka/:id is diagnosed.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, _instance, info) => {
    const e = error as Error | null
    console.error('[VUE-SSR-ERROR]', {
      message: e?.message ?? String(error),
      info,
      stack: (e?.stack ?? '').split('\n').slice(0, 8).join(' | '),
    })
  })
})
