<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import type { AnalyticsPreset } from '../../utils/analytics-format'

type SavedPreset = {
  name: string
  preset: AnalyticsPreset
  from?: string
  to?: string
}

defineProps<{
  preset: AnalyticsPreset
  customFrom: string
  customTo: string
  rangeError: string | null
  cohortWeeks: number
  searchDays: number
  loading: boolean
  lastLoaded: string | null
  savedPresets: SavedPreset[]
  savedPresetName: string
  canExport: boolean
}>()

const emit = defineEmits<{
  'update:preset': [value: AnalyticsPreset]
  'update:customFrom': [value: string]
  'update:customTo': [value: string]
  'update:cohortWeeks': [value: number]
  'update:searchDays': [value: number]
  'update:savedPresetName': [value: string]
  applyCustom: []
  refresh: []
  savePreset: []
  applySaved: [preset: SavedPreset]
  exportCsv: []
}>()

const presetOptions = [
  { label: '7 dní', value: '7d' as const },
  { label: '30 dní', value: '30d' as const },
  { label: '90 dní', value: '90d' as const },
  { label: 'Vlastné', value: 'custom' as const },
]

const cohortOptions = [
  { label: '4', value: 4 },
  { label: '8', value: 8 },
  { label: '12', value: 12 },
  { label: '24', value: 24 },
]

const searchDayOptions = [
  { label: '7', value: 7 },
  { label: '14', value: 14 },
  { label: '30', value: 30 },
  { label: '90', value: 90 },
]
</script>

<template>
  <div class="admin-section-card analytics-toolbar">
    <div class="analytics-toolbar-row">
      <span class="text-sm font-medium text-slate-700">Obdobie</span>
      <SelectButton
        :model-value="preset"
        :options="presetOptions"
        option-label="label"
        option-value="value"
        size="small"
        @update:model-value="emit('update:preset', $event)"
      />
    </div>

    <div v-if="preset === 'custom'" class="analytics-toolbar-row analytics-custom-range">
      <div class="flex min-w-36 flex-col gap-1">
        <label for="analytics-from" class="text-xs font-medium text-slate-500">Od</label>
        <input
          id="analytics-from"
          type="date"
          class="rounded-md border border-slate-200 px-3 py-2 text-sm"
          :value="customFrom"
          @input="emit('update:customFrom', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <div class="flex min-w-36 flex-col gap-1">
        <label for="analytics-to" class="text-xs font-medium text-slate-500">Do</label>
        <input
          id="analytics-to"
          type="date"
          class="rounded-md border border-slate-200 px-3 py-2 text-sm"
          :value="customTo"
          @input="emit('update:customTo', ($event.target as HTMLInputElement).value)"
        >
      </div>
      <Button label="Použiť" size="small" :disabled="loading" @click="emit('applyCustom')" />
      <Message v-if="rangeError" severity="error" :closable="false" class="w-full">{{ rangeError }}</Message>
    </div>

    <div class="analytics-toolbar-row">
      <div class="flex items-center gap-2">
        <label for="cohort-weeks" class="text-sm font-medium text-slate-700">Kohorty (týždne)</label>
        <Select
          id="cohort-weeks"
          :model-value="cohortWeeks"
          :options="cohortOptions"
          option-label="label"
          option-value="value"
          class="w-20"
          @update:model-value="emit('update:cohortWeeks', $event)"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="search-days" class="text-sm font-medium text-slate-700">Vyhľadávanie (dni)</label>
        <Select
          id="search-days"
          :model-value="searchDays"
          :options="searchDayOptions"
          option-label="label"
          option-value="value"
          class="w-20"
          @update:model-value="emit('update:searchDays', $event)"
        />
      </div>
      <Button
        :label="loading ? 'Načítavam…' : 'Obnoviť'"
        size="small"
        :loading="loading"
        @click="emit('refresh')"
      />
      <span v-if="lastLoaded" class="text-xs text-slate-500">Aktualizované {{ lastLoaded }}</span>
      <Button
        label="Export CSV"
        severity="secondary"
        size="small"
        :disabled="!canExport"
        @click="emit('exportCsv')"
      />
    </div>

    <div class="analytics-toolbar-row analytics-saved-row">
      <label for="saved-preset-name" class="text-sm font-medium text-slate-700">Uložený filter</label>
      <InputText
        id="saved-preset-name"
        class="max-w-40"
        :model-value="savedPresetName"
        placeholder="Názov presetu"
        @update:model-value="emit('update:savedPresetName', $event ?? '')"
      />
      <Button label="Uložiť" severity="secondary" size="small" @click="emit('savePreset')" />
      <Button
        v-for="p in savedPresets"
        :key="p.name"
        :label="p.name"
        severity="secondary"
        size="small"
        outlined
        @click="emit('applySaved', p)"
      />
    </div>
  </div>
</template>

<style scoped>
.analytics-custom-range {
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.analytics-saved-row {
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
}
</style>
