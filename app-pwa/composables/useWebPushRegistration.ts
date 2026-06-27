/**
 * Registers the browser push subscription with the API when the user has
 * already granted notification permission (no prompt).
 */
function urlBase64ToVapidKeyBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer.slice(outputArray.byteOffset, outputArray.byteOffset + outputArray.byteLength)
}

const SERVICE_WORKER_READY_MS = 8000

async function resolveActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!import.meta.client || !('serviceWorker' in navigator)) {
    return null
  }
  const readyPromise = navigator.serviceWorker.ready
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SERVICE_WORKER_READY_MS)
  })
  const raced = await Promise.race([readyPromise, timeoutPromise])
  if (raced !== null && 'active' in raced && raced.active) {
    return raced
  }
  const reg = await navigator.serviceWorker.getRegistration()
  return reg?.active ? reg : null
}

async function subscribeWithApplicationKey(
  registration: ServiceWorkerRegistration,
  applicationServerKey: ArrayBuffer,
): Promise<PushSubscription | null> {
  let sub = await registration.pushManager.getSubscription()
  if (sub) {
    return sub
  }
  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  } catch {
    const stale = await registration.pushManager.getSubscription()
    if (stale) {
      try {
        await stale.unsubscribe()
      } catch {
        // ignore
      }
    }
    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    } catch {
      return null
    }
  }
}

export type WebPushSubscribeResult =
  | 'ok'
  | 'denied'
  | 'unsupported'
  | 'no_session'
  | 'no_service_worker'
  | 'no_vapid'
  | 'subscribe_browser_failed'
  | 'unauthorized'
  | 'server_error'

const PUSH_RESUBSCRIBE_MESSAGE_TYPE = 'jobbie-push-resubscribe'

let lifecycleListenersInstalled = false

function installWebPushLifecycleListeners(syncIfGranted: () => Promise<void>): void {
  if (!import.meta.client || lifecycleListenersInstalled) {
    return
  }
  lifecycleListenersInstalled = true
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      void syncIfGranted()
    })
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
      const data = event.data
      if (
        typeof data === 'object' &&
        data !== null &&
        (data as { type?: string }).type === PUSH_RESUBSCRIBE_MESSAGE_TYPE
      ) {
        void syncIfGranted()
      }
    })
  }
  document.addEventListener('visibilitychange', () => {
    if (
      document.visibilityState === 'visible' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      void syncIfGranted()
    }
  })
}

export function useWebPushRegistration(): {
  syncIfGranted: () => Promise<void>
  requestPermissionAndSubscribe: () => Promise<WebPushSubscribeResult>
} {
  async function runSubscribe(): Promise<WebPushSubscribeResult> {
    if (!import.meta.client) {
      return 'unsupported'
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported'
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return 'denied'
    }
    const { user } = useAuth()
    if (!user.value?.id) {
      return 'no_session'
    }
    const registration = await resolveActiveServiceWorkerRegistration()
    if (!registration?.active) {
      return 'no_service_worker'
    }
    const { api } = useApi()
    const keyRes = await api<{ publicKey: string | null }>('/api/notifications/push/vapid-public-key')
    if (!keyRes.ok) {
      if (keyRes.status === 401) {
        return 'unauthorized'
      }
      return 'server_error'
    }
    if (!keyRes.data?.publicKey?.trim()) {
      return 'no_vapid'
    }
    const applicationServerKey = urlBase64ToVapidKeyBuffer(keyRes.data.publicKey.trim())
    const sub = await subscribeWithApplicationKey(registration, applicationServerKey)
    if (!sub) {
      return 'subscribe_browser_failed'
    }
    const j = sub.toJSON()
    const endpoint = j.endpoint
    const p256dh = j.keys?.p256dh
    const auth = j.keys?.auth
    if (!endpoint || !p256dh || !auth) {
      return 'subscribe_browser_failed'
    }
    const post = await api('/api/notifications/push/subscribe', {
      method: 'POST',
      body: { endpoint, keys: { p256dh, auth } },
    })
    if (!post.ok) {
      if (post.status === 401) {
        return 'unauthorized'
      }
      return 'server_error'
    }
    return 'ok'
  }

  async function syncIfGranted(): Promise<void> {
    if (!import.meta.client) {
      return
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }
    try {
      await runSubscribe()
    } catch {
      // Background lifecycle sync must not surface as unhandled Vue errors.
    }
  }

  async function requestPermissionAndSubscribe(): Promise<WebPushSubscribeResult> {
    if (!import.meta.client) {
      return 'unsupported'
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return 'unsupported'
    }
    if (typeof Notification === 'undefined') {
      return 'unsupported'
    }
    const { user } = useAuth()
    if (!user.value?.id) {
      return 'no_session'
    }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      return 'denied'
    }
    return runSubscribe()
  }

  installWebPushLifecycleListeners(syncIfGranted)

  return { syncIfGranted, requestPermissionAndSubscribe }
}
