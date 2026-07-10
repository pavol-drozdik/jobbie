import { onMounted, onUnmounted, ref } from 'vue'
import type { AdminApiBootstrapStatus } from '../types/jobbie-admin-bridge'

const POLL_MS = 2000

export function useAdminApiBootstrap() {
  const status = ref<AdminApiBootstrapStatus | null>(null)
  const available = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  async function refresh(): Promise<AdminApiBootstrapStatus | null> {
    if (!window.jobbieAdmin?.getApiBootstrapStatus) {
      available.value = false
      status.value = null
      return null
    }
    available.value = true
    try {
      const next = await window.jobbieAdmin.getApiBootstrapStatus()
      status.value = next
      return next
    } catch {
      return status.value
    }
  }

  async function openUserDataFolder(): Promise<void> {
    await window.jobbieAdmin?.openUserDataFolder?.()
  }

  onMounted(() => {
    void refresh()
    if (window.jobbieAdmin) {
      timer = setInterval(() => {
        void refresh()
      }, POLL_MS)
    }
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  })

  return {
    status,
    available,
    refresh,
    openUserDataFolder,
  }
}

/** Last meaningful lines from API startup log for operator diagnostics. */
export function formatApiLogExcerpt(logTail: string, maxLines = 6): string {
  const lines = logTail
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.slice(-maxLines).join('\n')
}
