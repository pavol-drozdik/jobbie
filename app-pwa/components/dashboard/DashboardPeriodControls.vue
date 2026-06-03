<template>
  <div class="space-y-4">
    <JaSegmentedToggle
      :model-value="preset"
      :options="presetOptions"
      @update:model-value="onPresetChange"
    />
    <div
      v-if="preset === 'custom'"
      class="flex flex-wrap items-end gap-3 rounded-2xl bg-marketing-surface px-4 py-4"
    >
      <label class="flex flex-col gap-0.5 font-dmSans text-[14px] font-semibold text-black/60">
        {{ S.dashboardDateFrom }}
        <input
          :value="dateFrom"
          type="date"
          class="addjob-input addjob-input--compact cv-field text-xs"
          @input="emitDateFrom"
        >
      </label>
      <label class="flex flex-col gap-0.5 font-dmSans text-[14px] font-semibold text-black/60">
        {{ S.dashboardDateTo }}
        <input
          :value="dateTo"
          type="date"
          class="addjob-input addjob-input--compact cv-field text-xs"
          @input="emitDateTo"
        >
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { DashboardPeriodPreset } from '~/utils/dashboard-types'

const props = defineProps<{
  preset: DashboardPeriodPreset
  dateFrom: string
  dateTo: string
  presetOptions: ReadonlyArray<{ value: DashboardPeriodPreset; label: string }>
}>()

const emit = defineEmits<{
  'apply-preset': [value: DashboardPeriodPreset]
  'update:dateFrom': [value: string]
  'update:dateTo': [value: string]
}>()

function onPresetChange(value: string): void {
  emit('apply-preset', value as DashboardPeriodPreset)
}

function emitDateFrom(e: Event): void {
  emit('update:dateFrom', (e.target as HTMLInputElement).value)
}

function emitDateTo(e: Event): void {
  emit('update:dateTo', (e.target as HTMLInputElement).value)
}
</script>
