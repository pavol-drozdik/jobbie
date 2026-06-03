<template>

  <Teleport to="body">

    <div

      v-if="open"

      class="fixed inset-0 z-[260] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"

      role="dialog"

      aria-modal="true"

      :aria-labelledby="titleId"

      @click.self="emit('close')"

    >

      <div

        class="flex max-h-[min(92dvh,800px)] w-full max-w-3xl flex-col rounded-t-2xl border border-black/10 bg-white shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:max-h-[88vh] sm:rounded-2xl"

        @click.stop

      >

        <div class="border-b border-black/10 px-5 py-5 sm:px-6">

          <h2

            :id="titleId"

            class="m-0 text-xl font-extrabold leading-snug text-black"

          >

            {{ S.cookiePreferencesTitle }}

          </h2>

          <p class="m-0 mt-3 text-[14px] leading-relaxed text-black/65">

            {{ S.cookiePreferencesIntro }}

          </p>

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

              <label

                class="relative inline-block h-7 w-12 shrink-0 cursor-pointer"

              >

                <input

                  v-model="analyticsDraft"

                  type="checkbox"

                  class="peer sr-only"

                  role="switch"

                  :aria-checked="analyticsDraft"

                  :aria-label="S.cookieCategoryAnalyticsTitle"

                >

                <span

                  class="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-marketing-green"

                  aria-hidden="true"

                />

                <span

                  class="absolute left-1 top-1 size-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"

                  aria-hidden="true"

                />

              </label>

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

                @click="emit('close')"

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

import { computed, ref, useId, watch } from 'vue'

import {

  buildAnalyticsCookieRows,

  buildNecessaryCookieRows,

} from '~/utils/cookie-inventory'

import { ROUTES } from '~/utils/app-routes'

import { S } from '~/utils/strings'



const props = defineProps<{

  open: boolean

  analytics: boolean

}>()



const emit = defineEmits<{

  close: []

  save: [analytics: boolean]

  'reject-all': []

}>()



const titleId = useId()

const analyticsDraft = ref(props.analytics)

const config = useRuntimeConfig()



const supportEmail =

  typeof config.public.supportEmail === 'string' && config.public.supportEmail.trim()

    ? config.public.supportEmail.trim()

    : S.footerEmail



const siteHost = computed(() => {

  if (import.meta.client && typeof location !== 'undefined') {

    return location.hostname

  }

  const siteUrl =

    typeof config.public.siteUrl === 'string' ? config.public.siteUrl.trim() : ''

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
  return rows.filter((row) => {
    if (row.name.startsWith('ph_')) {
      return hasPosthog
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



watch(

  () => props.open,

  (isOpen) => {

    if (isOpen) {

      analyticsDraft.value = props.analytics

    }

  },

)



watch(

  () => props.analytics,

  (value) => {

    analyticsDraft.value = value

  },

)



function onSave(): void {

  emit('save', analyticsDraft.value)

}



const safeAreaClass = 'pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4'

</script>


