declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

declare module '#app' {
  interface NuxtApp {
    $openCookiePreferences: () => void
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $openCookiePreferences: () => void
  }
}

export {}
