const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const ENSURE_TOKEN_MS = 15_000
let turnstileScriptPromise: Promise<void> | null = null

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          size?: 'normal' | 'compact' | 'flexible'
          execution?: 'render' | 'execute'
          appearance?: 'always' | 'execute' | 'interaction-only'
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string | undefined
      execute?: (widgetId?: string) => void
      reset?: (widgetId?: string) => void
      remove?: (widgetId?: string) => void
    }
  }
}

function loadTurnstileScript(): Promise<void> {
  if (!import.meta.client) return Promise.resolve()
  if (window.turnstile?.render) return Promise.resolve()
  if (turnstileScriptPromise) return turnstileScriptPromise
  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('turnstile script failed')), {
        once: true,
      })
      if (window.turnstile?.render) resolve()
      return
    }
    const s = document.createElement('script')
    s.src = TURNSTILE_SCRIPT_SRC
    s.crossOrigin = 'anonymous'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile script failed'))
    document.head.appendChild(s)
  })
  return turnstileScriptPromise
}

function waitForToken(captchaToken: Ref<string>, timeoutMs: number): Promise<string | null> {
  const existing = captchaToken.value.trim()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const stop = watch(captchaToken, (value) => {
      const trimmed = value.trim()
      if (trimmed) {
        stop()
        clearTimeout(timer)
        resolve(trimmed)
      }
    })
    const timer = setTimeout(() => {
      stop()
      resolve(null)
    }, timeoutMs)
  })
}

export function useTurnstileWidget() {
  const config = useRuntimeConfig().public
  const siteKey = computed(() => String(config.turnstileSiteKey ?? '').trim())
  const enabled = computed(() => Boolean(siteKey.value))
  const captchaToken = ref('')
  const containerRef = ref<HTMLElement | null>(null)
  const widgetId = ref<string | undefined>(undefined)
  const remountKey = ref(0)

  function clearToken(): void {
    captchaToken.value = ''
  }

  function removeWidget(): void {
    if (widgetId.value && typeof window.turnstile?.remove === 'function') {
      window.turnstile.remove(widgetId.value)
    }
    widgetId.value = undefined
    clearToken()
  }

  function reset(): void {
    if (widgetId.value && typeof window.turnstile?.reset === 'function') {
      window.turnstile.reset(widgetId.value)
      clearToken()
      return
    }
    removeWidget()
    remountKey.value += 1
  }

  async function executeChallenge(retry = false): Promise<void> {
    await loadTurnstileScript()
    if (!widgetId.value || typeof window.turnstile?.execute !== 'function') return
    if (retry && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset(widgetId.value)
    }
    clearToken()
    window.turnstile.execute(widgetId.value)
  }

  async function mount(): Promise<void> {
    if (!import.meta.client || !siteKey.value || !containerRef.value) return
    await loadTurnstileScript()
    if (!window.turnstile?.render || !containerRef.value) return
    removeWidget()
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey.value,
      // Invisible widget type in Cloudflare dashboard — size must be normal|compact|flexible (not "invisible").
      size: 'compact',
      execution: 'execute',
      appearance: 'execute',
      callback: (token: string) => {
        captchaToken.value = token
      },
      'expired-callback': () => {
        clearToken()
      },
      'error-callback': () => {
        clearToken()
      },
    })
    await executeChallenge()
  }

  /** Wait for a token from the invisible widget (does not reset an existing valid token). */
  async function ensureToken(): Promise<string | null> {
    if (!siteKey.value) return null
    if (!widgetId.value) {
      await mount()
    }
    if (!widgetId.value) return null
    const existing = captchaToken.value.trim()
    if (existing) return existing
    await executeChallenge(true)
    return waitForToken(captchaToken, ENSURE_TOKEN_MS)
  }

  /** Reset and obtain a fresh single-use token (call immediately before Supabase auth). */
  async function refreshToken(): Promise<string | null> {
    if (!siteKey.value) return null
    reset()
    await nextTick()
    await mount()
    return waitForToken(captchaToken, ENSURE_TOKEN_MS)
  }

  onBeforeUnmount(() => {
    removeWidget()
  })

  return {
    siteKey,
    enabled,
    captchaToken,
    containerRef,
    remountKey,
    mount,
    reset,
    removeWidget,
    clearToken,
    ensureToken,
    refreshToken,
  }
}
