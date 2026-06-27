<template>
  <section>
    <SettingsSection
      :title="S.settingsFirmaAutoRepliesTitle"
      :description="S.settingsFirmaAutoRepliesHint"
    >
      <div
        v-if="!billingLoaded || billingLoading"
        class="flex flex-col gap-4"
      >
        <div
          v-for="i in 2"
          :key="`billing-sk-${i}`"
          class="h-24 animate-pulse rounded-2xl bg-marketing-surface"
        />
      </div>

      <div
        v-else-if="!hasPlusOrProAccess"
        class="rounded-2xl border border-marketing-green/20 bg-marketing-mint/30 px-4 py-5 sm:px-6"
      >
        <h3 class="m-0 font-dmSans text-base font-bold text-black">
          {{ S.settingsFirmaAutoRepliesPlusProTitle }}
        </h3>
        <p class="mt-2 mb-4 font-dmSans text-sm leading-relaxed text-black/70">
          {{ S.settingsFirmaAutoRepliesPlusProBody }}
        </p>
        <AppButton
          :to="`${ROUTES.pricing}?tab=plans`"
          size="md"
          class="w-full sm:w-auto"
        >
          {{ S.settingsFirmaAutoRepliesUpgradeCta }}
        </AppButton>
      </div>

      <template v-else>
      <p class="mb-4 font-dmSans text-sm text-black/55">
        {{ S.settingsFirmaAutoRepliesHowTo }}
      </p>

      <p v-if="loadError" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {{ loadError }}
      </p>

      <div v-if="loading" class="flex flex-col gap-4">
        <div
          v-for="i in 2"
          :key="i"
          class="h-32 animate-pulse rounded-2xl bg-marketing-surface"
        />
      </div>

      <div v-else class="flex flex-col gap-5">
        <div
          v-for="t in visibleTemplates"
          :key="t.status_type"
          class="rounded-2xl border border-black/[0.06] bg-marketing-surface/40 p-4 sm:p-5"
        >
          <label class="flex is-clickable items-start gap-3">
            <AppCheckbox v-model="t.enabled" class="mt-1" />
            <span>
              <span class="block font-dmSans text-base font-semibold text-black">
                {{ labelFor(t.status_type) }}
              </span>
            </span>
          </label>
          <textarea
            :ref="(el) => setTextareaRef(t.status_type, el)"
            v-model="t.message_text"
            rows="5"
            :class="[textareaClass, 'mt-3']"
            :disabled="!t.enabled"
          />
          <ApplicantMessageTemplateVarChips
            class="mt-2"
            :disabled="!t.enabled"
            @insert="(snippet) => insertVar(t, snippet)"
          />
          <p
            v-if="t.enabled && !t.message_text.trim()"
            class="mt-2 text-sm text-amber-800"
          >
            {{ S.settingsFirmaAutoReplyTextRequired }}
          </p>
          <AppButton
            class="mt-3 w-full sm:w-auto"
            size="md"
            variant="outline"
            :disabled="savingId === t.status_type || !canSaveTemplate(t)"
            @click="saveOne(t)"
          >
            {{ savingId === t.status_type ? S.loading : S.save }}
          </AppButton>
        </div>

        <AppButton
          v-if="visibleTemplates.length > 1"
          class="w-full sm:w-auto"
          size="md"
          :disabled="savingAll"
          @click="saveAll"
        >
          {{ savingAll ? S.loading : S.settingsFirmaAutoRepliesSaveAll }}
        </AppButton>
      </div>
      </template>
    </SettingsSection>

    <p
      v-if="flash"
      :class="[
        'mt-4 rounded-lg border px-3 py-2 text-sm font-medium',
        flashIsError
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-marketing-green/25 bg-marketing-mint text-marketing-green',
      ]"
    >
      {{ flash }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import ApplicantMessageTemplateVarChips from '~/components/applicants/ApplicantMessageTemplateVarChips.vue'
import { parseApiErrorMessage } from '~/utils/api-errors'
import {
  focusTextareaCaret,
  insertApplicantTemplateToken,
} from '~/utils/applicant-message-template'
import { seedApplicantMessageTemplates } from '~/utils/applicant-message-defaults'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'

type TemplateRow = {
  id: string
  status_type: string
  message_text: string
  enabled: boolean
}

const { api } = useApi()
const { textareaClass } = useSettingsFormStyles()
const { hasPlusOrProAccess, load: loadBilling, loaded: billingLoaded, loading: billingLoading } =
  useBillingAccount()

const templates = ref<TemplateRow[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const flash = ref<string | null>(null)
const flashIsError = ref(false)
const savingId = ref<string | null>(null)
const savingAll = ref(false)
const textareaByStatus = ref<Record<string, HTMLTextAreaElement | null>>({})

function setTextareaRef(
  statusType: string,
  el: Element | { $el?: Element } | null,
): void {
  const node =
    el instanceof HTMLTextAreaElement ?
      el
    : el && '$el' in el && el.$el instanceof HTMLTextAreaElement ?
      el.$el
    : null
  textareaByStatus.value[statusType] = node
}

function insertVar(t: TemplateRow, snippet: string): void {
  if (!t.enabled) return
  const el = textareaByStatus.value[t.status_type] ?? null
  const { next, insertAt } = insertApplicantTemplateToken(
    el,
    t.message_text,
    snippet,
  )
  t.message_text = next
  if (el) {
    void nextTick(() => focusTextareaCaret(el, insertAt, snippet.length))
  }
}

const visibleTemplates = computed(() =>
  templates.value.filter((t) =>
    ['rejected', 'interview_invited'].includes(t.status_type),
  ),
)

function labelFor(st: string): string {
  if (st === 'rejected') return S.settingsFirmaAutoReplyRejected
  if (st === 'interview_invited') return S.settingsFirmaAutoReplyInterview
  return st
}

function canSaveTemplate(t: TemplateRow): boolean {
  if (!t.enabled) return true
  return t.message_text.trim().length > 0
}

function mergeTemplatesFromApi(rows: TemplateRow[]): void {
  const seeds = seedApplicantMessageTemplates()
  const byStatus = new Map(rows.map((r) => [r.status_type, r]))
  templates.value = seeds.map((seed) => {
    const hit = byStatus.get(seed.status_type)
    return hit ? { ...hit } : { ...seed }
  })
}

async function load(): Promise<void> {
  loading.value = true
  loadError.value = null
  const res = await api<TemplateRow[]>('/api/employer/applicant-message-templates')
  if (!res.ok) {
    loadError.value = parseApiErrorMessage(res, S.saveFailed)
    templates.value = seedApplicantMessageTemplates()
  } else if (!Array.isArray(res.data) || res.data.length === 0) {
    templates.value = seedApplicantMessageTemplates()
  } else {
    mergeTemplatesFromApi(res.data)
  }
  loading.value = false
}

async function saveOne(t: TemplateRow): Promise<boolean> {
  if (!canSaveTemplate(t)) {
    flash.value = S.settingsFirmaAutoReplyTextRequired
    flashIsError.value = true
    return false
  }
  savingId.value = t.status_type
  flash.value = null
  try {
    const res = await api<TemplateRow>('/api/employer/applicant-message-templates', {
      method: 'PUT',
      body: {
        status_type: t.status_type,
        message_text: t.message_text,
        enabled: t.enabled,
      },
    })
    if (res.ok && res.data) {
      const idx = templates.value.findIndex((x) => x.status_type === t.status_type)
      if (idx >= 0) templates.value[idx] = { ...res.data }
      flash.value = S.applicantsReplySettingsSaved
      flashIsError.value = false
      return true
    }
    flash.value = parseApiErrorMessage(res, S.saveFailed)
    flashIsError.value = true
    return false
  } finally {
    savingId.value = null
  }
}

async function saveAll(): Promise<void> {
  savingAll.value = true
  flash.value = null
  let ok = true
  for (const t of visibleTemplates.value) {
    const saved = await saveOne(t)
    if (!saved) ok = false
  }
  if (ok) {
    flash.value = S.applicantsReplySettingsSaved
    flashIsError.value = false
  }
  savingAll.value = false
}

onMounted(async () => {
  await loadBilling()
  if (hasPlusOrProAccess.value) {
    await load()
  } else {
    loading.value = false
  }
})
</script>
