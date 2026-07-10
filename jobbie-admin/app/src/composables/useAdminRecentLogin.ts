import { computed, ref } from 'vue'
import { ADMIN_API_BASE_URL } from '../config/admin-api-url'

const DEFAULT_RECENT_LOGIN_MINUTES = 120
const WARN_BEFORE_MINUTES = 5

const baseUrl = ADMIN_API_BASE_URL

const recentLoginMinutes = ref(DEFAULT_RECENT_LOGIN_MINUTES)
let configLoaded = false
let configPromise: Promise<number> | null = null

export async function ensureAdminRecentLoginConfig(): Promise<number> {
  if (configLoaded) {
    return recentLoginMinutes.value
  }
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' })
        const data = (await res.json()) as { recentLoginMinutes?: number }
        if (
          typeof data.recentLoginMinutes === 'number' &&
          data.recentLoginMinutes > 0
        ) {
          recentLoginMinutes.value = data.recentLoginMinutes
        }
      } catch {
        /* keep default */
      }
      configLoaded = true
      return recentLoginMinutes.value
    })()
  }
  return configPromise
}

export function useAdminRecentLogin() {
  const recentLoginSec = computed(
    () => recentLoginMinutes.value * 60,
  )
  const warnBeforeSec = computed(() =>
    Math.min(WARN_BEFORE_MINUTES * 60, Math.floor(recentLoginSec.value / 4)),
  )

  return {
    recentLoginMinutes,
    recentLoginSec,
    warnBeforeSec,
    ensureAdminRecentLoginConfig,
  }
}
