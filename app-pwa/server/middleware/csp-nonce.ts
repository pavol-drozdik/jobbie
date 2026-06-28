import { randomBytes } from 'node:crypto'
import {
  isLocalHttpApiOrigin,
  resolvePlatformCspOrigins,
} from '../../utils/platform-csp'

/**
 * Per-request CSP nonce for production HTML (inline Nuxt bootstrap scripts).
 * Skips dev and localhost API preview (Vite HMR needs unsafe-inline).
 * Opt out via NUXT_CSP_NONCE_RELAXED=1 for emergency rollback.
 */
export default defineEventHandler((event) => {
  if (import.meta.dev) {
    return
  }
  const publicConfig = useRuntimeConfig(event).public
  const origins = resolvePlatformCspOrigins({
    apiBaseUrl: String(publicConfig.apiBaseUrl ?? ''),
    supabaseUrl: String(publicConfig.supabaseUrl ?? ''),
    cdnUrl: String(publicConfig.cdnUrl ?? ''),
    posthogHost: String(publicConfig.posthogHost ?? ''),
  })
  if (isLocalHttpApiOrigin(origins.apiOrigin)) {
    return
  }
  if (process.env.NUXT_CSP_NONCE_RELAXED === '1') {
    return
  }
  event.context.cspNonce = randomBytes(16).toString('base64')
})
