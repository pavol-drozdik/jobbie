import type { Socket } from 'socket.io-client'
import { ref, type Ref } from 'vue'
import { hasActiveBffSession } from '~/utils/bff-csrf-state'

/** Loaded on demand so SSR never evaluates `socket.io-client` (breaks vite-node). */
let ioLoader: Promise<(typeof import('socket.io-client'))['io']> | null = null

function loadIo(): Promise<(typeof import('socket.io-client'))['io']> {
  if (!ioLoader) {
    ioLoader = import('socket.io-client').then((m) => m.io)
  }
  return ioLoader
}

/** Invalidates in-flight connect callbacks (sign-out, rapid reconnect, superseded attempt). */
let latestConnectId = 0

/**
 * Thin singleton wrapper around a single Socket.IO connection for the entire
 * PWA. Avoids the previous double-bookkeeping between Nuxt `useState` and a
 * module-level object (they used to desync on HMR / route changes).
 *
 * Usage pattern:
 *   const rt = useRealtimeSocket()
 *   rt.connect(token, baseUrl)         // idempotent
 *   rt.on('message', handler)          // listeners persist across reconnects
 *   rt.onConnected(() => { ... })      // runs now if already connected,
 *                                      // otherwise on the next `connect`
 *   rt.emit('join_room', { room_id })
 *   rt.disconnect()                    // on sign-out
 */

type Handler = (...args: unknown[]) => void

// Module-level state. Shared across every call to `useRealtimeSocket()` on the
// client (the module is a per-tab singleton).
let socket: Socket | null = null
/** `'cookie'` when authenticated via HttpOnly jb_at; otherwise Bearer token string. */
let currentAuthKey: string | null = null
const listeners = new Map<string, Set<Handler>>()
const onConnectOnce = new Set<() => void>()

// Reactive state exposed to components. We expose the same refs every time so
// that callers stay in sync automatically.
const connectedRef: Ref<boolean> = ref(false)
const socketIdRef: Ref<string | null> = ref(null)

const DEBUG = import.meta.dev

function dbg(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.debug('[realtime]', ...args)
  }
}

function rebindAllListeners(s: Socket): void {
  for (const [event, handlers] of listeners.entries()) {
    for (const h of handlers) {
      s.on(event, h)
    }
  }
}

function bindLifecycle(s: Socket): void {
  s.on('connect', () => {
    connectedRef.value = true
    socketIdRef.value = s.id ?? null
    dbg('connected', s.id)
    const callbacks = Array.from(onConnectOnce)
    onConnectOnce.clear()
    for (const cb of callbacks) {
      try {
        cb()
      } catch (err) {
        dbg('onConnected callback threw', err)
      }
    }
  })
  s.on('disconnect', (reason: string) => {
    connectedRef.value = false
    socketIdRef.value = null
    dbg('disconnected', reason)
  })
  s.on('connect_error', (err: Error) => {
    connectedRef.value = false
    dbg('connect_error', err.message)
  })
  s.on('reconnect', (attempt: number) => {
    dbg('reconnected (attempt', attempt, ')')
  })
}

function teardown(): void {
  if (!socket) {
    return
  }
  const s = socket
  for (const [event, handlers] of listeners.entries()) {
    for (const h of handlers) {
      s.off(event, h)
    }
  }
  try {
    s.removeAllListeners()
    s.disconnect()
  } catch {
    /* noop */
  }
  socket = null
  currentAuthKey = null
  connectedRef.value = false
  socketIdRef.value = null
}

function resolveAuthKey(options?: { bearerToken?: string | null }): string | null {
  if (hasActiveBffSession() && !options?.bearerToken?.trim()) {
    return 'cookie'
  }
  const token = options?.bearerToken?.trim()
  return token ? token : null
}

function connect(baseUrl: string, options?: { bearerToken?: string | null }): void {
  if (!import.meta.client) return
  const authKey = resolveAuthKey(options)
  if (!authKey) return
  if (socket && currentAuthKey === authKey) {
    if (!socket.connected && !socket.active) {
      dbg('reusing existing socket, forcing connect()')
      socket.connect()
    }
    return
  }
  if (socket) {
    teardown()
  }
  const connectId = ++latestConnectId
  void loadIo().then(async (io) => {
    if (!import.meta.client) return
    if (connectId !== latestConnectId) {
      dbg('connect superseded')
      return
    }
    dbg('creating socket to', baseUrl, authKey === 'cookie' ? '(cookie)' : '(bearer)')
    const useCookie = authKey === 'cookie'
    socket = io(baseUrl, {
      path: '/socket.io',
      withCredentials: true,
      ...(useCookie ? {} : { auth: { token: `Bearer ${authKey}` } }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })
    currentAuthKey = authKey
    bindLifecycle(socket)
    rebindAllListeners(socket)
  })
}

function disconnect(): void {
  latestConnectId++
  if (!socket) return
  dbg('disconnect() called')
  teardown()
}

function on(event: string, handler: Handler): void {
  let bucket = listeners.get(event)
  if (!bucket) {
    bucket = new Set()
    listeners.set(event, bucket)
  }
  if (bucket.has(handler)) return
  bucket.add(handler)
  socket?.on(event, handler)
}

function off(event: string, handler: Handler): void {
  const bucket = listeners.get(event)
  if (bucket) {
    bucket.delete(handler)
    if (bucket.size === 0) listeners.delete(event)
  }
  socket?.off(event, handler)
}

function emit(event: string, ...args: unknown[]): void {
  if (!socket) {
    dbg('emit skipped; not connected yet', event)
    return
  }
  socket.emit(event, ...args)
}

function joinRoom(roomId: string): void {
  if (!roomId) return
  if (!socket) {
    dbg('joinRoom queued; waiting for connect', roomId)
    onConnected(() => {
      socket?.emit('join_room', { room_id: roomId })
    })
    return
  }
  if (!socket.connected) {
    onConnected(() => {
      socket?.emit('join_room', { room_id: roomId })
    })
    return
  }
  socket.emit('join_room', { room_id: roomId })
}

function leaveRoom(roomId: string): void {
  if (!roomId) return
  if (!socket?.connected) {
    return
  }
  socket.emit('leave_room', { room_id: roomId })
}

function onConnected(cb: () => void): void {
  if (socket?.connected) {
    try {
      cb()
    } catch (err) {
      dbg('onConnected sync callback threw', err)
    }
    return
  }
  onConnectOnce.add(cb)
}

export function useRealtimeSocket() {
  return {
    connected: connectedRef,
    socketId: socketIdRef,
    connect,
    disconnect,
    on,
    off,
    emit,
    joinRoom,
    leaveRoom,
    onConnected,
  }
}
