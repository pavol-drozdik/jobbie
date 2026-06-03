import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  buildApiGetDedupKey,
  clearApiGetDedupForTests,
  runDedupedGet,
} from '~/utils/api-get-dedup'
import type { ApiResponse } from '~/composables/useApi'

function mockResponse(status = 200): ApiResponse<{ ok: true }> {
  return { ok: status >= 200 && status < 300, status, body: '{}', data: { ok: true } }
}

describe('api-get-dedup', () => {
  beforeEach(() => {
    clearApiGetDedupForTests()
  })

  it('buildApiGetDedupKey separates auth modes', () => {
    const url = 'http://localhost:8000/api/foo'
    expect(buildApiGetDedupKey('GET', url, 'bff')).not.toBe(
      buildApiGetDedupKey('GET', url, 'bearer'),
    )
  })

  it('runDedupedGet coalesces parallel identical GETs', async () => {
    const execute = vi.fn(async () => mockResponse())
    const key = buildApiGetDedupKey('GET', 'http://localhost:8000/api/test', 'bff')
    const [a, b] = await Promise.all([
      runDedupedGet(key, execute),
      runDedupedGet(key, execute),
    ])
    expect(execute).toHaveBeenCalledTimes(1)
    expect(a).toEqual(b)
  })

  it('runDedupedGet allows retry after settle', async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(mockResponse())
    const key = buildApiGetDedupKey('GET', 'http://localhost:8000/api/retry', 'anon')
    await expect(runDedupedGet(key, execute)).rejects.toThrow('network')
    const res = await runDedupedGet(key, execute)
    expect(res.ok).toBe(true)
    expect(execute).toHaveBeenCalledTimes(2)
  })
})
