import { describe, expect, it } from 'vitest'

import { ROUTES } from '~/utils/app-routes'

import { canShowNavPath } from '~/utils/account-nav-access'



const signedIn = { user: { id: 'u1', role: 'individual' as const }, authReady: true }



describe('canShowNavPath', () => {

  it('allows restricted paths for guests', () => {

    expect(

      canShowNavPath(ROUTES.cvHub, { user: null, profile: null, authReady: true }),

    ).toBe(true)

    expect(

      canShowNavPath(ROUTES.jobHub, { user: null, profile: null, authReady: true }),

    ).toBe(true)

  })



  it('hides worker paths without worker_role', () => {

    const ctx = {

      ...signedIn,

      profile: { worker_role: false, provider_role: true, customer_role: true, role: 'individual' },

    }

    expect(canShowNavPath(ROUTES.cvHub, ctx)).toBe(false)

    expect(canShowNavPath('/ponuky-na-email', ctx)).toBe(false)

    expect(canShowNavPath(ROUTES.find, ctx)).toBe(true)

  })



  it('hides provider paths without provider_role', () => {

    const ctx = {

      ...signedIn,

      profile: { worker_role: true, provider_role: false, customer_role: true, role: 'individual' },

    }

    expect(canShowNavPath(ROUTES.myAds, ctx)).toBe(false)

  })



  it('hides employer paths without customer_role', () => {

    const ctx = {

      ...signedIn,

      profile: { worker_role: true, provider_role: true, customer_role: false, role: 'individual' },

    }

    expect(canShowNavPath(ROUTES.jobHub, ctx)).toBe(false)

    expect(canShowNavPath(ROUTES.applicants, ctx)).toBe(false)

    expect(canShowNavPath('/databaza-zivotopisov', ctx)).toBe(false)

  })



  it('shows employer paths for individual with customer_role', () => {

    const ctx = {

      ...signedIn,

      profile: { worker_role: false, provider_role: false, customer_role: true, role: 'individual' },

    }

    expect(canShowNavPath(ROUTES.jobHub, ctx)).toBe(true)

    expect(canShowNavPath(ROUTES.cvHub, ctx)).toBe(false)

  })



  it('hides employer paths for company account without customer_role', () => {

    const ctx = {

      user: { id: 'u1', role: 'company' as const },

      authReady: true,

      profile: { worker_role: false, provider_role: false, customer_role: false, role: 'company' },

    }

    expect(canShowNavPath(ROUTES.jobHub, ctx)).toBe(false)

    expect(canShowNavPath(ROUTES.cvHub, ctx)).toBe(false)

  })

})

