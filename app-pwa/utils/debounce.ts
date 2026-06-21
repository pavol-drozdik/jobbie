/**
 * Returns a debounced wrapper that delays `fn` until `ms` after the last call.
 * Call `.cancel()` to clear a pending invocation.
 */
export function useDebouncedFn<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): T & { cancel: () => void; flush: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingArgs: Parameters<T> | null = null

  const debounced = ((...args: Parameters<T>) => {
    pendingArgs = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      const callArgs = pendingArgs
      pendingArgs = null
      if (callArgs) fn(...callArgs)
    }, ms)
  }) as T & { cancel: () => void; flush: () => void }

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    pendingArgs = null
  }

  debounced.flush = () => {
    if (!timer || !pendingArgs) return
    clearTimeout(timer)
    timer = null
    const callArgs = pendingArgs
    pendingArgs = null
    fn(...callArgs)
  }

  return debounced
}
