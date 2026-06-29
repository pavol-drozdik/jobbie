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

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return String(error ?? '')
}

/** Stale `_nuxt` chunk or Vue Router failed lazy route load after deploy / CDN HTML lag. */
export function isStaleChunkLoadError(error: unknown): boolean {
  const message = errorMessage(error)
  return (
    message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
    || message.includes('error loading dynamically imported module')
    || message.includes("Couldn't resolve component")
  )
}

/**
 * Complements Nuxt `emitRouteChunkError: 'automatic-immediate'` (vite preload errors).
 * Handles Vue Router lazy-route failures (`Couldn't resolve component "default"`) when
 * HTML references removed `_nuxt/*` hashes or the edge returns HTML for a chunk URL.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }

  let reloading = false

  function reloadForStaleChunks(fullPath?: string): void {
    if (reloading || !shouldReloadOnce()) {
      return
    }
    reloading = true
    if (fullPath) {
      window.location.href = fullPath
      return
    }
    window.location.reload()
  }

  const router = useRouter()
  router.onError((error, to) => {
    if (!isStaleChunkLoadError(error)) {
      return
    }
    reloadForStaleChunks(to?.fullPath || undefined)
  })

  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason
    if (!isStaleChunkLoadError(reason)) {
      return
    }
    event.preventDefault()
    reloadForStaleChunks()
  }

  window.addEventListener('unhandledrejection', onUnhandledRejection)

  nuxtApp.hook('app:unmounted', () => {
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  })
})
