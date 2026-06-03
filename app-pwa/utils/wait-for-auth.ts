/**
 * Resolves when auth bootstrap finished (loading === false).
 * Use in route middleware before checking user.
 */
export function waitForAuthReady(): Promise<void> {
  const { loading } = useAuth()
  if (!loading.value) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(
      loading,
      (isLoading) => {
        if (!isLoading) {
          stop()
          resolve()
        }
      },
      { immediate: true },
    )
  })
}
