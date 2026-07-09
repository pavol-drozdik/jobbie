<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import { EVENT_PREFIX_CHIPS } from './audit-toolbar-config'

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

const presetOptions = [
  { label: '7 dní', value: '7d' },
  { label: '30 dní', value: '30d' },
  { label: '90 dní', value: '90d' },
]

const limitOptions = [
  { label: '50', value: 50 },
  { label: '100', value: 100 },
  { label: '200', value: 200 },
]

function applyPrefix(prefix: string) {
  emit('update:eventType', prefix)
}
</script>

<template>
  <div class="admin-section-card space-y-4">
    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium text-slate-700">Obdobie</span>
      <SelectButton
        :model-value="preset"
        :options="presetOptions"
        option-label="label"
        option-value="value"
        size="small"
        @update:model-value="emit('update:preset', $event as string)"
      />
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium text-slate-700">Rýchle filtre</span>
      <Button
        v-for="chip in EVENT_PREFIX_CHIPS"
        :key="chip.prefix"
        :label="chip.label"
        size="small"
        :severity="eventType === chip.prefix ? 'primary' : 'secondary'"
        @click="applyPrefix(chip.prefix)"
      />
      <Button
        v-if="eventType"
        label="Zrušiť typ"
        size="small"
        severity="secondary"
        text
        @click="emit('update:eventType', '')"
      />
    </div>

    <div class="flex flex-wrap items-end gap-3">
      <div class="min-w-[140px] flex-1">
        <label for="audit-event-type" class="mb-1 block text-sm font-medium text-slate-700">
          Typ udalosti
        </label>
        <InputText
          id="audit-event-type"
          list="audit-event-type-list"
          :model-value="eventType"
          placeholder="všetky"
          class="w-full"
          @update:model-value="emit('update:eventType', $event ?? '')"
        />
        <datalist id="audit-event-type-list">
          <option v-for="t in eventTypeOptions" :key="t" :value="t" />
        </datalist>
      </div>
      <div class="min-w-[140px] flex-1">
        <label for="audit-actor" class="mb-1 block text-sm font-medium text-slate-700">
          Actor (UUID)
        </label>
        <InputText
          id="audit-actor"
          :model-value="actorUserId"
          placeholder="voliteľné"
          class="w-full"
          @update:model-value="emit('update:actorUserId', $event ?? '')"
        />
      </div>
      <div class="min-w-[140px] flex-1">
        <label for="audit-subject" class="mb-1 block text-sm font-medium text-slate-700">
          Subject ID
        </label>
        <InputText
          id="audit-subject"
          :model-value="subjectId"
          placeholder="voliteľné"
          class="w-full"
          @update:model-value="emit('update:subjectId', $event ?? '')"
        />
      </div>
      <div class="w-24">
        <label for="audit-limit" class="mb-1 block text-sm font-medium text-slate-700">Limit</label>
        <Select
          id="audit-limit"
          :model-value="limit"
          :options="limitOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          @update:model-value="emit('update:limit', $event as number)"
        />
      </div>
      <Button
        :label="loading ? 'Načítavam…' : 'Obnoviť'"
        size="small"
        :loading="loading"
        @click="emit('refresh')"
      />
      <Button
        :label="exporting ? 'Export…' : 'Export CSV'"
        size="small"
        severity="secondary"
        :loading="exporting"
        @click="emit('exportCsv')"
      />
      <Button
        label="Export JSONL"
        size="small"
        severity="secondary"
        :loading="exporting"
        @click="emit('exportJsonl')"
      />
    </div>
  </div>
</template>
