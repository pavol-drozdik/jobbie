<template>
  <DashboardPageShell
    :title="S.dashboardProviderTitle"
    :description="S.dashboardProviderSubtitle"
  >
    <DashboardRoleTabs v-if="isCustomer && isProvider">
      <NuxtLink
        to="/dashboard/zakaznik"
        class="rounded-full px-3 py-1.5 text-[14px] font-semibold text-black/55 no-underline transition-colors hover:bg-white hover:text-marketing-green"
      >
        ← {{ S.dashboardTabCustomer }}
      </NuxtLink>
      <span
        class="rounded-full bg-white px-3 py-1.5 text-[14px] font-semibold text-marketing-green shadow-sm ring-1 ring-black/5"
      >
        {{ S.dashboardTabProvider }}
      </span>
    </DashboardRoleTabs>

    <DashboardPeriodControls
      class="mb-6"
      :preset="preset"
      :date-from="dateFrom"
      :date-to="dateTo"
      :preset-options="presetOptions"
      @apply-preset="applyPreset"
      @update:date-from="dateFrom = $event"
      @update:date-to="dateTo = $event"
    />

    <DashboardLoadingSkeleton v-if="loading" />
    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center"
      role="alert"
    >
      <p class="m-0 text-sm font-semibold text-red-800">{{ S.dashboardLoadError }}</p>
      <AppButton variant="primary" size="sm" class="mt-3" @click="fetchData">
        {{ S.listFetchRetry }}
      </AppButton>
    </div>
    <div v-else-if="payload" class="space-y-6">
      <section class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-3">
          <DashboardMetricCard
            :value="displayDashboardScalarInt(payload.simple.profileViews)"
            :label="S.dashboardProviderProfileViews"
            :hint="S.dashboardProviderProfileViewsWhy"
            :insufficient-data="isMetricInsufficient(payload.simple.profileViews)"
          />
          <DashboardMetricCard
            :value="conversionDisplay.text"
            :label="S.dashboardProviderConversion"
            :hint="S.dashboardProviderConversionWhy"
            :insufficient-data="conversionDisplay.insufficient"
          />
          <DashboardMetricCard
            :value="ratingDisplay.text"
            :label="S.dashboardProviderAvgRating"
            :hint="ratingDisplayHint"
            :insufficient-data="ratingDisplay.insufficient"
          />
        </div>
        <DashboardUpsellBanner />
      </section>
      <!-- TODO(subscription-gate): hide the complex block below when plan is free — check user_subscriptions + subscription_plans slug. -->
      <section class="space-y-4">
        <h2 class="font-dmSans text-base font-extrabold text-black">
          {{ S.dashboardDetailSection }}
        </h2>
        <article class="rounded-2xl bg-marketing-surface px-6 py-[22px]">
          <p class="font-dmSans text-[15px] font-semibold text-black/70">
            {{ S.dashboardProviderBenchmark }}
          </p>
          <p class="mt-1 font-dmSans text-sm text-black">
            {{ benchmarkLine }}
          </p>
        </article>
        <DashboardChartCard
          :title="S.dashboardProviderTopCategories"
          chart-height="h-48"
          :empty-text="barChartEmpty ? S.dashboardChartNoData : undefined"
        >
          <canvas ref="canvasBar" class="size-full" />
        </DashboardChartCard>
        <DashboardChartCard
          :title="S.dashboardProviderViewsContactsChart"
          :empty-text="viewsContactsChartEmpty ? S.dashboardChartNoData : undefined"
        >
          <canvas ref="canvasLineDual" class="size-full" />
        </DashboardChartCard>
        <DashboardChartCard
          :title="S.dashboardProviderLineRating"
          :empty-text="ratingChartEmpty ? S.dashboardChartNoData : undefined"
        >
          <canvas ref="canvasLineRating" class="size-full" />
        </DashboardChartCard>
      </section>
    </div>
  </DashboardPageShell>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { DashboardPeriodPreset, ProviderDashboardPayload } from '~/utils/dashboard-types'
import {
  buildDashboardChartOptions,
  createBarDataset,
  createLineDataset,
  CHART_AMBER,
  CHART_SECONDARY,
  ratingScaleOverrides,
} from '~/utils/dashboard-chart-theme'
import {
  areDashboardSeriesEmpty,
  displayDashboardScalarInt,
  isDashboardSeriesEmpty,
  isMetricInsufficient,
  providerBenchmarkMessage,
  resolveProviderConversionDisplay,
  resolveProviderRatingDisplay,
} from '~/utils/dashboard-display'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'dashboard-profesional'],
})

const { api } = useApi()
const { isCustomer, isProvider } = useAuth()
const { loadChartJs } = useChartJs()
const { preset, applyPreset, dateFrom, dateTo, fromIso, toIso } = useDashboardPeriod('30d')

const presetOptions: { value: DashboardPeriodPreset; label: string }[] = [
  { value: '1d', label: S.dashboardPreset1d },
  { value: '7d', label: S.dashboardPreset7d },
  { value: '30d', label: S.dashboardPreset30d },
  { value: 'custom', label: S.dashboardPresetCustom },
]

const loading = ref(true)
const loadError = ref(false)
const payload = ref<ProviderDashboardPayload | null>(null)

const canvasBar = ref<HTMLCanvasElement | null>(null)
const canvasLineDual = ref<HTMLCanvasElement | null>(null)
const canvasLineRating = ref<HTMLCanvasElement | null>(null)
const chartInstances: { destroy: () => void }[] = []

const conversionDisplay = computed(() => {
  if (!payload.value) {
    return { text: S.dashboardInsufficientData, insufficient: true }
  }
  return resolveProviderConversionDisplay(
    payload.value.simple.profileViews,
    payload.value.simple.conversionRate,
  )
})

const ratingDisplay = computed(() =>
  resolveProviderRatingDisplay(payload.value?.simple.avgRating, 1),
)

const ratingDisplayHint = computed(() =>
  ratingDisplay.value.isAllTime
    ? S.dashboardProviderAvgRatingWhyAllTime
    : S.dashboardProviderAvgRatingWhy,
)

const benchmarkLine = computed(() => {
  const b = payload.value?.complex.benchmark
  if (!b || b.insufficientData) return providerBenchmarkMessage(b?.reason)
  const y = b.yourAverage?.toFixed(1) ?? '—'
  const p = b.categoryAverage?.toFixed(1) ?? '—'
  return S.dashboardProviderBenchmarkLine.replace('{yours}', y).replace('{peers}', p)
})

const barChartEmpty = computed(() => {
  const bar = payload.value?.complex.barTopCategories ?? []
  return bar.length === 0 || bar.every((b) => b.count === 0)
})

const viewsContactsChartEmpty = computed(() => {
  const p = payload.value?.complex
  if (!p) return true
  return areDashboardSeriesEmpty(p.lineViews, p.lineContacts)
})

const ratingChartEmpty = computed(() =>
  isDashboardSeriesEmpty(payload.value?.complex.lineRating ?? []),
)

async function fetchData(): Promise<void> {
  if (!fromIso.value || !toIso.value) return
  loading.value = true
  loadError.value = false
  const res = await api<ProviderDashboardPayload>('/api/dashboard/provider', {
    query: { from: fromIso.value, to: toIso.value },
  })
  payload.value = res.ok && res.data ? res.data : null
  loadError.value = !res.ok || !res.data
  loading.value = false
  await scheduleDrawCharts()
}

async function scheduleDrawCharts(): Promise<void> {
  await nextTick()
  await drawCharts()
  if (chartInstances.length > 0 || !payload.value) return
  const hasChartData =
    !barChartEmpty.value || !viewsContactsChartEmpty.value || !ratingChartEmpty.value
  if (!hasChartData) return
  await nextTick()
  await drawCharts()
}

function destroyCharts(): void {
  for (const c of chartInstances) {
    c.destroy()
  }
  chartInstances.length = 0
}

async function drawCharts(): Promise<void> {
  destroyCharts()
  if (!payload.value || import.meta.server) return
  try {
    await loadChartJs()
  } catch {
    return
  }
  const ChartCtor = (window as unknown as { Chart: new (ctx: unknown, cfg: unknown) => { destroy: () => void } })
    .Chart
  if (!ChartCtor) return
  const bar = payload.value.complex.barTopCategories
  if (canvasBar.value && !barChartEmpty.value) {
    const inst = new ChartCtor(canvasBar.value, {
      type: 'bar',
      data: {
        labels: bar.map((b) => b.label),
        datasets: [createBarDataset(S.sector, bar.map((b) => b.count))],
      },
      options: buildDashboardChartOptions(),
    })
    chartInstances.push(inst)
  }
  const lv = payload.value.complex.lineViews
  const lc = payload.value.complex.lineContacts
  if (canvasLineDual.value && !viewsContactsChartEmpty.value) {
    const inst = new ChartCtor(canvasLineDual.value, {
      type: 'line',
      data: {
        labels: lv.map((p) => p.label ?? p.month),
        datasets: [
          createLineDataset(
            S.dashboardProviderLineViews,
            lv.map((p) => p.value),
          ),
          createLineDataset(
            S.dashboardProviderLineContacts,
            lc.map((p) => p.value),
            CHART_SECONDARY,
          ),
        ],
      },
      options: buildDashboardChartOptions(),
    })
    chartInstances.push(inst)
  }
  const lr = payload.value.complex.lineRating
  if (canvasLineRating.value && !ratingChartEmpty.value) {
    const inst = new ChartCtor(canvasLineRating.value, {
      type: 'line',
      data: {
        labels: lr.map((p) => p.label ?? p.month),
        datasets: [
          createLineDataset(
            S.dashboardProviderLineRating,
            lr.map((p) => p.value),
            CHART_AMBER,
          ),
        ],
      },
      options: buildDashboardChartOptions(ratingScaleOverrides()),
    })
    chartInstances.push(inst)
  }
}

watch(
  () => [fromIso.value, toIso.value] as const,
  () => {
    void fetchData()
  },
  { immediate: true },
)

watch(
  () =>
    [
      payload.value,
      loading.value,
      barChartEmpty.value,
      viewsContactsChartEmpty.value,
      ratingChartEmpty.value,
    ] as const,
  async ([data, isLoading]) => {
    if (!data || isLoading) return
    await scheduleDrawCharts()
  },
)

onBeforeUnmount(() => {
  destroyCharts()
})
</script>
