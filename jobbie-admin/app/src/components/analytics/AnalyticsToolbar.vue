<script setup lang="ts">
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
</script>

<template>
  <div class="analytics-toolbar card">
    <div class="analytics-toolbar-row">
      <label class="field-label">Obdobie</label>
      <div class="analytics-presets">
        <button
          type="button"
          class="btn btn-sm"
          :class="{ 'btn-primary': preset === '7d' }"
          @click="emit('update:preset', '7d')"
        >
          7 dní
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="{ 'btn-primary': preset === '30d' }"
          @click="emit('update:preset', '30d')"
        >
          30 dní
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="{ 'btn-primary': preset === '90d' }"
          @click="emit('update:preset', '90d')"
        >
          90 dní
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="{ 'btn-primary': preset === 'custom' }"
          @click="emit('update:preset', 'custom')"
        >
          Vlastné
        </button>
      </div>
    </div>
    <div v-if="preset === 'custom'" class="analytics-toolbar-row analytics-custom-range">
      <div class="audit-filter-field">
        <label class="field-label" for="analytics-from">Od</label>
        <input
          id="analytics-from"
          type="date"
          class="field-input"
          :value="customFrom"
          @input="emit('update:customFrom', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="audit-filter-field">
        <label class="field-label" for="analytics-to">Do</label>
        <input
          id="analytics-to"
          type="date"
          class="field-input"
          :value="customTo"
          @input="emit('update:customTo', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <button type="button" class="btn btn-primary btn-sm" :disabled="loading" @click="emit('applyCustom')">
        Použiť
      </button>
      <p v-if="rangeError" class="analytics-range-error">{{ rangeError }}</p>
    </div>
    <div class="analytics-toolbar-row">
      <label class="field-label" for="cohort-weeks">Kohorty (týždne)</label>
      <select
        id="cohort-weeks"
        class="field-input analytics-select"
        :value="cohortWeeks"
        @change="emit('update:cohortWeeks', Number(($event.target as HTMLSelectElement).value))"
      >
        <option :value="4">4</option>
        <option :value="8">8</option>
        <option :value="12">12</option>
        <option :value="24">24</option>
      </select>
      <label class="field-label" for="search-days">Vyhľadávanie (dni)</label>
      <select
        id="search-days"
        class="field-input analytics-select"
        :value="searchDays"
        @change="emit('update:searchDays', Number(($event.target as HTMLSelectElement).value))"
      >
        <option :value="7">7</option>
        <option :value="14">14</option>
        <option :value="30">30</option>
        <option :value="90">90</option>
      </select>
      <button type="button" class="btn btn-primary btn-sm" :disabled="loading" @click="emit('refresh')">
        {{ loading ? 'Načítavam…' : 'Obnoviť' }}
      </button>
      <span v-if="lastLoaded" class="analytics-meta">Aktualizované {{ lastLoaded }}</span>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="!canExport"
        @click="emit('exportCsv')"
      >
        Export CSV
      </button>
    </div>
    <div class="analytics-toolbar-row analytics-saved-row">
      <label class="field-label" for="saved-preset-name">Uložený filter</label>
      <input
        id="saved-preset-name"
        class="field-input"
        :value="savedPresetName"
        placeholder="Názov presetu"
        @input="emit('update:savedPresetName', ($event.target as HTMLInputElement).value)"
      />
      <button type="button" class="btn btn-ghost btn-sm" @click="emit('savePreset')">
        Uložiť
      </button>
      <button
        v-for="p in savedPresets"
        :key="p.name"
        type="button"
        class="btn btn-sm btn-ghost"
        @click="emit('applySaved', p)"
      >
        {{ p.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.analytics-custom-range {
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem;
}

.analytics-range-error {
  width: 100%;
  margin: 0;
  font-size: 0.85rem;
  color: var(--danger);
}

.analytics-saved-row {
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
}

.analytics-saved-row .field-input {
  max-width: 160px;
}
</style>
