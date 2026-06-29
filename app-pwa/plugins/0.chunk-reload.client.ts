const SESSION_KEY = 'jb-chunk-reload-at'
/** Allow one automatic reload per tab within this window (deploy / CDN HTML lag). */
const RELOAD_COOLDOWN_MS = 60_000

function shouldReloadOnce(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    const at = raw ? Number(raw) : 0
    if (Number.isFinite(at) && at > 0 && Date.now() - at < RELOAD_COOLDOWN_MS) {
      return false
    }
    sessionStorage.setItem(SESSION_KEY, String(Date.now()))
    return true
  } catch {
    return true
  }
}

function isStaleChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('error loading dynamically imported module')
  )
}

/**
 * After a PWA deploy, CDN-cached HTML may reference removed `_nuxt/*` hashes.
 * Reload once to fetch a fresh document and chunk manifest.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  let reloading = false

  function reloadForStaleChunks(): void {
    if (reloading || !shouldReloadOnce()) {
      return
    }
    reloading = true
    window.location.reload()
  }

  nuxtApp.hook('app:chunkError', ({ error }) => {
    if (isStaleChunkLoadError(error)) {
      reloadForStaleChunks()
    }
  })

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadForStaleChunks()
  })
})
