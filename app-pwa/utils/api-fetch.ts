/** True when fetch failed or the dev proxy could not reach the Nest API. */
export function isApiUnreachableStatus(status: number): boolean {
  return status === 0 || status === 502 || status === 503 || status === 504
}

/**
 * fetch() wrapper: network errors become a synthetic 503 instead of throwing
 * (avoids unhandled rejections in Vite proxy + failed login bootstrap).
 */
export async function fetchApi(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (err) {
    if (import.meta.dev) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[api] network error', msg)
    }
    return new Response(
      JSON.stringify({
        message: 'API unreachable',
        error: 'Service Unavailable',
        statusCode: 503,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
