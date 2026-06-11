import { describe, expect, it } from 'vitest'

import { ROUTES } from '~/utils/app-routes'

import { filterAppNavGroups } from '~/utils/app-nav'



describe('filterAppNavGroups', () => {

  it('keeps restricted nav for guests', () => {

    const groups = filterAppNavGroups({ user: null, profile: null, authReady: true })

    const paths = groups.flatMap((g) => g.items.map((i) => i.path))

    expect(paths).toContain(ROUTES.cvHub)

    expect(paths).toContain(ROUTES.jobHub)

    expect(paths).toContain(ROUTES.myAds)

  })



  it('hides worker items and employer nav without customer_role on company account', () => {

    const groups = filterAppNavGroups({

      user: { id: 'u1', role: 'company' },

      profile: { worker_role: false, provider_role: false, customer_role: false, role: 'company' },

      authReady: true,

    })

    const paths = groups.flatMap((g) => g.items.map((i) => i.path))

    expect(paths).not.toContain(ROUTES.cvHub)

    expect(paths).not.toContain('/ponuky-na-email')

    expect(paths).not.toContain(ROUTES.jobHub)

    expect(paths).not.toContain(ROUTES.myAds)

  })



  it('shows employer group for individual with customer_role', () => {

    const groups = filterAppNavGroups({

      user: { id: 'u1', role: 'individual' },

      profile: { worker_role: false, provider_role: false, customer_role: true, role: 'individual' },

      authReady: true,

    })

    const paths = groups.flatMap((g) => g.items.map((i) => i.path))

    expect(paths).toContain(ROUTES.jobHub)

    expect(paths).not.toContain(ROUTES.cvHub)

  })



  it('hides employer group without customer_role even with worker and provider', () => {

    const groups = filterAppNavGroups({

      user: { id: 'u1', role: 'individual' },

      profile: { worker_role: true, provider_role: true, customer_role: false, role: 'individual' },

      authReady: true,

    })

    const employers = groups.find((g) => g.id === 'employers')

    expect(employers).toBeUndefined()

    const paths = groups.flatMap((g) => g.items.map((i) => i.path))

    expect(paths).toContain(ROUTES.cvHub)

    expect(paths).toContain(ROUTES.myAds)

    expect(paths).not.toContain(ROUTES.jobHub)

  })



  it('hides provider ads nav without provider_role', () => {

    const groups = filterAppNavGroups({

      user: { id: 'u1', role: 'individual' },

      profile: { worker_role: true, provider_role: false, customer_role: true, role: 'individual' },

      authReady: true,

    })

    const paths = groups.flatMap((g) => g.items.map((i) => i.path))

    expect(paths).not.toContain(ROUTES.myAds)

    expect(paths).toContain(ROUTES.jobHub)

  })

})

