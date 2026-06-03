import type { ChatRoomListItem } from '~/types/chat'

export type ChatRoomsRefreshOptions = { quiet?: boolean }

let roomsRefreshListenerAttached = false
let roomsRefreshTimer: ReturnType<typeof setTimeout> | null = null
let lastRefreshFn: (() => Promise<void>) | null = null

function attachRoomsRefreshListener(): void {
  if (!import.meta.client || roomsRefreshListenerAttached) {
    return
  }
  roomsRefreshListenerAttached = true
  const rt = useRealtimeSocket()
  rt.on('message', () => {
    if (!lastRefreshFn) return
    if (roomsRefreshTimer) clearTimeout(roomsRefreshTimer)
    roomsRefreshTimer = setTimeout(() => {
      void lastRefreshFn?.()
    }, 600)
  })
}

/**
 * Shared per-tab state. Using `useState` (instead of a fresh `ref` on every
 * call) means navigating between `/chat` and `/chat/:id` doesn't
 * reset `loading` back to `true`, which used to flash a "Načítavam" line in
 * the rooms sidebar on every navigation. The cached list stays visible and
 * the refresh runs silently on top of it.
 */
export function useChatRooms() {
  const { api } = useApi()
  const rooms = useState<ChatRoomListItem[]>('chat:rooms:list', () => [])
  const loading = useState<boolean>('chat:rooms:loading', () => true)
  const hasLoadedOnce = useState<boolean>('chat:rooms:loaded-once', () => false)

  async function refresh(options?: ChatRoomsRefreshOptions): Promise<void> {
    const quiet = options?.quiet === true
    if (!quiet && !hasLoadedOnce.value) {
      loading.value = true
    }
    try {
      const res = await api<ChatRoomListItem[]>('/api/chat/rooms')
      if (res.ok && Array.isArray(res.data)) {
        rooms.value = res.data
      } else if (!hasLoadedOnce.value) {
        rooms.value = []
      }
    } finally {
      hasLoadedOnce.value = true
      loading.value = false
    }
  }

  lastRefreshFn = () => refresh({ quiet: true })
  attachRoomsRefreshListener()

  return { rooms, loading, refresh }
}
