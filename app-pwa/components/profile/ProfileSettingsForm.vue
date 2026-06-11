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
          <div :id="ACCOUNT_TYPE_SECTION_ID" class="mb-5">
            <p class="mb-1.5 font-dmSans text-[15px] font-bold uppercase tracking-[0.06em] text-black/45">
              {{ S.roleLabel }}
            </p>
            <p class="mb-3 font-dmSans text-sm leading-normal text-black/45">
              {{ S.settingsAccountTypeHint }}
            </p>
            <div class="flex flex-wrap gap-2" role="group" :aria-label="S.roleLabel">
              <button
                type="button"
                :class="acctTypeBtnClass((accountType ?? 'individual') !== 'company')"
                :disabled="accountTypeSaving"
                :aria-pressed="(accountType ?? 'individual') !== 'company'"
                @click="selectAccountType('individual')"
              >
                <AppIcon name="user" :size="16" class="shrink-0" />
                {{ S.roleIndividual }}
              </button>
              <button
                type="button"
                :class="acctTypeBtnClass(accountType === 'company')"
                :disabled="accountTypeSaving"
                :aria-pressed="accountType === 'company'"
                @click="selectAccountType('company')"
              >
                <AppIcon name="building" :size="16" class="shrink-0" />
                {{ S.roleCompany }} / SZČO
              </button>
            </div>
            <p v-if="accountTypeError" class="mt-2 text-xs text-red-600">{{ accountTypeError }}</p>
            <p v-else-if="accountType === 'company'" class="mt-2 font-dmSans text-sm text-black/50">
              <NuxtLink
                to="/nastavenia/firma"
                class="font-semibold text-marketing-green hover:underline"
              >
                {{ S.settingsAccountTypeCompanyLink }}
              </NuxtLink>
            </p>
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
import {
  ACCOUNT_TYPE_SECTION_ID,
  normalizeSettingsProfilDeniedKey,
  resolveDashboardDeniedMessage,
  settingsProfilScrollTargetId,
} from '~/utils/dashboard-role-denied'
import type { UserRole } from '~/composables/useAuth'
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

const { user, session, accountType, updateAccountType } = useAuth()

const accountTypeSaving = ref(false)
const accountTypeError = ref<string | null>(null)
const route = useRoute()
const { settingsCardClass } = useSettingsFormStyles()

const profileSectionClass = computed(() =>
  props.wrapCards ? settingsCardClass : 'flex flex-col',
)

const rolesSectionClass = computed(() =>
  props.wrapCards ? settingsCardClass : 'flex flex-col border-t border-black/[0.07] pt-6',
)

const dashboardDeniedMessage = computed(() =>
  resolveDashboardDeniedMessage(route.query.dashboardDenied),
)

onMounted(() => {
  const denied = normalizeSettingsProfilDeniedKey(route.query.dashboardDenied)
  if (!denied) {
    return
  }
  nextTick(() => {
    document.getElementById(settingsProfilScrollTargetId(denied))?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
})

function acctTypeBtnClass(isActive: boolean): string {
  const base =
    'inline-flex items-center gap-2 rounded-full border-[1.5px] px-[22px] py-2.5 font-dmSans text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'
  if (isActive) {
    return `${base} border-marketing-green bg-marketing-green text-white`
  }
  return `${base} cursor-pointer border-[#e5e7eb] bg-marketing-surface text-black/50 hover:border-marketing-green/40 hover:text-black/70`
}

async function selectAccountType(nextType: UserRole): Promise<void> {
  if (accountTypeSaving.value || accountType.value === nextType) {
    return
  }
  accountTypeError.value = null
  accountTypeSaving.value = true
  try {
    const ok = await updateAccountType(nextType)
    if (!ok) {
      accountTypeError.value = S.saveFailed
    }
  } finally {
    accountTypeSaving.value = false
  }
}
</script>
