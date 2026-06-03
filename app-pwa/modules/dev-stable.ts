import { defineNuxtModule } from '@nuxt/kit'
import type { Server as HttpServer } from 'node:http'
import type { Socket } from 'node:net'

/** Dev-only: stray TCP resets (browser tab, SW, closed proxy) must not kill `nuxt dev`. */
function isBenignDevConnectionError(reason: unknown): boolean {
  const msg =
    reason instanceof Error ? reason.message : String(reason ?? '')
  const code =
    typeof reason === 'object' &&
    reason !== null &&
    'code' in reason &&
    typeof (reason as { code: unknown }).code === 'string'
      ? (reason as { code: string }).code
      : ''
  return (
    msg.includes('ECONNRESET') ||
    msg.includes('ECONNABORTED') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('socket hang up') ||
    msg.includes('EPIPE') ||
    code === 'ECONNRESET' ||
    code === 'ECONNABORTED' ||
    code === 'ECONNREFUSED'
  )
}

/**
 * Nuxt 3.21+ dev forks a child; @nuxt/cli IPC calls process.exit() on every
 * unhandledRejection. Wrap existing listeners so benign TCP resets never restart dev.
 */
function patchDevForkUnhandledRejection(): void {
  type RejectionListener = NodeJS.UnhandledRejectionListener
  const existing = process.listeners('unhandledRejection') as RejectionListener[]
  if (!existing.length) return

  for (const listener of existing) {
    process.removeListener('unhandledRejection', listener)
  }

  const wrapped: RejectionListener = (reason, _promise) => {
    if (isBenignDevConnectionError(reason)) {
      // Do not call promise.catch() here — late handlers emit
      // PromiseRejectionHandledWarning on every benign dev TCP reset.
      return
    }
    for (const listener of existing) {
      listener(reason, _promise)
    }
  }

  process.on('unhandledRejection', wrapped)
}

function attachHttpServerGrace(httpServer: HttpServer | undefined): void {
  if (!httpServer) return
  httpServer.on('clientError', (err: Error, socket: Socket) => {
    if (!isBenignDevConnectionError(err)) return
    socket.destroy()
  })
}

export default defineNuxtModule({
  meta: { name: 'jobbie-dev-stable' },
  setup(_options, nuxt) {
    if (!nuxt.options.dev) return

    nuxt.hook('vite:serverCreated', (viteServer) => {
      attachHttpServerGrace(viteServer.httpServer)
      viteServer.httpServer?.on('upgrade', (_req, socket) => {
        socket.on('error', (err) => {
          if (isBenignDevConnectionError(err)) socket.destroy()
        })
      })
    })

    patchDevForkUnhandledRejection()
  },
})
