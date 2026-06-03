import { randomBytes } from 'node:crypto'
import {
  buildContentSecurityPolicy,
  isLocalHttpApiOrigin,
  resolvePlatformCspOrigins,
} from '../../utils/platform-csp'

/**
 * Optional per-request CSP nonce for SSR HTML (Stage 2 — off by default).
 * Enforcing nonce CSP breaks Nuxt/Vite dev (inline module scripts) and local
 * preview; route rules use `unsafe-inline` until NUXT_CSP_NONCE_ENFORCE=1.
 */
export default defineEventHandler((event) => {
  if (import.meta.dev) {
    return
  }
  const origins = resolvePlatformCspOrigins()
  if (isLocalHttpApiOrigin(origins.apiOrigin)) {
    return
  }
  if (process.env.NUXT_CSP_NONCE_ENFORCE !== '1') {
    return
  }
  const nonce = randomBytes(16).toString('base64')
  event.context.cspNonce = nonce
  const csp = buildContentSecurityPolicy({ ...origins, scriptNonce: nonce })
  setResponseHeader(event, 'Content-Security-Policy', csp)
  const reportOnly = `${csp}; report-uri ${origins.apiOrigin}/api/csp-report`
  setResponseHeader(event, 'Content-Security-Policy-Report-Only', reportOnly)
})
