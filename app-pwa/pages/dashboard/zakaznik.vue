<template>
  <DashboardPageShell
    :title="S.dashboardCustomerTitle"
    :description="S.dashboardCustomerSubtitle"
  >
    <DashboardRoleTabs v-if="isCustomer && isProvider">
      <span
        class="rounded-full bg-white px-3 py-1.5 text-[14px] font-semibold text-marketing-green shadow-sm ring-1 ring-black/5"
      >
        {{ S.dashboardTabCustomer }}
      </span>
      <NuxtLink
        to="/dashboard/poskytovatel"
        class="rounded-full px-3 py-1.5 text-[14px] font-semibold text-black/55 no-underline transition-colors hover:bg-white hover:text-marketing-green"
      >
        {{ S.dashboardTabProvider }} →
      </NuxtLink>
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
        <div class="grid gap-4 sm:grid-cols-2">
          <DashboardMetricCard
            :value="displayDashboardScalar(payload.simple.avgApplicantsPerListing, 1)"
            :label="S.dashboardCustomerAvgApplicants"
            :hint="S.dashboardCustomerAvgApplicantsWhy"
            :insufficient-data="isMetricInsufficient(payload.simple.avgApplicantsPerListing)"
          />
          <DashboardMetricCard
            :value="displayDashboardScalar(payload.simple.avgRating, 1)"
            :label="S.dashboardCustomerAvgRating"
            :hint="S.dashboardCustomerAvgRatingWhy"
            :insufficient-data="isMetricInsufficient(payload.simple.avgRating)"
          />
        </div>
        <DashboardUpsellBanner />
      </section>
      <!-- TODO(subscription-gate): hide the complex block below when plan is free — check user_subscriptions + subscription_plans slug. -->
      <section class="space-y-4">
        <h2 class="font-dmSans text-base font-extrabold text-black">
          {{ S.dashboardDetailSection }}
        </h2>
        <DashboardMetricCard
          :value="displayDashboardScalar(payload.complex.avgTimeToHireDays, 1)"
          :label="S.dashboardCustomerTimeToHire"
          :hint="S.dashboardCustomerTimeToHireWhy"
          :insufficient-data="isMetricInsufficient(payload.complex.avgTimeToHireDays)"
        />
        <DashboardChartCard
          :title="S.dashboardCustomerBarCategories"
          :empty-text="barChartEmpty ? S.dashboardChartNoData : undefined"
        >
          <canvas ref="canvasBar" class="size-full" />
        </DashboardChartCard>
        <DashboardChartCard
          :title="S.dashboardCustomerLineApplicants"
          :empty-text="applicantsChartEmpty ? S.dashboardChartNoData : undefined"
        >
          <canvas ref="canvasLineApplicants" class="size-full" />
        </DashboardChartCard>
        <DashboardChartCard
          :title="S.dashboardCustomerLineRating"
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
import type { CustomerDashboardPayload, DashboardPeriodPreset } from '~/utils/dashboard-types'
import {
  buildDashboardChartOptions,
  createBarDataset,
  createLineDataset,
  CHART_AMBER,
  ratingScaleOverrides,
} from '~/utils/dashboard-chart-theme'
import {
  displayDashboardScalar,
  isDashboardSeriesEmpty,
  isMetricInsufficient,
} from '~/utils/dashboard-display'

definePageMeta({
  layout: 'app',
  middleware: ['auth', 'dashboard-zakaznik'],
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
const payload = ref<CustomerDashboardPayload | null>(null)

const canvasBar = ref<HTMLCanvasElement | null>(null)
const canvasLineApplicants = ref<HTMLCanvasElement | null>(null)
const canvasLineRating = ref<HTMLCanvasElement | null>(null)

const chartInstances: { destroy: () => void }[] = []

const barChartEmpty = computed(() => {
  const bar = payload.value?.complex.barCategories ?? []
  return bar.length === 0 || bar.every((b) => b.count === 0)
})

const applicantsChartEmpty = computed(() =>
  isDashboardSeriesEmpty(payload.value?.complex.lineApplicants ?? []),
)

const ratingChartEmpty = computed(() =>
  isDashboardSeriesEmpty(payload.value?.complex.lineRating ?? []),
)

async function fetchData(): Promise<void> {
  if (!fromIso.value || !toIso.value) return
  loading.value = true
  loadError.value = false
  const res = await api<CustomerDashboardPayload>('/api/dashboard/customer', {
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
    !barChartEmpty.value || !applicantsChartEmpty.value || !ratingChartEmpty.value
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
  const bar = payload.value.complex.barCategories
  if (canvasBar.value && !barChartEmpty.value) {
    const inst = new ChartCtor(canvasBar.value, {
      type: 'bar',
      data: {
        labels: bar.map((b) => b.label),
        datasets: [createBarDataset(S.category, bar.map((b) => b.count))],
      },
      options: buildDashboardChartOptions(),
    })
    chartInstances.push(inst)
  }
  const la = payload.value.complex.lineApplicants
  if (canvasLineApplicants.value && !applicantsChartEmpty.value) {
    const inst = new ChartCtor(canvasLineApplicants.value, {
      type: 'line',
      data: {
        labels: la.map((p) => p.label ?? p.month),
        datasets: [
          createLineDataset(
            S.dashboardCustomerLineApplicants,
            la.map((p) => p.value),
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
          createLineDataset(S.dashboardCustomerLineRating, lr.map((p) => p.value), CHART_AMBER),
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
      applicantsChartEmpty.value,
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
