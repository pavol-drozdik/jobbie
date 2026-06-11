import { canShowNavPath, type NavAccessContext } from '~/utils/account-nav-access'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import type { AppIconName } from '~/utils/app-icons'

export type AppNavItem = {
  to?: string
  path?: string
  label: string
  icon: AppIconName
  description?: string
  placeholder?: boolean
  home?: boolean
}

export type AppNavGroup = {
  id: string
  label: string
  items: AppNavItem[]
}

const JOBSEEKER_CV_NAV_ITEM: AppNavItem = {
  to: ROUTES.cvHub,
  path: ROUTES.cvHub,
  label: S.navCvBuilderTitle,
  icon: 'file-lines',
  description: S.navCvBuilderDescription,
}

/** Static app header nav; filter with {@link filterAppNavGroups} for signed-in users. */
export const APP_NAV_GROUPS: AppNavGroup[] = [
  {
    id: 'jobseekers',
    label: 'Pre uchádzačov o prácu',
    items: [
      {
        to: ROUTES.find,
        path: ROUTES.find,
        label: 'Pozri ponuky',
        icon: 'briefcase',
        description: 'Prezri si aktuálne pracovné ponuky od overených zamestnávateľov.',
      },
      {
        to: ROUTES.foreignFind,
        path: ROUTES.foreignFind,
        label: 'Zahraničné ponuky',
        icon: 'map-pin',
        description: 'Pracovné ponuky v zahraničí — turnusová práca a ďalšie úväzky.',
      },
      JOBSEEKER_CV_NAV_ITEM,
      {
        to: '/ponuky-na-email',
        path: '/ponuky-na-email',
        label: S.jobEmailAlertsPageTitle,
        icon: 'bell',
        description: S.jobAlertsNavMenuDescription,
      },
    ],
  },
  {
    id: 'employers',
    label: 'Pre zamestnávateľov',
    items: [
      {
        to: ROUTES.jobHub,
        path: ROUTES.jobHub,
        label: 'Vytvor pracovnú ponuku',
        icon: 'plus',
        description: 'Pridaj pracovnú ponuku a oslov vhodných kandidátov.',
      },
      {
        to: ROUTES.foreignJobHub,
        path: ROUTES.foreignJobHub,
        label: 'Zahraničná ponuka',
        icon: 'plus',
        description: 'Vytvor a spravuj zahraničné pracovné ponuky.',
      },
      {
        to: ROUTES.applicants,
        path: ROUTES.applicants,
        label: 'Spravuj uchádzačov',
        icon: 'users',
        description: 'Prezeraj, filtruj a spravuj uchádzačov o tvoje pracovné pozície.',
      },
      {
        to: '/databaza-zivotopisov',
        path: '/databaza-zivotopisov',
        label: S.navCvDatabaseTitle,
        icon: 'id-card',
        description: S.navCvDatabaseDescription,
      },
    ],
  },
  {
    id: 'professionals',
    label: 'Profesionáli',
    items: [
      {
        to: ROUTES.professionalsCatalog,
        path: ROUTES.professionalsCatalog,
        label: 'Nájsť profesionála',
        icon: 'search',
        description: 'Nájdi firmu alebo odborníka na služby vo svojom okolí.',
      },
      {
        to: ROUTES.myAds,
        path: ROUTES.myAds,
        label: S.firmyNavMyAds,
        icon: 'plus',
        description: 'Vytvor reklamu pre svoju firmu alebo ponúkanú službu.',
      },
    ],
  },
]

export const APP_NAV_SINGLES: AppNavItem[] = [
  { to: '/cennik', path: '/cennik', label: 'Cenník', icon: 'currency' },
  { to: '/blog', path: '/blog', label: 'Blog', icon: 'bookmark' },
]

export type FilterAppNavGroupsInput = NavAccessContext & {
  user: { id: string; role?: string } | null | undefined
}

/** Hide nav entries the signed-in user cannot use; drop empty groups. */
export function filterAppNavGroups(input: FilterAppNavGroupsInput): AppNavGroup[] {
  return APP_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canShowNavPath(item.path, input)),
  })).filter((group) => group.items.length > 0)
}
