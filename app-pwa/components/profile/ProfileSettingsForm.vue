<template>
  <div>
    <p
      v-if="dashboardDeniedMessage"
      class="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-black/70"
    >
      {{ dashboardDeniedMessage }}
    </p>
    <p v-if="!session?.access_token" class="font-dmSans text-base text-black/50">{{ S.pleaseSignIn }}</p>
    <template v-else>
      <div class="flex flex-col gap-5">
        <component :is="wrapCards ? 'div' : 'section'" :class="profileSectionClass">
          <h2
            v-if="showSectionHeadings"
            class="mb-3.5 font-dmSans text-[20px] font-extrabold leading-none text-black"
          >
            {{ S.profileEditCardTitle }}
          </h2>
          <div class="mb-5 flex flex-wrap gap-2" aria-label="Typ účtu">
            <span :class="acctTypeBtnClass(user?.role !== 'company')" aria-disabled="true">
              <AppIcon name="user" :size="16" class="shrink-0" />
              {{ S.roleIndividual }}
            </span>
            <span :class="acctTypeBtnClass(user?.role === 'company')" aria-disabled="true">
              <AppIcon name="building" :size="16" class="shrink-0" />
              {{ S.roleCompany }} / SZČO
            </span>
          </div>
          <SettingsProfileForm
            compact
            :show-cancel="showCancel"
            @saved="emit('saved')"
            @cancel="emit('cancel')"
          />
        </component>

        <component
          v-if="showRolesSection"
          :is="wrapCards ? 'div' : 'section'"
          :class="rolesSectionClass"
        >
          <SettingsRolesSection compact />
        </component>

        <nav
          v-if="showFooterLinks"
          class="flex flex-col gap-2 font-dmSans text-[15px] font-semibold sm:flex-row sm:flex-wrap sm:gap-4"
          aria-label="Súvisiace nastavenia"
        >
          <NuxtLink
            to="/profil"
            class="inline-flex items-center gap-1.5 text-marketing-green hover:underline"
          >
            {{ S.settingsProfilLinkPublicProfile }}
            <AppIcon name="chevron-right" :size="14" class="opacity-80" />
          </NuxtLink>
        </nav>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    wrapCards?: boolean
    showCancel?: boolean
    showRolesSection?: boolean
    showFooterLinks?: boolean
    showSectionHeadings?: boolean
  }>(),
  {
    wrapCards: true,
    showCancel: false,
    showRolesSection: true,
    showFooterLinks: true,
    showSectionHeadings: true,
  },
)

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const { user, session } = useAuth()
const route = useRoute()
const { settingsCardClass } = useSettingsFormStyles()

const profileSectionClass = computed(() =>
  props.wrapCards ? settingsCardClass : 'flex flex-col',
)

const rolesSectionClass = computed(() =>
  props.wrapCards ? settingsCardClass : 'flex flex-col border-t border-black/[0.07] pt-6',
)

const dashboardDeniedMessage = computed(() => {
  const d = route.query.dashboardDenied
  if (d === 'customer') {
    return S.dashboardRoleDeniedCustomer
  }
  if (d === 'provider') {
    return S.dashboardRoleDeniedProvider
  }
  if (d === 'worker') {
    return S.settingsCardFirmaDisabled
  }
  return ''
})

function acctTypeBtnClass(isActive: boolean): string {
  const base =
    'inline-flex cursor-not-allowed items-center gap-2 rounded-full border-[1.5px] px-[22px] py-2.5 font-dmSans text-base font-semibold'
  if (isActive) {
    return `${base} border-marketing-green bg-marketing-green text-white`
  }
  return `${base} border-[#e5e7eb] bg-marketing-surface text-black/50`
}
</script>
