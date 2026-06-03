let gtmLoaded = false
let routerHookRegistered = false

const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/i

export function isGtmConfigured(): boolean {
  const config = useRuntimeConfig().public
  const id = typeof config.gtmContainerId === 'string' ? config.gtmContainerId.trim() : ''
  return id.length > 0 && GTM_CONTAINER_ID_PATTERN.test(id)
}

function pushPageView(pagePath: string): void {
  if (!gtmLoaded) {
    return
  }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: 'page_view',
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  })
}

function registerRouterPageviews(): void {
  if (routerHookRegistered) {
    return
  }
  const router = useRouter()
  router.afterEach((to) => {
    if (gtmLoaded) {
      pushPageView(to.fullPath)
    }
  })
  routerHookRegistered = true
}

/**
 * Load Google Tag Manager when analytics consent is granted.
 * Configure GA4, Clarity, and other tags inside the GTM container.
 */
export function loadGtm(): void {
  if (!import.meta.client || gtmLoaded || !isGtmConfigured()) {
    return
  }
  const containerId = (useRuntimeConfig().public.gtmContainerId as string).trim().toUpperCase()
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  document.head.appendChild(script)
  registerRouterPageviews()
  pushPageView(useRouter().currentRoute.value.fullPath)
  gtmLoaded = true
}

export function unloadGtm(): void {
  if (!import.meta.client) return
  gtmLoaded = false
  document
    .querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')
    .forEach((el) => el.remove())
  window.dataLayer = []
  if (typeof window.gtag === 'function') {
    try {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      })
    } catch {
      /* ignore */
    }
  }
}
