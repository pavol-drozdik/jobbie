import { clearApiGetDedupForTests } from '~/utils/api-get-dedup'
import { clearBffRefreshInFlight } from '~/utils/bff-refresh-single-flight'
import { registerAppHmrGuard } from '~/utils/hmr-guard'
import { clearSessionExpiryInFlight } from '~/utils/session-expiry'

/**
 * Reset in-flight API/auth work on HMR so stale promises do not cascade into
 * hundreds of parallel sign-outs and PromiseRejectionHandledWarning noise.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.hot) {
    return
  }
  registerAppHmrGuard()
  import.meta.hot.on('vite:beforeUpdate', () => {
    clearBffRefreshInFlight()
    clearSessionExpiryInFlight()
    clearApiGetDedupForTests()
  })
})
