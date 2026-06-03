import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  refreshBffSessionSingleFlight,
  resetBffRefreshSingleFlightForTests,
} from './bff-refresh-single-flight'

vi.mock('~/utils/bff-session-refresh', () => ({
  refreshBffSessionFromApi: vi.fn(),
}))

import { refreshBffSessionFromApi } from '~/utils/bff-session-refresh'

describe('refreshBffSessionSingleFlight', () => {
  afterEach(() => {
    resetBffRefreshSingleFlightForTests()
    vi.clearAllMocks()
  })

  it('deduplicates concurrent refresh calls', async () => {
    let resolve!: (v: { ok: boolean; body: Record<string, unknown> }) => void
    const pending = new Promise<{ ok: boolean; body: Record<string, unknown> }>(
      (r) => {
        resolve = r
      },
    )
    vi.mocked(refreshBffSessionFromApi).mockReturnValue(pending)

    const p1 = refreshBffSessionSingleFlight('http://localhost:8000')
    const p2 = refreshBffSessionSingleFlight('http://localhost:8000')
    expect(refreshBffSessionFromApi).toHaveBeenCalledTimes(1)

    resolve({ ok: true, body: { ok: true } })
    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
  })

  it('allows a new refresh after the previous completes', async () => {
    vi.mocked(refreshBffSessionFromApi).mockResolvedValue({ ok: true, body: {} })
    await refreshBffSessionSingleFlight('http://localhost:8000')
    await refreshBffSessionSingleFlight('http://localhost:8000')
    expect(refreshBffSessionFromApi).toHaveBeenCalledTimes(2)
  })
})
