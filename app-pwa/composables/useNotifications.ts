import { timeAgo } from '~/utils/job'

export interface NotificationItem {
  id: string
  type:
    | 'chat_message'
    | 'job_application'
    | 'security_alert'
    | 'application_status'
    | 'payment_received'
    | 'job_status'
    | 'admin_broadcast'
    | 'weekly_digest'
    | 'reengagement'
  title: string
  body: string | null
  link_path: string
  read_at: string | null
  created_at: string
}

export interface NotificationsListResponse {
  items: NotificationItem[]
  unread_count: number
}

let listenersAttached = false
let refreshOnReconnect: (() => void) | null = null
let refreshInFlight: Promise<void> | null = null

/** Minimum interval between silent list refreshes triggered by SPA navigation. */
const NOTIFICATIONS_NAV_REFRESH_TTL_MS = 45_000

/** Device/IP security rows are not shown in the Upozornenia bell. */
const HIDDEN_NOTIFICATION_TYPES = new Set<NotificationItem['type']>(['security_alert'])

function visibleNotifications(list: NotificationItem[]): NotificationItem[] {
  return list.filter((n) => !HIDDEN_NOTIFICATION_TYPES.has(n.type))
}

// In-app notifications: REST list + realtime refresh on socket reconnect (not a poll loop).
export function useNotifications() {
  const { api } = useApi()
  const realtime = useRealtimeSocket()
  const items = useState<NotificationItem[]>('jobbie:notifications:items', () => [])
  const unreadCount = useState<number>('jobbie:notifications:unread', () => 0)
  const loading = useState<boolean>('jobbie:notifications:loading', () => false)
  const lastFetchedAtMs = useState<number>('jobbie:notifications:last-fetched-ms', () => 0)

  async function refresh(options?: { silent?: boolean }): Promise<void> {
    if (refreshInFlight) {
      return refreshInFlight
    }
    const silent = options?.silent === true
    refreshInFlight = (async () => {
      if (!silent) {
        loading.value = true
      }
      try {
        const res = await api<NotificationsListResponse>('/api/notifications', {
          query: { limit: '40' },
        })
        if (res.ok && res.data) {
          items.value = visibleNotifications(res.data.items ?? [])
          unreadCount.value = res.data.unread_count ?? 0
          lastFetchedAtMs.value = Date.now()
        }
      } finally {
        if (!silent) {
          loading.value = false
        }
      }
    })().finally(() => {
      refreshInFlight = null
    })
    return refreshInFlight
  }

  /** Silent refresh only when the cached list is older than the navigation TTL. */
  async function refreshIfStale(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent !== false
    const age = Date.now() - lastFetchedAtMs.value
    if (lastFetchedAtMs.value > 0 && age < NOTIFICATIONS_NAV_REFRESH_TTL_MS) {
      return
    }
    await refresh({ silent })
  }

  async function markRead(id: string): Promise<void> {
    const res = await api<{ ok: true }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    })
    if (res.ok) {
      await refresh({ silent: true })
    }
  }

  async function markAllAsRead(): Promise<void> {
    const hasUnread =
      unreadCount.value > 0 || items.value.some((n) => !n.read_at)
    if (!hasUnread) {
      return
    }
    const now = new Date().toISOString()
    items.value = items.value.map((n) =>
      n.read_at ? n : { ...n, read_at: now },
    )
    unreadCount.value = 0
    const res = await api<{ ok: true }>('/api/notifications/read-all', {
      method: 'PATCH',
    })
    if (!res.ok) {
      await refresh({ silent: true })
    }
  }

  function handleNotificationEvent(payload: unknown): void {
    const item = payload as NotificationItem | null
    if (!item || typeof item.id !== 'string') return
    if (HIDDEN_NOTIFICATION_TYPES.has(item.type)) return
    if (items.value.some((n) => n.id === item.id)) return
    items.value = [item, ...items.value]
    if (!item.read_at) {
      unreadCount.value = Math.max(0, unreadCount.value) + 1
    }
  }

  function handleUnreadDelta(payload: unknown): void {
    const p = payload as { unread_count?: number; unread_delta?: number } | null
    if (!p) return
    if (typeof p.unread_count === 'number') {
      unreadCount.value = Math.max(0, p.unread_count)
      return
    }
    if (typeof p.unread_delta === 'number') {
      unreadCount.value = Math.max(0, unreadCount.value + p.unread_delta)
    }
  }

  /**
   * Attach socket listeners exactly once per client. Safe to call multiple
   * times; subsequent calls are no-ops.
   */
  function ensureSubscribed(): void {
    if (!import.meta.client) return
    if (listenersAttached) return
    listenersAttached = true
    realtime.on('notification', handleNotificationEvent)
    realtime.on('notifications_unread_delta', handleUnreadDelta)
    // Refresh on initial connect AND every subsequent reconnect so that any
    // notifications delivered while the socket was down are not lost.
    refreshOnReconnect = () => {
      void refresh({ silent: true })
    }
    realtime.on('connect', refreshOnReconnect)
    realtime.onConnected(() => {
      void refresh({ silent: true })
    })
  }

  // Back-compat aliases. Old callers used startPolling/stopPolling; these
  // now map to the idempotent ensureSubscribed (stop is a no-op because we
  // keep notifications globally alive for the lifetime of the tab).
  function startPolling(): void {
    ensureSubscribed()
  }

  function stopPolling(): void {
    /* intentionally a no-op; see ensureSubscribed */
  }

  function formatTime(iso: string): string {
    try {
      return timeAgo(iso)
    } catch {
      return ''
    }
  }

  return {
    items,
    unreadCount,
    loading,
    refresh,
    refreshIfStale,
    markRead,
    markAllAsRead,
    ensureSubscribed,
    startPolling,
    stopPolling,
    formatTime,
  }
}
