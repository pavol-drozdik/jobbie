<template>
  <div
    class="flex min-h-dvh min-w-0 flex-col bg-marketing-mint font-dmSans text-black/80 [box-sizing:border-box] *:box-border"
  >
    <header
      class="safe-area-pt fixed left-0 right-0 top-0 z-[110] flex justify-center px-[10px] marketing:px-[15px]"
      aria-label="Hlavná navigácia"
    >
      <div
        class="mx-auto mt-2.5 flex h-[70px] w-full max-w-[2000px] items-center justify-between gap-3 rounded-full bg-white px-[15px] shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"
      >
        <div class="relative flex h-full w-full items-center gap-2 marketing:gap-3">
          <AppBrandLogo
            :link-to="ROUTES.home"
            variant="full"
            root-class="relative z-10 ml-[10px]"
            image-class="h-8 w-auto max-w-[min(100%,11rem)]"
          />
          <nav
            class="hidden min-w-0 flex-1 flex-wrap justify-center marketing:flex"
            aria-label="Odkazy"
          >
            <div class="flex flex-wrap items-center justify-center gap-1.5">
              <div
                v-for="group in navGroups"
                :key="group.id"
                class="relative"
                @mouseenter="openDesktopGroup(group.id)"
                @mouseleave="closeDesktopGroup(group.id)"
                @focusin="openDesktopGroup(group.id)"
                @focusout="onDesktopGroupFocusOut(group.id, $event)"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[20px] font-semibold text-black/80 transition-colors outline-none ring-marketing-green hover:text-marketing-green focus-visible:ring-2"
                  :aria-expanded="desktopOpenGroupId === group.id"
                  :aria-controls="`nav-group-${group.id}`"
                  @click="toggleDesktopGroup(group.id)"
                  @keydown.enter.prevent="toggleDesktopGroup(group.id)"
                  @keydown.space.prevent="toggleDesktopGroup(group.id)"
                >
                  <span>{{ group.label }}</span>
                  <AppIcon
                    name="chevron-down"
                    :size="16"
                    class="shrink-0 transition-transform"
                    :class="desktopOpenGroupId === group.id ? 'rotate-180' : ''"
                  />
                </button>
                <div
                  v-show="desktopOpenGroupId === group.id"
                  :id="`nav-group-${group.id}`"
                  class="absolute left-1/2 top-full z-30 w-[22rem] -translate-x-1/2"
                  role="menu"
                >
                  <div class="h-2" aria-hidden="true" />
                  <div class="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                  <template v-for="item in group.items" :key="`${group.id}-${item.label}`">
                    <NuxtLink
                      v-if="item.to"
                      :to="item.to"
                      role="menuitem"
                      class="flex items-center gap-3 rounded-xl px-3.5 py-3 no-underline transition-colors hover:bg-marketing-mint"
                      :class="itemActive(item) ? 'bg-marketing-mint text-marketing-green' : 'text-black/80'"
                      @click="onNavItemActivate(item.to, $event)"
                    >
                      <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                      <span class="min-w-0">
                        <span class="block text-[20px] font-semibold leading-tight">{{ item.label }}</span>
                          <span v-if="item.description" class="mt-0.5 block text-[14px] leading-tight text-black/45">{{ item.description }}</span>
                      </span>
                    </NuxtLink>
                    <div
                      v-else
                      class="flex items-center gap-3 rounded-xl px-3.5 py-3 text-black/80"
                    >
                      <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                      <span class="min-w-0">
                        <span class="block text-[20px] font-semibold leading-tight">{{ item.label }}</span>
                          <span v-if="item.description" class="mt-0.5 block text-[14px] leading-tight text-black/45">{{ item.description }}</span>
                      </span>
                    </div>
                  </template>
                  </div>
                </div>
              </div>
              <template v-for="item in navSingles" :key="item.label">
                <NuxtLink
                  v-if="item.to && !item.placeholder"
                  :to="item.to"
                  class="inline-flex items-center rounded-full px-3 py-1.5 text-[20px] font-semibold text-black/80 no-underline transition-colors outline-none ring-marketing-green hover:text-marketing-green focus-visible:ring-2"
                >
                  {{ item.label }}
                </NuxtLink>
                <span
                  v-else
                  class="inline-flex is-disabled-cursor items-center rounded-full px-3 py-1.5 text-[20px] font-semibold text-black/40"
                  aria-disabled="true"
                >
                  {{ item.label }}
                </span>
              </template>
            </div>
          </nav>
          <div class="relative z-10 ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <template v-if="showGuestAuth">
              <div class="hidden items-center gap-2 marketing:flex">
                <NuxtLink
                  :to="registerTo"
                  class="inline-flex h-10 is-clickable items-center justify-center whitespace-nowrap rounded-full border-none bg-white px-4 text-[20px] font-bold text-marketing-green no-underline"
                >
                  {{ S.navRegister }}
                </NuxtLink>
                <NuxtLink
                  :to="loginTo"
                  class="inline-flex h-10 is-clickable items-center justify-center whitespace-nowrap rounded-full border-none bg-marketing-green px-4 text-[20px] font-bold text-white no-underline"
                >
                  {{ S.signIn }}
                </NuxtLink>
              </div>
            </template>
            <template v-else-if="showUserAuth">
              <div class="hidden items-center gap-0.5 marketing:flex">
                <AppNotificationBell variant="desktop" />
                <NuxtLink
                  :to="navItemMessages.to"
                  class="relative inline-flex size-10 items-center justify-center rounded-xl outline-none ring-marketing-green transition-colors focus-visible:ring-2"
                  :class="
                    itemActive(navItemMessages)
                      ? 'bg-marketing-mint text-marketing-green'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  "
                  :aria-label="S.navSpravy"
                  :title="S.navSpravy"
                >
                  <AppIcon :name="navItemMessages.icon" :size="20" class="shrink-0" aria-hidden="true" />
                </NuxtLink>
              </div>
              <NuxtLink
                :to="navItemProfile.to"
                class="hidden h-10 max-w-[18rem] is-clickable items-center gap-1.5 rounded-full border-none bg-transparent px-3 text-[20px] font-semibold text-black/80 no-underline marketing:inline-flex"
              >
                <AppIcon :name="navItemProfile.icon" :size="20" class="shrink-0" />
                <span class="hidden min-w-0 whitespace-nowrap min-[480px]:inline">{{ profileNavLabel }}</span>
              </NuxtLink>
              <AppNotificationBell class="shrink-0 marketing:hidden" variant="mobile" />
            </template>
            <button
              type="button"
              class="marketing:hidden relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-black/85 outline-none ring-marketing-green transition-colors hover:bg-black/5 focus-visible:ring-2"
              :aria-label="mobileNavOpen ? S.navCloseMenu : S.navOpenMenu"
              :aria-expanded="mobileNavOpen"
              aria-controls="app-mobile-nav-dropdown"
              @click="toggleMobileNav"
            >
              <AppIcon :name="mobileNavOpen ? 'x' : 'menu'" :size="24" />
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <main
        class="app-layout-main flex w-full min-h-0 min-w-0 flex-1 flex-col pb-6"
        :class="{ 'app-layout-main--flush-top': layoutMainFlushTop }"
      >
        <slot />
      </main>
      <AppSiteFooter />
    </div>

    <Teleport to="body">
      <div
        v-if="mobileNavOpen"
        class="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] marketing:hidden"
        aria-hidden="true"
        @click="closeMobileNav"
      />
      <div
        v-if="mobileNavOpen"
        id="app-mobile-nav-dropdown"
        class="marketing:hidden fixed left-3 right-3 z-[101] mt-5 flex max-h-[min(78vh,calc(100dvh-5rem))] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
        :style="{
          top: 'calc(0.625rem + 3.5rem + max(0.25rem, env(safe-area-inset-top, 0px)))',
        }"
        role="navigation"
        :aria-label="S.navDrawerTitle"
        @click.stop
      >
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2 py-3">
            <div
              v-for="group in navGroups"
              :key="`drawer-${group.id}`"
              class="rounded-xl border border-black/5"
            >
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-base font-semibold text-black/80 transition-colors hover:text-marketing-green"
                :aria-expanded="mobileOpenGroups[group.id] ? 'true' : 'false'"
                :aria-controls="`drawer-group-${group.id}`"
                @click="toggleMobileGroup(group.id)"
              >
                <span>{{ group.label }}</span>
                <AppIcon
                  name="chevron-down"
                  :size="18"
                  class="shrink-0 transition-transform"
                  :class="mobileOpenGroups[group.id] ? 'rotate-180' : ''"
                />
              </button>
              <div
                v-if="mobileOpenGroups[group.id]"
                :id="`drawer-group-${group.id}`"
                class="flex flex-col gap-1 px-2.5 pb-2.5"
              >
                <template v-for="item in group.items" :key="`drawer-${group.id}-${item.label}`">
                  <NuxtLink
                    v-if="item.to"
                    :to="item.to"
                    class="flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-semibold no-underline transition-colors"
                    :class="itemActive(item) ? 'bg-marketing-mint text-marketing-green' : 'text-black/80 hover:bg-black/[0.04]'"
                    @click="onNavItemActivate(item.to, $event)"
                  >
                    <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </NuxtLink>
                  <div
                    v-else
                    class="flex items-center gap-3 rounded-xl px-3.5 py-3 text-base font-semibold text-black/80"
                  >
                    <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                    <span class="min-w-0 truncate">{{ item.label }}</span>
                  </div>
                </template>
              </div>
            </div>
            <div class="mt-1 flex flex-col gap-0.5">
              <template v-for="item in navSingles" :key="`drawer-single-${item.label}`">
                <NuxtLink
                  v-if="item.to && !item.placeholder"
                  :to="item.to"
                  class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-black/80 no-underline transition-colors hover:text-marketing-green"
                  @click="closeMobileNav"
                >
                  <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
                <div
                  v-else
                  class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold text-black/40"
                  aria-disabled="true"
                >
                  <AppIcon :name="item.icon" :size="20" class="shrink-0" />
                  <span>{{ item.label }}</span>
                </div>
              </template>
            </div>
            <template v-if="showUserAuth">
              <NuxtLink
                :to="navItemMessages.to"
                class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold no-underline transition-colors"
                :class="
                  itemActive(navItemMessages)
                    ? 'bg-marketing-mint text-marketing-green'
                    : 'text-black/80 hover:bg-black/[0.04]'
                "
                @click="closeMobileNav"
              >
                <AppIcon :name="navItemMessages.icon" :size="22" class="shrink-0" />
                {{ S.navSpravy }}
              </NuxtLink>
              <NuxtLink
                :to="navItemProfile.to"
                class="flex min-w-0 items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold no-underline transition-colors"
                :class="
                  itemActive(navItemProfile)
                    ? 'bg-marketing-mint text-marketing-green'
                    : 'text-black/80 hover:bg-black/[0.04]'
                "
                @click="closeMobileNav"
              >
                <AppIcon :name="navItemProfile.icon" :size="22" class="shrink-0" />
                <span class="min-w-0 truncate">{{ profileNavLabel }}</span>
              </NuxtLink>
            </template>
          </div>
          <div
            v-if="showGuestAuth"
            class="flex flex-col gap-2 border-t border-black/10 p-4"
          >
            <NuxtLink
              :to="registerTo"
              class="flex items-center justify-center rounded-full bg-white py-3 text-center text-base font-bold text-marketing-green no-underline ring-2 ring-marketing-green"
              @click="closeMobileNav"
            >
              {{ S.navRegister }}
            </NuxtLink>
            <NuxtLink
              :to="loginTo"
              class="flex items-center justify-center rounded-full bg-marketing-green py-3 text-center text-base font-bold text-white no-underline"
              @click="closeMobileNav"
            >
              {{ S.signIn }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  APP_NAV_SINGLES,
  filterAppNavGroups,
  type AppNavItem,
} from '~/utils/app-nav'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

const route = useRoute()

useGlobalSiteSeo()

const layoutMainFlushTop = computed(() => route.meta.layoutMainFlushTop === true)
const { user, profile, loading: authLoading } = useAuth()

/** Defer auth-dependent header chrome until after mount so SSR (guest) matches hydration. */
const authUiMounted = ref(false)
onMounted(() => {
  authUiMounted.value = true
})

const showGuestAuth = computed(
  () => authUiMounted.value && !authLoading.value && !user.value,
)
const showUserAuth = computed(
  () => authUiMounted.value && !authLoading.value && Boolean(user.value),
)

const authReady = computed(() => authUiMounted.value && !authLoading.value)

const navGroups = computed(() =>
  filterAppNavGroups({
    user: user.value,
    profile: profile.value,
    authReady: authReady.value,
  }),
)

const mobileNavOpen = ref(false)

const { refresh: refreshNotifications, refreshIfStale: refreshNotificationsIfStale } = useNotifications()

function closeMobileNav(): void {
  mobileNavOpen.value = false
  mobileOpenGroups.value = {}
}

function toggleMobileNav(): void {
  const next = !mobileNavOpen.value
  mobileNavOpen.value = next
  if (next && import.meta.client) {
    window.dispatchEvent(new Event('jobbie:close-notification-menu'))
  }
}

function onNotificationMenuOpened(event: Event): void {
  const custom = event as CustomEvent<{ variant?: 'desktop' | 'mobile' }>
  if (custom.detail?.variant === 'mobile' && mobileNavOpen.value) {
    closeMobileNav()
  }
}

watch(
  () => route.fullPath,
  () => {
    closeMobileNav()
    desktopOpenGroupId.value = null
    if (!showGuestAuth.value) {
      void refreshNotificationsIfStale({ silent: true })
    }
  },
)

watch(mobileNavOpen, (open) => {
  if (!import.meta.client) {
    return
  }
  document.documentElement.classList.toggle('overflow-hidden', open)
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('jobbie:notification-menu-opened', onNotificationMenuOpened as EventListener)
  }
  if (desktopCloseTimer) {
    clearTimeout(desktopCloseTimer)
    desktopCloseTimer = null
  }
  if (import.meta.client) {
    document.documentElement.classList.remove('overflow-hidden')
  }
})

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('jobbie:notification-menu-opened', onNotificationMenuOpened as EventListener)
  }
})

watch(showGuestAuth, (guest) => {
  if (!guest) {
    void refreshNotifications({ silent: true })
  }
})

const { syncIfGranted: syncWebPushIfGranted } = useWebPushRegistration()
watch(
  () => user.value?.id,
  (id) => {
    if (id) {
      void syncWebPushIfGranted()
    }
  },
  { immediate: true },
)

const profileNavLabel = computed(() => {
  const p = profile.value
  if (!p) return S.navProfil
  const first = (p.first_name ?? '').trim()
  const last = (p.last_name ?? '').trim()
  if (first || last) return [first, last].filter(Boolean).join(' ')
  const display = (p.display_name ?? '').trim()
  if (display) return display
  const company = (p.company_name ?? '').trim()
  if (company) return company
  return S.navProfil
})

const authReturnQuery = computed((): Record<string, string> => {
  if (route.path.startsWith('/auth')) return {}
  return { redirect: route.fullPath }
})

const loginTo = computed(() => ({
  path: '/auth/login',
  query: authReturnQuery.value,
}))

const registerTo = computed(() => ({
  path: '/auth/register',
  query: authReturnQuery.value,
}))

const navSingles = APP_NAV_SINGLES

const desktopOpenGroupId = ref<string | null>(null)
const mobileOpenGroups = ref<Record<string, boolean>>({})
let desktopCloseTimer: ReturnType<typeof setTimeout> | null = null

const navItemMessages: AppNavItem = {
  to: ROUTES.chat,
  path: ROUTES.chat,
  label: S.navSpravy,
  icon: 'chat',
}

const navItemProfile: AppNavItem = {
  to: ROUTES.profile,
  path: ROUTES.profile,
  label: S.navProfil,
  icon: 'user',
}

function itemActive(item: AppNavItem): boolean {
  if (!item.path) {
    return false
  }
  if (item.home) {
    return route.path === ROUTES.home
  }
  if (item.path === ROUTES.chat) {
    return route.path.startsWith(ROUTES.chat) || route.path === '/app/messages'
  }
  return route.path.startsWith(item.path)
}

function openDesktopGroup(id: string): void {
  if (desktopCloseTimer) {
    clearTimeout(desktopCloseTimer)
    desktopCloseTimer = null
  }
  desktopOpenGroupId.value = id
}

function closeDesktopGroupNow(): void {
  if (desktopCloseTimer) {
    clearTimeout(desktopCloseTimer)
    desktopCloseTimer = null
  }
  desktopOpenGroupId.value = null
}

function normalizeNavPath(path: string): string {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

function onNavItemActivate(to: string, event: MouseEvent | PointerEvent): void {
  if (event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  closeDesktopGroupNow()
  closeMobileNav()
  const current = normalizeNavPath(route.path)
  const target = normalizeNavPath(to)
  if (current === target) {
    event.preventDefault()
    return
  }
  // Hub link from wizard/detail sub-route (e.g. /vytvorit-ponuku/:id → hub).
  if (current.startsWith(`${target}/`)) {
    event.preventDefault()
    void navigateTo(to)
  }
  // Otherwise let NuxtLink handle navigation (avoid preventDefault + navigateTo races).
}

function closeDesktopGroup(id: string): void {
  if (desktopCloseTimer) {
    clearTimeout(desktopCloseTimer)
  }
  desktopCloseTimer = setTimeout(() => {
    if (desktopOpenGroupId.value === id) {
      desktopOpenGroupId.value = null
    }
    desktopCloseTimer = null
  }, 180)
}

function onDesktopGroupFocusOut(id: string, event: FocusEvent): void {
  const current = event.currentTarget as HTMLElement | null
  const next = event.relatedTarget as Node | null
  if (!current || !next || !current.contains(next)) {
    closeDesktopGroup(id)
  }
}

function toggleMobileGroup(id: string): void {
  mobileOpenGroups.value = {
    ...mobileOpenGroups.value,
    [id]: !mobileOpenGroups.value[id],
  }
}

function toggleDesktopGroup(id: string): void {
  if (desktopCloseTimer) {
    clearTimeout(desktopCloseTimer)
    desktopCloseTimer = null
  }
  desktopOpenGroupId.value = desktopOpenGroupId.value === id ? null : id
}
</script>

<style scoped>
.safe-area-pt {
  padding-top: max(0.25rem, env(safe-area-inset-top));
}

.safe-area-pb {
  padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
}

.app-layout-main {
  min-height: 0;
  overflow: visible;
  padding-top: calc(0.625rem + 4.375rem + max(0.25rem, env(safe-area-inset-top, 0px)));
}
.app-layout-main--flush-top {
  padding-top: 0;
}
@media (min-width: 900px) {
  .app-layout-main {
    padding-top: calc(0.625rem + 4.375rem + max(0.25rem, env(safe-area-inset-top, 0px)));
  }
  .app-layout-main--flush-top {
    padding-top: 0;
  }
}
</style>
