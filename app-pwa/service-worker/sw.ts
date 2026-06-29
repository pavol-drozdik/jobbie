/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

declare const __WB_MANIFEST: Array<{ url: string; revision: string | null | undefined }>

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

/**
 * Document navigations must hit the network so hybrid SSR + CSR routes get the
 * correct HTML shell. Serving precached `/` (prerendered homepage) for every
 * navigation breaks `/auth/*` and other CSR routes (hydration mismatch → 500).
 * Cloudflare Pages already serves the right fallback per path; offline navigations
 * are not supported.
 */
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkOnly(),
)

type PushPayload = {
  title?: string
  body?: string
  url?: string
}

const UNSAFE_SCHEME_RE = /^(javascript|data|vbscript|file|blob):/i
const BACKSLASH_RE = /[\\]/
const PROTOCOL_RELATIVE_RE = /^\/\//

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function hasUnsafeEncodedSlash(path: string): boolean {
  const lower = path.toLowerCase()
  return (
    lower.includes('%2f%2f') ||
    lower.includes('%5c%5c') ||
    lower.includes('%2f%5c') ||
    lower.includes('%5c%2f')
  )
}

function normalizeInternalPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return ''
  const decoded = decodePathSegment(trimmed)
  if (BACKSLASH_RE.test(decoded)) return ''
  if (PROTOCOL_RELATIVE_RE.test(decoded)) return ''
  if (UNSAFE_SCHEME_RE.test(decoded)) return ''
  if (hasUnsafeEncodedSlash(decoded)) return ''
  if (decoded.includes('@')) return ''
  return decoded
}

/** Same-origin internal paths only — never open external URLs from push payload. */
function normalizeNotificationUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '/'
  try {
    const parsed = new URL(trimmed, self.location.origin)
    if (parsed.origin !== self.location.origin) return '/'
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    const safe = normalizeInternalPath(path)
    return safe.length > 0 ? safe : '/'
  } catch {
    const safe = normalizeInternalPath(trimmed)
    return safe.length > 0 ? safe : '/'
  }
}

function parsePushPayload(event: PushEvent): PushPayload {
  try {
    if (!event.data) {
      return {}
    }
    return event.data.json() as PushPayload
  } catch {
    try {
      const text = event.data?.text() ?? ''
      return text ? (JSON.parse(text) as PushPayload) : {}
    } catch {
      return {}
    }
  }
}

self.addEventListener('push', (event: PushEvent) => {
  const payload = parsePushPayload(event)
  const title = (payload.title ?? 'JOBBIE').trim() || 'JOBBIE'
  const body = (payload.body ?? '').trim() || 'JOBBIE'
  const url = typeof payload.url === 'string' && payload.url.length > 0 ? payload.url : '/'
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      tag: url,
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const raw = event.notification.data
  const rawUrl =
    typeof raw === 'object' && raw !== null && 'url' in raw && typeof (raw as { url: unknown }).url === 'string'
      ? (raw as { url: string }).url
      : '/'
  const url = normalizeNotificationUrl(rawUrl)
  const openUrl = new URL(url, self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          void c.focus()
          if ('navigate' in c && typeof (c as { navigate: (u: string) => Promise<unknown> }).navigate === 'function') {
            void (c as { navigate: (u: string) => Promise<unknown> }).navigate(url)
          }
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(openUrl)
      }
    }),
  )
})

self.addEventListener('pushsubscriptionchange', (event: Event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'jobbie-push-resubscribe' })
      }
    }),
  )
})

/** Required for @vite-pwa `registerType: 'prompt'` — `updateServiceWorker()` posts this. */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | null
  if (data?.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting())
  }
})

export {}
