<template>
  <div>
    <p v-if="loading" class="font-dmSans text-sm text-black/50">{{ S.loading }}</p>
    <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
    <template v-else>
      <div
        class="rounded-[20px] border border-marketing-green/30 bg-marketing-panel/50 p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
      >
        <h2 class="form-label m-0">{{ S.settingsBrowserPushCardTitle }}</h2>
        <p class="mt-2 font-dmSans text-[14px] leading-snug text-black/55">
          {{ S.settingsBrowserPushHint }}
        </p>
        <button
          type="button"
          class="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 font-dmSans text-sm font-semibold text-black/80 transition-colors hover:border-marketing-green hover:text-marketing-green disabled:opacity-50 sm:w-auto"
          :disabled="browserPushBusy"
          @click="onEnableBrowserPush"
        >
          {{ browserPushBusy ? S.loading : S.settingsBrowserPushButton }}
        </button>
        <p v-if="browserPushMsg" class="mt-3 font-dmSans text-xs font-medium text-marketing-green">
          {{ browserPushMsg }}
        </p>
        <p v-if="browserPushErr" class="mt-3 font-dmSans text-xs text-red-600">{{ browserPushErr }}</p>
      </div>

      <div class="mt-8">
        <p class="m-0 font-dmSans text-[14px] leading-snug text-black/55">
          {{ S.settingsNotifyChannelsLegend }}
        </p>
        <p class="mt-1 font-dmSans text-[13px] text-black/45">{{ S.settingsNotifyChannelsHint }}</p>
      </div>

      <div class="mt-6 space-y-5">
        <section
          v-for="section in sections"
          :key="section.id"
          class="overflow-hidden rounded-2xl border border-black/[0.06] bg-marketing-surface/40"
        >
          <div class="border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
            <h2 class="form-label m-0">{{ section.title }}</h2>
            <p v-if="section.hint" class="mt-1 font-dmSans text-[13px] text-black/50">
              {{ section.hint }}
            </p>
          </div>
          <SettingsNotificationChannelHeader />
          <SettingsNotificationCategoryRow
            v-for="(catKey, idx) in section.categories"
            :key="catKey"
            :category-key="catKey"
            :matrix="notifyMatrix"
            :is-first="idx === 0"
          />
        </section>
      </div>

      <div class="mt-8 border-t border-black/[0.06] pt-6">
        <button
          type="button"
          class="btn-green w-full min-h-[48px] disabled:opacity-50 sm:max-w-xs"
          :disabled="saving"
          @click="saveNotificationPrefs"
        >
          {{ saving ? S.loading : S.save }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  buildNotificationPreferencesPayload,
  normalizeNotificationPrefs,
  useNotificationPreferencesMatrix,
} from '~/composables/useNotificationPreferencesMatrix'
import { S } from '~/utils/strings'

const emit = defineEmits<{ saved: [] }>()

const { loading, loadError, profile, load, patch } = useSettingsProfile()
const { requestPermissionAndSubscribe } = useWebPushRegistration()
const { notifyMatrix, sections } = useNotificationPreferencesMatrix()

const saving = ref(false)
const browserPushBusy = ref(false)
const browserPushMsg = ref('')
const browserPushErr = ref('')

async function onEnableBrowserPush(): Promise<void> {
  browserPushMsg.value = ''
  browserPushErr.value = ''
  browserPushBusy.value = true
  try {
    const r = await requestPermissionAndSubscribe()
    if (r === 'ok') {
      browserPushMsg.value = S.settingsBrowserPushOk
    } else if (r === 'denied') {
      browserPushErr.value = S.settingsBrowserPushDenied
    } else if (r === 'unsupported') {
      browserPushErr.value = S.settingsBrowserPushUnsupported
    } else if (r === 'no_session') {
      browserPushErr.value = S.settingsBrowserPushNoSession
    } else if (r === 'no_service_worker') {
      browserPushErr.value = S.settingsBrowserPushNoServiceWorker
    } else if (r === 'no_vapid') {
      browserPushErr.value = S.settingsBrowserPushNoVapid
    } else if (r === 'subscribe_browser_failed') {
      browserPushErr.value = S.settingsBrowserPushSubscribeBrowser
    } else if (r === 'unauthorized') {
      browserPushErr.value = S.settingsBrowserPushUnauthorized
    } else if (r === 'server_error') {
      browserPushErr.value = S.settingsBrowserPushServerError
    } else {
      browserPushErr.value = S.settingsBrowserPushFailed
    }
  } finally {
    browserPushBusy.value = false
  }
}

async function saveNotificationPrefs(): Promise<void> {
  saving.value = true
  try {
    const result = await patch({
      notification_preferences: buildNotificationPreferencesPayload(notifyMatrix),
    })
    if (result.ok) {
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}

watch(
  profile,
  (d) => {
    if (d) {
      normalizeNotificationPrefs(notifyMatrix, d.notification_preferences)
    }
  },
  { immediate: true },
)

onMounted(() => {
  void load()
})
</script>
