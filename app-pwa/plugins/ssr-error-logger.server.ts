/**
 * Catches Vue SSR render errors and exposes them for debugging.
 * Stores the error in the Nuxt event context so error.vue can display details.
 * Temporary — remove after the production 500 issue on /ponuka/:id is diagnosed.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, _instance, info) => {
    const e = error as Error | null
    const message = e?.message ?? String(error)
    const stack = (e?.stack ?? '').split('\n').slice(0, 10).join(' | ')

    // Write to the H3 event context so error.vue can expose it
    try {
      const event = useRequestEvent()
      if (event) {
        event.context.ssrVueError = { message, info: String(info ?? ''), stack }
      }
    } catch {
      // useRequestEvent may not be available in all contexts
    }

    console.error('[VUE-SSR-ERROR]', { message, info, stack })
  })
})
