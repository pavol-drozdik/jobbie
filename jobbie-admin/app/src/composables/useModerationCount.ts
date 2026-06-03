import { ref } from 'vue'
import { adminApi } from './adminApi'

const count = ref(0)
const canAccess = ref(true)
let loaded = false

export function useModerationCount() {
  async function refresh(): Promise<void> {
    const res = await adminApi<{ count: number }>('/admin/moderation/reports/count')
    if (res.ok && res.data) {
      count.value = res.data.count
      canAccess.value = true
      loaded = true
      return
    }
    if (res.status === 403) {
      canAccess.value = false
      count.value = 0
      loaded = true
      return
    }
    if (res.status === 401) {
      canAccess.value = false
      count.value = 0
    }
  }

  return { count, canAccess, loaded, refresh }
}
