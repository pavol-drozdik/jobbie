<script setup lang="ts">
import { ref, watch } from 'vue'
import { adminApi } from '../composables/adminApi'
import type { AdminAnalyticsSummary } from '../types/analytics'
import type { ExternalAnalyticsSummary } from '../types/analytics-external'
import {
  defaultCustomFromTo,
  formatDateRange,
  priorPeriodRange,
  resolveAnalyticsRange,
  type AnalyticsPreset,
} from '../utils/analytics-format'
import { exportAnalyticsSummaryCsv } from '../utils/analytics-export'
import AnalyticsToolbar from '../components/analytics/AnalyticsToolbar.vue'
import AnalyticsKpiGrid from '../components/analytics/AnalyticsKpiGrid.vue'
import AnalyticsFunnelSection from '../components/analytics/AnalyticsFunnelSection.vue'
import AnalyticsGrowthSection from '../components/analytics/AnalyticsGrowthSection.vue'
import AnalyticsRevenueSection from '../components/analytics/AnalyticsRevenueSection.vue'
import AnalyticsMarketplaceSection from '../components/analytics/AnalyticsMarketplaceSection.vue'
import AnalyticsUsersSection from '../components/analytics/AnalyticsUsersSection.vue'
import AnalyticsSearchSection from '../components/analytics/AnalyticsSearchSection.vue'
import AnalyticsOpsSection from '../components/analytics/AnalyticsOpsSection.vue'
import AnalyticsExternalSection from '../components/analytics/AnalyticsExternalSection.vue'

const loading = ref(true)
const externalLoading = ref(false)
const loadError = ref<string | null>(null)
const rangeError = ref<string | null>(null)
const payload = ref<AdminAnalyticsSummary | null>(null)
const priorPayload = ref<AdminAnalyticsSummary | null>(null)
const externalPayload = ref<ExternalAnalyticsSummary | null>(null)
const savedPresets = ref<Array<{ name: string; preset: AnalyticsPreset; from?: string; to?: string }>>([])
const savedPresetName = ref('')
const preset = ref<AnalyticsPreset>('30d')
const customDefaults = defaultCustomFromTo()
const customFrom = ref(customDefaults.from)
const customTo = ref(customDefaults.to)
const cohortWeeks = ref(8)
const searchDays = ref(14)
const lastLoaded = ref<string | null>(null)

const dateLabel = ref('')

function effectiveSearchDays(daysInRange: number): number {
  return Math.min(searchDays.value, daysInRange, 90)
}

async function loadExternal(from: string, to: string) {
  externalLoading.value = true
  try {
    const res = await adminApi<ExternalAnalyticsSummary>('/admin/analytics/external', {
      query: { from, to },
    })
    if (res.ok) {
      externalPayload.value = res.data ?? null
    }
  } finally {
    externalLoading.value = false
  }
}

async function load() {
  const range = resolveAnalyticsRange(preset.value, customFrom.value, customTo.value)
  if (!range.ok) {
    rangeError.value = range.error
    return
  }
  rangeError.value = null

  loading.value = true
  loadError.value = null
  try {
    const searchDaysParam = effectiveSearchDays(range.daysInRange)
    const res = await adminApi<AdminAnalyticsSummary>('/admin/analytics/summary', {
      query: {
        from: range.from,
        to: range.to,
        cohort_weeks: String(cohortWeeks.value),
        search_days: String(searchDaysParam),
      },
    })
    if (!res.ok) {
      loadError.value = res.body.slice(0, 300) || `HTTP ${res.status}`
      return
    }
    payload.value = res.data ?? null
    if (payload.value) {
      dateLabel.value = formatDateRange(payload.value.meta.from, payload.value.meta.to)
    }
    const prior = priorPeriodRange(range.from, range.to)
    const priorRes = await adminApi<AdminAnalyticsSummary>('/admin/analytics/summary', {
      query: {
        from: prior.from,
        to: prior.to,
        cohort_weeks: String(cohortWeeks.value),
        search_days: String(searchDaysParam),
      },
    })
    priorPayload.value = priorRes.ok ? (priorRes.data ?? null) : null
    lastLoaded.value = new Date().toLocaleTimeString('sk-SK', {
      hour: '2-digit',
      minute: '2-digit',
    })
    void loadExternal(range.from, range.to)
  } finally {
    loading.value = false
  }
}

function applyCustom() {
  if (preset.value !== 'custom') {
    preset.value = 'custom'
  }
  void load()
}

const SAVED_KEY = 'jobbie-admin-analytics-presets'

function loadSavedPresets() {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    savedPresets.value = raw ? (JSON.parse(raw) as typeof savedPresets.value) : []
  } catch {
    savedPresets.value = []
  }
}

function saveCurrentPreset() {
  const name = savedPresetName.value.trim()
  if (!name) return
  const entry = {
    name,
    preset: preset.value,
    from: customFrom.value,
    to: customTo.value,
  }
  const next = [...savedPresets.value.filter((p) => p.name !== name), entry]
  savedPresets.value = next
  localStorage.setItem(SAVED_KEY, JSON.stringify(next))
  savedPresetName.value = ''
}

function applySavedPreset(entry: (typeof savedPresets.value)[number]) {
  preset.value = entry.preset
  if (entry.preset === 'custom' && entry.from && entry.to) {
    customFrom.value = entry.from
    customTo.value = entry.to
  }
  void load()
}

function exportCsv() {
  if (!payload.value) return
  exportAnalyticsSummaryCsv(payload.value)
}

loadSavedPresets()

watch(
  [preset, cohortWeeks, searchDays],
  () => {
    if (preset.value === 'custom') return
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="analytics-page">
    <header class="analytics-header">
      <div>
        <h1 class="page-title">Analytics</h1>
        <p v-if="dateLabel" class="page-subtitle">{{ dateLabel }}</p>
      </div>
    </header>

    <AnalyticsToolbar
      :preset="preset"
      :custom-from="customFrom"
      :custom-to="customTo"
      :range-error="rangeError"
      :cohort-weeks="cohortWeeks"
      :search-days="searchDays"
      :loading="loading"
      :last-loaded="lastLoaded"
      :saved-presets="savedPresets"
      :saved-preset-name="savedPresetName"
      :can-export="!!payload"
      @update:preset="preset = $event"
      @update:custom-from="customFrom = $event"
      @update:custom-to="customTo = $event"
      @update:cohort-weeks="cohortWeeks = $event"
      @update:search-days="searchDays = $event"
      @update:saved-preset-name="savedPresetName = $event"
      @apply-custom="applyCustom()"
      @refresh="load()"
      @save-preset="saveCurrentPreset()"
      @apply-saved="applySavedPreset($event)"
      @export-csv="exportCsv()"
    />

    <p v-if="loadError" class="error card" style="margin-top: 1rem">
      {{ loadError }}
      <button type="button" class="btn btn-sm" style="margin-top: 0.5rem" @click="load()">
        Skúsiť znova
      </button>
    </p>

    <p v-else-if="loading && !payload" class="muted" style="margin-top: 1.5rem">Načítavam…</p>

    <template v-else-if="payload">
      <AnalyticsKpiGrid
        :summary="payload"
        :prior-summary="priorPayload"
        class="analytics-block"
      />
      <AnalyticsExternalSection
        id="external"
        :external="externalPayload"
        :loading="externalLoading"
        :platform-signups="payload.funnel?.signups"
        class="analytics-block"
      />
      <AnalyticsFunnelSection :summary="payload" class="analytics-block" />
      <AnalyticsGrowthSection :summary="payload" class="analytics-block" />
      <AnalyticsRevenueSection :summary="payload" class="analytics-block" />
      <AnalyticsMarketplaceSection :summary="payload" class="analytics-block" />
      <AnalyticsUsersSection :summary="payload" class="analytics-block" />
      <AnalyticsSearchSection :summary="payload" class="analytics-block" />
      <AnalyticsOpsSection :summary="payload" class="analytics-block" />
    </template>
  </div>
</template>

<style scoped>
.analytics-page {
  max-width: 1280px;
}

.analytics-header {
  margin-bottom: 1rem;
}

.analytics-block {
  margin-top: 1.25rem;
}

.analytics-block :deep(.section-card) {
  margin-top: 0;
}
</style>
