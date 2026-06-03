<template>
  <div class="mx-auto max-w-2xl px-5 py-10 font-dmSans text-black">
    <h1 class="m-0 text-[28px] font-extrabold leading-tight sm:text-[32px]">
      {{ S.preferencesCenterTitle }}
    </h1>
    <p class="mt-2 text-base text-black/55">{{ S.preferencesCenterHint }}</p>
    <p v-if="loadError" class="mt-4 text-sm text-red-600">{{ loadError }}</p>
    <p v-else-if="loading" class="mt-6 text-sm text-black/50">{{ S.loading }}</p>
    <template v-else>
      <p class="mt-6 font-dmSans text-[14px] leading-snug text-black/55">
        {{ S.settingsNotifyChannelsLegend }}
      </p>

      <div class="mt-5 space-y-5">
        <section
          v-for="section in PUBLIC_TOKEN_NOTIFY_SECTIONS"
          :key="section.id"
          class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0px_2px_4px_rgba(0,0,0,0.06)]"
        >
          <div class="border-b border-black/[0.06] px-4 py-3.5 sm:px-5">
            <h2 class="form-label m-0">{{ section.title }}</h2>
          </div>
          <SettingsNotificationChannelHeader />
          <SettingsNotificationCategoryRow
            v-for="(catKey, idx) in section.categories"
            :key="catKey"
            :category-key="catKey"
            :matrix="notifyMatrix"
            :is-first="idx === 0"
            id-prefix="public-pref"
            :show-aux-links="false"
          />
        </section>
      </div>

      <button
        type="button"
        class="btn-green mt-8 w-full min-h-[48px] disabled:opacity-50 sm:max-w-xs"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? S.loading : S.save }}
      </button>
      <p v-if="saveOk" class="mt-3 text-sm font-medium text-marketing-green">{{ S.preferencesSaved }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
// Public notification prefs by email token — fetch with skipSessionExpiry pattern via raw fetch.
import {
  PUBLIC_TOKEN_NOTIFY_SECTIONS,
  createPublicTokenNotifyMatrix,
  mergeNotificationPreferencesPayload,
  normalizeNotificationPrefs,
  publicTokenCategoryKeys,
} from '~/composables/useNotificationPreferencesMatrix'
import { S } from '~/utils/strings'

definePageMeta({ layout: 'default', ssr: false })

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))
const config = useRuntimeConfig()

const notifyMatrix = reactive(createPublicTokenNotifyMatrix())
const loadedPreferences = ref<unknown>(null)

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveOk = ref(false)

async function load(): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const base = config.public.apiBaseUrl.replace(/\/$/, '')
    const res = await fetch(
      `${base}/api/public/notification-preferences?token=${encodeURIComponent(token.value)}`,
    )
    if (!res.ok) {
      loadError.value = S.preferencesTokenInvalid
      return
    }
    const data = (await res.json()) as { preferences?: unknown }
    loadedPreferences.value = data.preferences ?? null
    normalizeNotificationPrefs(notifyMatrix, data.preferences)
  } catch {
    loadError.value = S.preferencesTokenInvalid
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  saving.value = true
  saveOk.value = false
  try {
    const base = config.public.apiBaseUrl.replace(/\/$/, '')
    const res = await fetch(
      `${base}/api/public/notification-preferences?token=${encodeURIComponent(token.value)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: mergeNotificationPreferencesPayload(
            loadedPreferences.value,
            notifyMatrix,
            publicTokenCategoryKeys(),
          ),
        }),
      },
    )
    if (!res.ok) {
      loadError.value = S.saveFailed
      return
    }
    const merged = mergeNotificationPreferencesPayload(
      loadedPreferences.value,
      notifyMatrix,
      publicTokenCategoryKeys(),
    )
    loadedPreferences.value = merged
    saveOk.value = true
    loadError.value = ''
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
