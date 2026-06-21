<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[260] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      :aria-describedby="descId"
      @click.self="requestClose"
    >
      <div
        ref="panelRef"
        class="flex max-h-[min(92dvh,800px)] w-full max-w-3xl flex-col rounded-t-2xl border border-black/10 bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:max-h-[88vh] sm:rounded-2xl"
        @click.stop
      >
        <div class="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-5 sm:px-6">
          <div class="min-w-0 flex-1">
            <h2 :id="titleId" class="m-0 text-xl font-extrabold leading-snug text-black">
              {{ S.cookiePreferencesTitle }}
            </h2>
            <p :id="descId" class="m-0 mt-3 text-[14px] leading-relaxed text-black/65">
              {{ S.cookiePreferencesIntro }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-none bg-transparent text-black/55 transition-colors hover:bg-black/5 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketing-green/40"
            :aria-label="S.cookiePreferencesClose"
            @click="requestClose"
          >
            <AppIcon name="x" :size="20" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-2 sm:px-6">
          <AppCookieCategoryPanel
            :title="S.cookieCategoryNecessaryTitle"
            :description="S.cookieCategoryNecessaryDetail"
            :rows="necessaryRows"
            default-expanded
          >
            <template #toggle>
              <AppSettingsSwitch
                :model-value="true"
                :label="S.cookieCategoryNecessaryTitle"
                disabled
              />
            </template>
          </AppCookieCategoryPanel>

          <AppCookieCategoryPanel
            :title="S.cookieCategoryAnalyticsTitle"
            :description="S.cookieCategoryAnalyticsDetail"
            :rows="analyticsRows"
            :empty-hint="analyticsRows.length === 0 ? S.cookieCategoryAnalyticsEmpty : undefined"
          >
            <template #toggle>
              <AppCookieCategorySwitch
                v-model="draft.analytics"
                :label="S.cookieCategoryAnalyticsTitle"
              />
            </template>
          </AppCookieCategoryPanel>

          <AppCookieCategoryPanel
            :title="S.cookieCategoryMarketingTitle"
            :description="S.cookieCategoryMarketingDetail"
            :rows="marketingRows"
            :empty-hint="S.cookieCategoryMarketingEmpty"
          >
            <template #toggle>
              <AppCookieCategorySwitch
                v-model="draft.marketing"
                :label="S.cookieCategoryMarketingTitle"
              />
            </template>
          </AppCookieCategoryPanel>

          <AppCookieCategoryPanel
            :title="S.cookieCategoryPersonalizationTitle"
            :description="S.cookieCategoryPersonalizationDetail"
            :rows="personalizationRows"
            :empty-hint="S.cookieCategoryPersonalizationEmpty"
          >
            <template #toggle>
              <AppCookieCategorySwitch
                v-model="draft.personalization"
                :label="S.cookieCategoryPersonalizationTitle"
              />
            </template>
          </AppCookieCategoryPanel>

          <div class="border-t border-black/10 py-5">
            <p class="m-0 text-[14px] font-semibold text-black">
              {{ S.cookiePreferencesMoreInfoTitle }}
            </p>
            <p class="m-0 mt-2 text-[13px] leading-relaxed text-black/60">
              {{ S.cookiePreferencesMoreInfoBody }}
              <NuxtLink
                :to="ROUTES.privacy"
                class="font-medium text-marketing-green underline-offset-2 hover:underline"
                @click="requestClose"
              >
                {{ S.footerLinkPrivacy }}
              </NuxtLink>
              {{ S.cookiePreferencesMoreInfoBodySuffix }}
              <a
                :href="`mailto:${supportEmail}`"
                class="font-medium text-marketing-green underline-offset-2 hover:underline"
              >
                {{ supportEmail }}
              </a>
              .
            </p>
          </div>
        </div>

        <p class="sr-only" aria-live="polite" aria-atomic="true">
          {{ liveMessage }}
        </p>

        <div
          class="flex flex-col-reverse gap-2 border-t border-black/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6"
          :class="safeAreaClass"
        >
          <AppButton variant="outline" class="sm:min-w-[7.5rem]" @click="emit('reject-all')">
            {{ S.cookieBannerRejectAll }}
          </AppButton>
          <AppButton variant="primary" class="sm:min-w-[7.5rem]" @click="onSave">
            {{ S.cookiePreferencesSave }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import {
  buildAnalyticsCookieRows,
  buildMarketingCookieRows,
  buildNecessaryCookieRows,
  buildPersonalizationCookieRows,
} from '~/utils/cookie-inventory'
import type { CookieConsentCategories } from '~/utils/cookie-consent-state'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

const props = defineProps<{
  open: boolean
  categories: CookieConsentCategories
}>()

const emit = defineEmits<{
  close: [draft: CookieConsentCategories]
  save: [draft: CookieConsentCategories]
  'reject-all': []
}>()

const titleId = useId()
const descId = useId()
const panelRef = ref<HTMLElement | null>(null)
const liveMessage = ref('')
const config = useRuntimeConfig()

const draft = reactive<CookieConsentCategories>({
  analytics: false,
  marketing: false,
  personalization: false,
})

const isOpen = computed(() => props.open)
useFocusTrap(panelRef, isOpen)

const supportEmail =
  typeof config.public.supportEmail === 'string' && config.public.supportEmail.trim()
    ? config.public.supportEmail.trim()
    : S.footerEmail

const siteHost = computed(() => {
  if (import.meta.client && typeof location !== 'undefined') {
    return location.hostname
  }
  const siteUrl = typeof config.public.siteUrl === 'string' ? config.public.siteUrl.trim() : ''
  if (siteUrl) {
    try {
      return new URL(siteUrl).hostname
    } catch {
      return 'jobbie.sk'
    }
  }
  return 'jobbie.sk'
})

const inventoryCtx = computed(() => ({ siteHost: siteHost.value }))

const necessaryRows = computed(() => {
  const rows = buildNecessaryCookieRows(inventoryCtx.value)
  const turnstileEnabled =
    typeof config.public.turnstileSiteKey === 'string' &&
    config.public.turnstileSiteKey.trim().length > 0
  if (turnstileEnabled) {
    return rows
  }
  return rows.filter((row) => row.name !== 'cf_clearance')
})

const analyticsRows = computed(() => {
  const rows = buildAnalyticsCookieRows(inventoryCtx.value)
  const hasGtm =
    typeof config.public.gtmContainerId === 'string' &&
    /^GTM-[A-Z0-9]+$/i.test(config.public.gtmContainerId.trim())
  const hasPosthog =
    typeof config.public.posthogKey === 'string' && config.public.posthogKey.trim().length > 0
  const hasSentry =
    typeof config.public.sentryDsn === 'string' && config.public.sentryDsn.trim().length > 0
  return rows.filter((row) => {
    if (row.name.startsWith('ph_')) {
      return hasPosthog
    }
    if (row.name.startsWith('sentry')) {
      return hasSentry
    }
    if (
      row.name === '_ga' ||
      row.name === '_ga_*' ||
      row.name === '_gid' ||
      row.name === '_clck' ||
      row.name === '_clsk'
    ) {
      return hasGtm
    }
    return true
  })
})

const marketingRows = computed(() => buildMarketingCookieRows(inventoryCtx.value))
const personalizationRows = computed(() => buildPersonalizationCookieRows(inventoryCtx.value))

function syncDraftFromProps(): void {
  draft.analytics = props.categories.analytics
  draft.marketing = props.categories.marketing
  draft.personalization = props.categories.personalization
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      syncDraftFromProps()
      liveMessage.value = ''
    }
  },
)

watch(
  () => props.categories,
  () => {
    if (props.open) {
      syncDraftFromProps()
    }
  },
  { deep: true },
)

function requestClose(): void {
  emit('close', {
    analytics: draft.analytics,
    marketing: draft.marketing,
    personalization: draft.personalization,
  })
}

function onSave(): void {
  const next = {
    analytics: draft.analytics,
    marketing: draft.marketing,
    personalization: draft.personalization,
  }
  emit('save', next)
  liveMessage.value = S.cookiePreferencesSavedAnnouncement
}

function onEscape(event: KeyboardEvent): void {
  if (!props.open || event.key !== 'Escape') {
    return
  }
  event.preventDefault()
  requestClose()
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', onEscape)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', onEscape)
  }
})

const safeAreaClass = 'pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4'
</script>
