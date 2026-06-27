/**
 * Tracks dirty CV section row IDs and flushes all pending saves (not just the last debounced id).
 */
export function useCvSectionSaveQueue(saveRow: (id: string) => Promise<void>) {
  const dirtyIds = new Set<string>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null

  function markDirty(id: string): void {
    dirtyIds.add(id)
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void flush()
    }, 600)
  }

  function isDirty(id: string): boolean {
    return dirtyIds.has(id)
  }

  function hasDirty(): boolean {
    return dirtyIds.size > 0
  }

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    while (true) {
      if (inFlight) {
        await inFlight
      }

      const ids = [...dirtyIds]
      if (ids.length === 0) return

      const task = (async () => {
        for (const id of ids) {
          try {
            await saveRow(id)
            dirtyIds.delete(id)
          } catch (err) {
            // Keep id dirty so a later flush can retry.
            throw err
          }
        }
      })()

      inFlight = task
      try {
        await task
      } catch (err) {
        throw err
      } finally {
        inFlight = null
      }
    }
  }

  function clearDirty(id: string): void {
    dirtyIds.delete(id)
  }

  return { markDirty, flush, isDirty, hasDirty, clearDirty }
}
