export function useSettingsFeedback() {
  const loading = ref(false)
  const flash = ref<string | null>(null)
  const error = ref<string | null>(null)

  function clearMessages(): void {
    flash.value = null
    error.value = null
  }

  async function runAction(
    fn: () => Promise<void>,
    options?: { successMessage?: string },
  ): Promise<boolean> {
    if (loading.value) {
      return false
    }
    clearMessages()
    loading.value = true
    try {
      await fn()
      if (options?.successMessage) {
        flash.value = options.successMessage
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return false
    } finally {
      loading.value = false
    }
  }

  return { loading, flash, error, clearMessages, runAction }
}
