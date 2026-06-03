import type { ApiResponse } from '~/composables/useApi'

/** In-flight GET deduplication only — no TTL response cache. */
const inFlightGets = new Map<string, Promise<ApiResponse<unknown>>>()

export type ApiGetAuthMode = 'bff' | 'bearer' | 'anon'

export function buildApiGetDedupKey(
  method: string,
  url: string,
  authMode: ApiGetAuthMode,
): string {
  return `${method}:${url}:${authMode}`
}

export function runDedupedGet<T>(
  key: string,
  execute: () => Promise<ApiResponse<T>>,
): Promise<ApiResponse<T>> {
  const existing = inFlightGets.get(key)
  if (existing) {
    return existing as Promise<ApiResponse<T>>
  }
  const promise = execute().finally(() => {
    inFlightGets.delete(key)
  })
  inFlightGets.set(key, promise as Promise<ApiResponse<unknown>>)
  return promise
}

export function clearApiGetDedupForTests(): void {
  inFlightGets.clear()
}
