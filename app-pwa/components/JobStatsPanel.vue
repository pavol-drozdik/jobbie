<template>

  <section

    class="overflow-hidden rounded-[20px] bg-white font-dmSans text-black shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)]"

  >

    <header class="border-b border-black/[0.06] px-5 py-4 sm:px-7">

      <h2 class="m-0 font-dmSans text-[20px] font-extrabold leading-tight text-black sm:text-[22px]">

        {{ S.jobStatsSectionTitle }}

      </h2>

    </header>



    <div class="space-y-6 px-5 py-6 sm:px-7 sm:py-7">

      <DashboardPeriodControls

        :preset="preset"

        :date-from="dateFrom"

        :date-to="dateTo"

        :preset-options="presets"

        @apply-preset="applyPreset"

        @update:date-from="dateFrom = $event"

        @update:date-to="dateTo = $event"

      />



      <DashboardLoadingSkeleton v-if="loading" :metric-count="4" :include-charts="true" />

      <div

        v-else-if="loadError"

        class="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-center"

        role="alert"

      >

        <p class="m-0 text-sm font-semibold text-red-800">{{ S.dashboardLoadError }}</p>

        <AppButton variant="primary" size="sm" class="mt-3" @click="fetchStats">

          {{ S.listFetchRetry }}

        </AppButton>

      </div>



      <div v-else-if="payload" class="space-y-6">

        <section class="space-y-4">

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <DashboardMetricCard

              :value="displayDashboardScalarInt(payload.simple.applicants)"

              :label="S.jobStatsApplicants"

              :insufficient-data="isMetricInsufficient(payload.simple.applicants)"

            />

            <DashboardMetricCard

              :value="displayDashboardScalarInt(payload.simple.uniqueViewers)"

              :label="S.jobStatsViewers"

              :insufficient-data="isMetricInsufficient(payload.simple.uniqueViewers)"

            />

            <DashboardMetricCard

              :value="displayDashboardScalarInt(payload.simple.impressions)"

              :label="S.jobStatsImpressions"

              :insufficient-data="isMetricInsufficient(payload.simple.impressions)"

            />

            <DashboardMetricCard

              :value="conversionDisplay.text"

              :label="S.jobStatsConversion"

              :insufficient-data="conversionDisplay.insufficient"

            />

          </div>

        </section>



        <section class="space-y-4">

          <h3 class="m-0 font-dmSans text-base font-extrabold text-black">

            {{ S.dashboardDetailSection }}

          </h3>

          <DashboardMetricCard

            :value="displayDashboardScalar(payload.complex.avgTimeToHireDays, 1)"

            :label="S.jobStatsAvgTimeToHire"

            :hint="S.jobStatsAvgTimeToHireWhy"

            :insufficient-data="isMetricInsufficient(payload.complex.avgTimeToHireDays)"

          />

          <DashboardChartCard

            :title="S.jobStatsApplicantsPerDay"

            :empty-text="applicantsChartEmpty ? S.dashboardChartNoData : undefined"

          >

            <canvas ref="canvasLine" class="size-full" />

          </DashboardChartCard>

        </section>

      </div>

    </div>

  </section>

</template>



<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { S } from '~/utils/strings'

import type { DashboardPeriodPreset, JobStatsPayload } from '~/utils/dashboard-types'

import {

  buildDashboardChartOptions,

  createLineDataset,

  integerYScaleOverrides,

} from '~/utils/dashboard-chart-theme'

import {

  displayDashboardScalar,

  displayDashboardScalarInt,

  isDashboardSeriesEmpty,

  isMetricInsufficient,

  resolveJobConversionDisplay,

} from '~/utils/dashboard-display'



const props = defineProps<{ jobId: string }>()



const { api } = useApi()

const { loadChartJs } = useChartJs()

const { preset, applyPreset, dateFrom, dateTo, fromIso, toIso } = useDashboardPeriod('30d')



const presets: { value: DashboardPeriodPreset; label: string }[] = [

  { value: '1d', label: S.dashboardPreset1d },

  { value: '7d', label: S.dashboardPreset7d },

  { value: '30d', label: S.dashboardPreset30d },

  { value: 'custom', label: S.dashboardPresetCustom },

]



const loading = ref(true)

const loadError = ref(false)

const payload = ref<JobStatsPayload | null>(null)

const canvasLine = ref<HTMLCanvasElement | null>(null)

const chartInstances: { destroy: () => void }[] = []



const conversionDisplay = computed(() => {

  if (!payload.value) {

    return { text: S.dashboardInsufficientData, insufficient: true }

  }

  return resolveJobConversionDisplay(

    payload.value.simple.uniqueViewers,

    payload.value.simple.conversionRate,

  )

})



const applicantsChartEmpty = computed(() => {

  const line = payload.value?.complex.lineApplicants ?? []

  return isDashboardSeriesEmpty(line.map((p) => ({ value: p.value })))

})



function destroyCharts(): void {

  for (const c of chartInstances) {

    c.destroy()

  }

  chartInstances.length = 0

}



async function drawCharts(): Promise<void> {

  destroyCharts()

  if (!payload.value || import.meta.server || applicantsChartEmpty.value) return

  try {

    await loadChartJs()

  } catch {

    return

  }

  const ChartCtor = (window as unknown as { Chart: new (ctx: unknown, cfg: unknown) => { destroy: () => void } })

    .Chart

  if (!ChartCtor || !canvasLine.value) return

  const line = payload.value.complex.lineApplicants

  const inst = new ChartCtor(canvasLine.value, {

    type: 'line',

    data: {

      labels: line.map((p) => p.day),

      datasets: [

        createLineDataset(S.jobStatsApplicantsPerDay, line.map((p) => p.value)),

      ],

    },

    options: buildDashboardChartOptions(integerYScaleOverrides()),

  })

  chartInstances.push(inst)

}



async function scheduleDrawCharts(): Promise<void> {

  await nextTick()

  await drawCharts()

  if (chartInstances.length > 0 || !payload.value || applicantsChartEmpty.value) return

  await nextTick()

  await drawCharts()

}



async function fetchStats(): Promise<void> {

  if (!fromIso.value || !toIso.value) return

  loading.value = true

  loadError.value = false

  const res = await api<JobStatsPayload>(`/api/dashboard/customer/job/${props.jobId}`, {

    query: { from: fromIso.value, to: toIso.value },

  })

  payload.value = res.ok && res.data ? res.data : null

  loadError.value = !res.ok || !res.data

  loading.value = false

  await scheduleDrawCharts()

}



watch(

  () => [props.jobId, fromIso.value, toIso.value] as const,

  () => {

    void fetchStats()

  },

  { immediate: true },

)



watch(

  () => [payload.value, loading.value, applicantsChartEmpty.value] as const,

  async ([data, isLoading]) => {

    if (!data || isLoading) return

    await scheduleDrawCharts()

  },

)



onBeforeUnmount(() => {

  destroyCharts()

})

</script>


