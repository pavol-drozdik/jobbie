/**
 * Catches Vue SSR render errors and stores them in Nuxt state so error.vue
 * can display the details across the SSR→hydration boundary.
 * Temporary — remove after the production 500 issue is diagnosed.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vue:error', (error, _instance, info) => {
    const e = error as Error | null
    const ssrVueError = useState('ssr-vue-error', () => ({ message: '', info: '', stack: '' }))
    ssrVueError.value = {
      message: e?.message ?? String(error),
      info: String(info ?? ''),
      stack: (e?.stack ?? '').split('\n').slice(0, 10).join(' | '),
    }
    console.error('[VUE-SSR-ERROR]', ssrVueError.value)
  })
})
