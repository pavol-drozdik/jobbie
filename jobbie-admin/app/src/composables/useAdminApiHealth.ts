import { onMounted, ref } from 'vue'
import { ADMIN_API_BASE_URL } from '../config/admin-api-url'

const baseUrl = ADMIN_API_BASE_URL

export function useAdminApiHealth() {
  const reachable = ref<boolean | null>(null)
  const checking = ref(false)
  const message = ref('')

  async function check(): Promise<boolean> {
    checking.value = true
    try {
      const res = await fetch(`${baseUrl}/health`, { cache: 'no-store' })
      const data = (await res.json()) as { ok?: boolean }
      const ok = res.ok && data?.ok === true
      reachable.value = ok
      message.value = ok
        ? ''
        : `Health check failed (HTTP ${res.status}) at ${baseUrl}/health`
      return ok
    } catch (err) {
      reachable.value = false
      const detail = err instanceof Error ? err.message : 'Network error'
      message.value = `Admin API unreachable (${baseUrl}): ${detail}`
      return false
    } finally {
      checking.value = false
    }
  }

  async function checkWithRetry(
    maxAttempts = 15,
    delayMs = 1000,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (await check()) return true
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
    }
    return false
  }

  onMounted(() => {
    void checkWithRetry()
  })

  return {
    baseUrl,
    reachable,
    checking,
    message,
    check,
    checkWithRetry,
  }
}
