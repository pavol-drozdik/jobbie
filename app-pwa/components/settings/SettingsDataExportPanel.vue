<template>
  <div class="space-y-6">
    <div
      class="flex gap-3 rounded-xl border border-marketing-green/20 bg-marketing-mint/50 px-4 py-3"
    >
      <AppIcon name="package" :size="22" class="mt-0.5 shrink-0 text-marketing-green" />
      <p class="m-0 text-sm leading-relaxed" style="color: var(--ink)">
        {{ S.settingsExportDataIntro }}
      </p>
    </div>

    <section>
      <h2 class="form-label mb-3">{{ S.settingsExportDataIncludesSection }}</h2>
      <ul class="space-y-2">
        <li
          v-for="item in includeItems"
          :key="item.title"
          class="flex gap-3 rounded-lg border px-3 py-2.5"
          style="border-color: var(--sand3)"
        >
          <AppIcon
            name="check-circle"
            :size="18"
            class="mt-0.5 shrink-0 text-marketing-green"
          />
          <span class="min-w-0">
            <span class="block text-sm font-semibold" style="color: var(--ink)">
              {{ item.title }}
            </span>
            <span class="mt-0.5 block text-xs leading-snug" style="color: var(--ink3)">
              {{ item.hint }}
            </span>
          </span>
        </li>
      </ul>
    </section>

    <section>
      <h2 class="form-label mb-2">{{ S.settingsExportDataFormatSection }}</h2>
      <ul class="list-disc space-y-1.5 pl-5 text-sm" style="color: var(--ink)">
        <li>{{ S.settingsExportDataFormatZip }}</li>
        <li>{{ S.settingsExportDataFormatJson }}</li>
        <li>{{ S.settingsExportDataFormatReadme }}</li>
        <li class="text-xs" style="color: var(--ink3)">{{ S.settingsExportDataFormatFilename }}</li>
      </ul>
    </section>

    <section>
      <h2 class="form-label mb-2">{{ S.settingsExportDataImportantSection }}</h2>
      <ul class="list-disc space-y-1.5 pl-5 text-xs leading-relaxed" style="color: var(--ink3)">
        <li>{{ S.settingsExportDataImportantSnapshot }}</li>
        <li>{{ S.settingsExportDataImportantRateLimit }}</li>
        <li>{{ S.settingsExportDataImportantNoMessages }}</li>
        <li>
          {{ S.settingsExportDataImportantDelete }}
          <NuxtLink
            to="/nastavenia/nebezpecna-zona"
            class="font-semibold text-marketing-green hover:underline"
          >
            {{ S.settingsExportDataLinkDanger }}
          </NuxtLink>
        </li>
      </ul>
    </section>

    <div class="border-t border-black/6 pt-6">
      <button
        type="button"
        class="btn-green inline-flex min-h-[44px] w-full items-center justify-center gap-2 disabled:opacity-50 sm:w-auto sm:px-6"
        :disabled="working"
        :aria-busy="working"
        @click="downloadExport"
      >
        <AppIcon v-if="!working" name="package" :size="18" />
        {{ working ? S.settingsExportDataWorking : S.settingsExportDataButton }}
      </button>
      <p class="mt-2 text-xs" style="color: var(--ink3)">
        {{ S.settingsExportDataDownloadHint }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchApiBinary } from '~/utils/api-binary-fetch'
import { parseApiErrorMessage, type ApiResultLike } from '~/utils/api-errors'
import { S } from '~/utils/strings'

const emit = defineEmits<{
  exported: []
  failed: [message: string]
}>()

const { getApiBaseUrl } = useApi()
const { session } = useAuth()
const working = ref(false)

async function responseToApiResult(res: Response): Promise<ApiResultLike> {
  const body = await res.text()
  let data: unknown
  try {
    data = JSON.parse(body) as unknown
  } catch {
    data = undefined
  }
  return { status: res.status, ok: res.ok, body, data }
}

async function fetchExportZip(): Promise<Response> {
  const base = getApiBaseUrl().replace(/\/$/, '')
  return fetchApiBinary(`${base}/api/profiles/me/export`, session.value, {
    accept: 'application/zip',
    apiBaseUrl: base,
  })
}

const includeItems = [
  { title: S.settingsExportDataItemProfile, hint: S.settingsExportDataItemProfileHint },
  { title: S.settingsExportDataItemCvs, hint: S.settingsExportDataItemCvsHint },
  { title: S.settingsExportDataItemConsents, hint: S.settingsExportDataItemConsentsHint },
  { title: S.settingsExportDataItemAlerts, hint: S.settingsExportDataItemAlertsHint },
  { title: S.settingsExportDataItemApplications, hint: S.settingsExportDataItemApplicationsHint },
  { title: S.settingsExportDataItemChat, hint: S.settingsExportDataItemChatHint },
]

async function downloadExport(): Promise<void> {
  if (working.value) {
    return
  }
  working.value = true
  try {
    const res = await fetchExportZip()
    if (res.status === 429) {
      emit('failed', S.settingsExportDataRateLimited)
      return
    }
    if (!res.ok) {
      const err = await responseToApiResult(res)
      emit('failed', parseApiErrorMessage(err, S.settingsExportDataFailed))
      return
    }
    const blob = await res.blob()
    const stamp = new Date().toISOString().slice(0, 10)
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `jobbie-export-${stamp}.zip`
    a.click()
    URL.revokeObjectURL(objectUrl)
    emit('exported')
  } catch {
    emit('failed', S.settingsExportDataFailed)
  } finally {
    working.value = false
  }
}
</script>
