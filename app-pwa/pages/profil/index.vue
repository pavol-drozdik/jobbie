<template>

  <div

    class="profile-design-page mx-auto box-border w-full max-w-[1300px] px-5 pb-20 pt-2 font-dmSans text-black lg:pb-[80px] lg:pt-6"

  >

    <div class="flex flex-col gap-[28px] max-lg:max-w-full lg:flex-row lg:items-start">

      <aside

        class="flex w-full min-w-0 flex-col gap-0.5 rounded-[20px] bg-white px-3.5 py-5 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] max-lg:flex-row max-lg:flex-wrap max-lg:p-3 lg:mt-0 lg:w-64 lg:min-w-[256px] lg:max-w-[256px] lg:flex-col lg:self-start"

      >

        <div class="mb-1 flex min-w-0 max-lg:flex-1 items-center gap-3.5 px-2.5 pb-[18px] pt-2.5">

          <div

            class="flex h-12 w-12 min-h-12 min-w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-marketing-green font-dmSans text-[17px] font-bold text-white"

          >

            <img

              v-if="avatarSrc"

              :src="avatarSrc"

              alt=""

              class="h-full w-full object-cover"

            >

            <span v-else>{{ sidebarInitials }}</span>

          </div>

          <div class="min-w-0">

            <p class="truncate font-dmSans text-[17px] font-bold leading-tight text-black">

              {{ headerDisplayName }}

            </p>

            <p class="mt-[3px] truncate font-dmSans text-[13px] text-black/40">

              {{ user?.email }}

            </p>

          </div>

        </div>

        <p

          class="m-0 px-3 pb-1.5 pt-3.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30 max-lg:w-full"

        >

          {{ S.profileSidebarGroupMain }}

        </p>

        <nav class="flex w-full flex-col gap-0.5 max-lg:flex-1 max-lg:min-w-[200px]" aria-label="Profil">

          <NuxtLink

            :to="{ path: ROUTES.profile, query: { tab: 'personal' } }"

            replace

            :class="sbNavClass(activeTab === 'personal')"

            :aria-current="activeTab === 'personal' ? 'page' : undefined"

          >

            <AppIcon name="user" :size="14" class="w-[18px] shrink-0 text-center" />

            <span>{{ S.profileNavPersonal }}</span>

          </NuxtLink>

          <NuxtLink

            :to="{ path: ROUTES.profile, query: { tab: 'saved' } }"

            replace

            :class="sbNavClass(activeTab === 'saved')"

            :aria-current="activeTab === 'saved' ? 'page' : undefined"

          >

            <AppIcon name="bookmark" :size="14" class="w-[18px] shrink-0 text-center" />

            <span>{{ S.profileNavSaved }}</span>

          </NuxtLink>

          <NuxtLink

            v-if="showProfileStatsNav"

            :to="profileStatsDashboardTo"

            :class="sbNavClass(false)"

          >

            <AppIcon name="chart-line" :size="14" class="w-[18px] shrink-0 text-center" />

            <span>{{ S.profilePublicStatsTitle }}</span>

          </NuxtLink>

          <NuxtLink

            :to="{ path: ROUTES.profile, query: { tab: 'plans' } }"

            replace

            :class="sbNavClass(activeTab === 'plans')"

            :aria-current="activeTab === 'plans' ? 'page' : undefined"

          >

            <AppIcon name="star" :size="14" class="w-[18px] shrink-0 text-center" />

            <span>{{ S.profileNavPlans }}</span>

          </NuxtLink>

          <NuxtLink

            v-if="user?.id"

            :to="{ path: ROUTES.profile, query: { tab: 'public-profile' } }"

            replace

            :class="sbNavClass(activeTab === 'public-profile')"

            :aria-current="activeTab === 'public-profile' ? 'page' : undefined"

          >

            <AppIcon name="id-card" :size="14" class="w-[18px] shrink-0 text-center" />

            <span>{{ S.profileNavReviews }}</span>

          </NuxtLink>

        </nav>

        <p

          class="m-0 w-full px-3 pb-1.5 pt-3.5 font-dmSans text-[12px] font-bold uppercase tracking-[0.08em] text-black/30"

        >

          {{ S.profileSidebarGroupSettings }}

        </p>

        <NuxtLink

          to="/nastavenia"

          :class="sbNavClass(false)"

        >

          <AppIcon name="settings" :size="14" class="w-[18px] shrink-0 text-center" />

          <span>{{ S.profileNavSettings }}</span>

        </NuxtLink>

        <div class="mt-6 w-full border-t border-black/[0.07] pt-3.5 max-lg:mt-4 max-lg:flex-[1_1_100%]">

          <div

            class="flex items-center justify-between px-3.5 py-2.5 font-dmSans text-[15px] font-medium text-black/50"

          >

            <span>{{ S.profileCoinsLabel }}</span>

            <span

              class="rounded-full bg-marketing-green px-3 py-0.5 font-dmSans text-[14px] font-bold leading-none text-white"

            >

              {{ creditsDisplay }}

            </span>

          </div>

          <button

            type="button"

            class="flex w-full items-center gap-2.5 rounded-xl py-[11px] pl-3.5 pr-3 font-dmSans text-base font-semibold text-[#ef4444] transition-colors hover:bg-[#fef2f2]"

            @click="handleSignOut"

          >

            <AppIcon name="arrow-right" :size="16" class="shrink-0 rotate-180" />

            <span>{{ S.logout }}</span>

          </button>

        </div>

      </aside>

      <main ref="mainContentRef" class="flex min-w-0 flex-1 flex-col gap-5">

        <template v-if="activeTab === 'personal'">

          <ProfilePersonalHero

            :detail="detail"

            :header-name="headerDisplayName"

            :avatar-src="avatarSrc"

          >

            <template #actions>

              <AppButton

                type="button"

                :variant="editProfileOpen ? 'primary' : 'ghost'"

                size="md"

                class="rounded-full border-[1.5px] px-[22px] py-2.5 text-base font-semibold transition-colors"

                :class="

                  editProfileOpen

                    ? 'border-marketing-green hover:opacity-90 [&_svg]:text-white'

                    : 'border-[#e5e7eb] !bg-marketing-surface !text-black/60 hover:!border-marketing-green hover:!bg-marketing-surface hover:!text-marketing-green'

                "

                @click="editProfileOpen = !editProfileOpen"

              >

                <AppIcon :name="editProfileOpen ? 'x' : 'pencil'" :size="16" />

                {{ editProfileOpen ? S.profileHeroCloseEditor : S.profileHeroEdit }}

              </AppButton>

            </template>

          </ProfilePersonalHero>

          <div

            class="overflow-hidden transition-[max-height] duration-500 ease-in-out"

            :class="editProfileOpen ? 'max-h-[4000px]' : 'max-h-0'"

          >

            <div :class="editProfileOpen ? '' : 'pointer-events-none'">

              <ProfileSettingsForm
                :show-section-headings="false"
                :show-roles-section="false"
                :show-footer-links="false"
                show-cancel
                @saved="onProfileSaved"
                @cancel="editProfileOpen = false"
              />

            </div>

          </div>

        </template>

        <div v-else-if="activeTab === 'saved'" class="flex flex-col gap-5">

          <h2 :class="pPageTitle">

            {{ S.profileNavSaved }}

          </h2>

          <ProfileSavedPanel />

        </div>

        <div v-else-if="activeTab === 'plans'" class="flex flex-col gap-5">

          <h2 :class="pPageTitle">

            {{ S.profileNavPlans }}

          </h2>

          <ProfileSubscriptionStatusPanel />

        </div>

        <div v-else-if="activeTab === 'public-profile' && user?.id" class="flex flex-col gap-5">

          <h2 :class="pPageTitle">

            {{ S.profileNavReviews }}

          </h2>

          <ProfileReviewsPanel :profile-id="user.id" />

        </div>

      </main>

    </div>

  </div>

</template>



<script setup lang="ts">

import { ROUTES } from '~/utils/app-routes'
import {
  hasProfileStatsAccess,
  resolveProfileStatsDashboardPath,
} from '~/utils/dashboard-default-route'
import { S } from '~/utils/strings'

import type { ProfileDetailPayload } from '~/components/profile/PublicProfileCard.vue'

definePageMeta({ layout: 'app', middleware: ['auth'] })



function sbNavClass(isActive: boolean): string {

  const base =

    'm-0 flex w-full is-clickable items-center gap-3 rounded-xl border-0 bg-transparent py-[11px] px-3.5 text-left font-dmSans text-base no-underline transition-colors outline-none'

  if (isActive) {

    return `${base} bg-marketing-panel font-bold text-marketing-green`

  }

  return `${base} font-medium text-black/60 hover:bg-marketing-mint hover:text-marketing-green`

}



const pPageTitle = 'm-0 font-dmSans text-[34px] font-extrabold leading-none text-black'



const { user, profile, session, signOut } = useAuth()

const showProfileStatsNav = computed(() => hasProfileStatsAccess(profile.value))

const profileStatsDashboardTo = computed(() =>
  resolveProfileStatsDashboardPath(profile.value),
)

const { api } = useApi()

const route = useRoute()

const router = useRouter()

const { activeTab } = useProfileTab()



const detail = ref<ProfileDetailPayload | null>(null)

const editProfileOpen = ref(false)

const mainContentRef = ref<HTMLElement | null>(null)



/** Tailwind `lg` breakpoint: above this, sidebar is on the side and no auto-scroll needed. */

const DESKTOP_MIN_PX = 1024

/**

 * Sticky app header reserves ~3.5rem + spacing + safe-area; matches `app-layout-main` padding-top

 * in `layouts/app.vue`. Slight extra (8px) keeps the section title visible below the header.

 */

const STICKY_HEADER_OFFSET_PX = 80



function scrollMainContentIntoViewIfMobile(): void {

  if (!import.meta.client) {

    return

  }

  if (window.innerWidth >= DESKTOP_MIN_PX) {

    return

  }

  const el = mainContentRef.value

  if (!el) {

    return

  }

  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_HEADER_OFFSET_PX

  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })

}



const headerDisplayName = computed((): string => {

  const p = detail.value?.profile

  if (!p) {

    const auth = profile.value

    if (auth?.company_name?.trim()) return auth.company_name.trim()

    if (auth?.display_name?.trim()) return auth.display_name.trim()

    return user.value?.email?.split('@')[0] ?? '—'

  }

  if (p.role === 'company') {

    return p.company_name?.trim() || p.display_name?.trim() || '—'

  }

  return p.display_name?.trim() || '—'

})



const sidebarInitials = computed((): string => {

  const name = headerDisplayName.value

  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2)

  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'

})



const avatarSrc = computed((): string => {

  const p = detail.value?.profile

  if (!p) return ''

  if (p.role === 'company') {

    return p.logo_url || p.avatar_url || ''

  }

  return p.avatar_url || p.logo_url || ''

})



const creditsDisplay = computed((): number => {

  if (detail.value?.owner) return detail.value.owner.credits

  return profile.value?.credits ?? 0

})



async function loadSidebar(): Promise<void> {

  if (!user.value?.id || !session.value?.access_token) return

  const res = await api<ProfileDetailPayload>(`/api/profiles/${user.value.id}`)

  if (res.ok && res.data) {

    detail.value = res.data

  }

}



async function onProfileSaved(): Promise<void> {

  await loadSidebar()

  editProfileOpen.value = false

}



async function handleSignOut(): Promise<void> {

  await signOut()

  await navigateTo('/auth/login', { replace: true })

}



watch(

  () => [route.path, route.query.tab] as const,

  () => {

    if (route.path !== ROUTES.profile) return

    const tab = route.query.tab

    if (tab === 'applicants') {

      void router.replace({ path: ROUTES.profile, query: { ...route.query, tab: 'personal' } })

      return

    }

    if (tab === 'provider' || tab === 'customer') {

      void navigateTo(resolveProfileStatsDashboardPath(profile.value), { replace: true })

      return

    }

    if (tab === 'buy-credits') {

      void navigateTo('/cennik', { replace: true })

    }

  },

  { immediate: true },

)



watch(activeTab, async (tab, prev) => {

  if (tab === 'settings') {

    void navigateTo('/nastavenia', { replace: true })

    return

  }

  if (tab !== 'personal') editProfileOpen.value = false

  if (tab === prev) return

  await nextTick()

  scrollMainContentIntoViewIfMobile()

})



onMounted(() => {

  void loadSidebar()

})

</script>

