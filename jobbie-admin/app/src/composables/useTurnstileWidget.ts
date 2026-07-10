import { computed, onBeforeUnmount, ref } from 'vue'

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
let turnstileScriptPromise: Promise<void> | null = null

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
        },
      ) => string | undefined
      remove?: (widgetId?: string) => void
    }
  }
}

function loadTurnstileScript(): Promise<void> {
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

export function useTurnstileWidget() {
  const siteKey = computed(() =>
    String(import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '').trim(),
  )
  const enabled = computed(() => Boolean(siteKey.value))
  const captchaToken = ref('')
  const containerRef = ref<HTMLElement | null>(null)
  const widgetId = ref<string | undefined>(undefined)
  const remountKey = ref(0)
  const loadError = ref<string | null>(null)

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
    removeWidget()
    remountKey.value += 1
  }

  async function mount(): Promise<void> {
    if (!siteKey.value || !containerRef.value) return
    loadError.value = null
    try {
      await loadTurnstileScript()
    } catch {
      loadError.value =
        'Turnstile sa nepodarilo načítať. V Cloudflare Turnstile pridajte hostname 127.0.0.1 (desktop admin) a skontrolujte sieť.'
      return
    }
    if (!window.turnstile?.render || !containerRef.value) {
      loadError.value = 'Turnstile API nie je k dispozícii.'
      return
    }
    removeWidget()
    widgetId.value = window.turnstile.render(containerRef.value, {
      sitekey: siteKey.value,
      callback: (token: string) => {
        captchaToken.value = token
      },
      'expired-callback': () => {
        clearToken()
      },
    })
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
    loadError,
  }
}
