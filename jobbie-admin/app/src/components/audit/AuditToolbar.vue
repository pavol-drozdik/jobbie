<script setup lang="ts">
const EVENT_PREFIX_CHIPS = [
  { label: 'auth.*', prefix: 'auth.' },
  { label: 'credits.*', prefix: 'credits.' },
  { label: 'account.*', prefix: 'account.' },
  { label: 'blog.*', prefix: 'blog.' },
] as const

defineProps<{
  preset: string
  eventType: string
  actorUserId: string
  subjectId: string
  limit: number
  loading: boolean
  exporting: boolean
  eventTypeOptions: string[]
}>()

const emit = defineEmits<{
  'update:preset': [value: string]
  'update:eventType': [value: string]
  'update:actorUserId': [value: string]
  'update:subjectId': [value: string]
  'update:limit': [value: number]
  refresh: []
  exportCsv: []
  exportJsonl: []
}>()

function applyPrefix(prefix: string) {
  emit('update:eventType', prefix)
}
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
      </div>
    </div>
    <div class="analytics-toolbar-row audit-prefix-chips">
      <span class="field-label">Rýchle filtre</span>
      <button
        v-for="chip in EVENT_PREFIX_CHIPS"
        :key="chip.prefix"
        type="button"
        class="btn btn-sm"
        :class="{ 'btn-primary': eventType === chip.prefix }"
        @click="applyPrefix(chip.prefix)"
      >
        {{ chip.label }}
      </button>
      <button
        v-if="eventType"
        type="button"
        class="btn btn-sm btn-ghost"
        @click="emit('update:eventType', '')"
      >
        Zrušiť typ
      </button>
    </div>
    <div class="analytics-toolbar-row audit-filters-row">
      <div class="audit-filter-field">
        <label class="field-label" for="audit-event-type">Typ udalosti</label>
        <input
          id="audit-event-type"
          list="audit-event-type-list"
          class="field-input"
          :value="eventType"
          placeholder="všetky"
          @input="emit('update:eventType', ($event.target as HTMLInputElement).value)"
        />
        <datalist id="audit-event-type-list">
          <option v-for="t in eventTypeOptions" :key="t" :value="t" />
        </datalist>
      </div>
      <div class="audit-filter-field">
        <label class="field-label" for="audit-actor">Actor (UUID)</label>
        <input
          id="audit-actor"
          class="field-input"
          :value="actorUserId"
          placeholder="voliteľné"
          @input="emit('update:actorUserId', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="audit-filter-field">
        <label class="field-label" for="audit-subject">Subject ID</label>
        <input
          id="audit-subject"
          class="field-input"
          :value="subjectId"
          placeholder="voliteľné"
          @input="emit('update:subjectId', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="audit-filter-field audit-filter-field--narrow">
        <label class="field-label" for="audit-limit">Limit</label>
        <select
          id="audit-limit"
          class="field-input analytics-select"
          :value="limit"
          @change="emit('update:limit', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
        </select>
      </div>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :disabled="loading"
        @click="emit('refresh')"
      >
        {{ loading ? 'Načítavam…' : 'Obnoviť' }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="exporting"
        @click="emit('exportCsv')"
      >
        {{ exporting ? 'Export…' : 'Export CSV' }}
      </button>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="exporting"
        @click="emit('exportJsonl')"
      >
        Export JSONL
      </button>
    </div>
  </div>
</template>

<style scoped>
.audit-prefix-chips {
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.audit-filters-row {
  align-items: flex-end;
}

.audit-filter-field {
  flex: 1;
  min-width: 140px;
}

.audit-filter-field--narrow {
  flex: 0 0 auto;
  min-width: 5rem;
}
</style>
