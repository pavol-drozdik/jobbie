import { ROUTES } from '~/utils/app-routes'



export const PROFILE_TAB_IDS = [

  'personal',

  'saved',

  'plans',

  'public-profile',

] as const



export type ProfileTabId = (typeof PROFILE_TAB_IDS)[number]



export function isProfileTabId(value: unknown): value is ProfileTabId {

  return typeof value === 'string' && (PROFILE_TAB_IDS as readonly string[]).includes(value)

}



export function normalizeProfileTab(raw: unknown): ProfileTabId {

  if (raw === 'my-offers') return 'personal'

  if (raw === 'reviews') return 'public-profile'

  if (raw === 'settings') return 'personal'

  if (!isProfileTabId(raw)) return 'personal'

  return raw

}



export function useProfileTab() {

  const route = useRoute()

  const router = useRouter()

  const activeTab = computed((): ProfileTabId => {

    return normalizeProfileTab(route.query.tab)

  })

  async function goToTab(tab: ProfileTabId): Promise<void> {

    await router.replace({ path: ROUTES.profile, query: { tab } })

  }

  return { activeTab, goToTab, PROFILE_TAB_IDS }

}

