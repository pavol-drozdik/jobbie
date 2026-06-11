import { ROUTES } from '~/utils/app-routes'



/** Capability required to use a nav destination (signed-in users only). */

export type NavAccessKey = 'worker' | 'provider' | 'customer'



const PATH_NAV_ACCESS = new Map<string, NavAccessKey>([

  [ROUTES.cvHub, 'worker'],

  ['/ponuky-na-email', 'worker'],

  [ROUTES.jobHub, 'customer'],

  [ROUTES.foreignJobHub, 'customer'],

  [ROUTES.applicants, 'customer'],

  ['/databaza-zivotopisov', 'customer'],

  [ROUTES.myAds, 'provider'],

])



export type NavAccessContext = {

  user: { role?: string } | null | undefined

  profile: {

    worker_role?: boolean

    provider_role?: boolean

    customer_role?: boolean

    role?: string

  } | null | undefined

  authReady: boolean

}



export function navAccessKeyForPath(path: string | undefined): NavAccessKey | null {

  if (!path) {

    return null

  }

  return PATH_NAV_ACCESS.get(path) ?? null

}



export function hasCustomerRole(ctx: NavAccessContext): boolean {

  return Boolean(ctx.profile?.customer_role)

}



export function hasWorkerRole(ctx: NavAccessContext): boolean {

  return Boolean(ctx.profile?.worker_role)

}



export function hasProviderRole(ctx: NavAccessContext): boolean {

  return Boolean(ctx.profile?.provider_role)

}



/** Guests see all nav links (marketing); signed-in users need the matching activity flag. */

export function canShowNavPath(path: string | undefined, ctx: NavAccessContext): boolean {

  const key = navAccessKeyForPath(path)

  if (!key) {

    return true

  }

  if (!ctx.user) {

    return true

  }

  if (!ctx.authReady || !ctx.profile) {

    return false

  }

  if (key === 'worker') {

    return hasWorkerRole(ctx)

  }

  if (key === 'provider') {

    return hasProviderRole(ctx)

  }

  return hasCustomerRole(ctx)

}

