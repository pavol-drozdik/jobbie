<template>
  <section class="w-full">
    <div
      v-if="!loading && rows.length > 0 && selectedIds.size === 0"
      class="mb-3 flex items-center gap-2.5 px-1"
    >
      <AppCheckbox
        id="applicants-select-all"
        :model-value="allSelected"
        :indeterminate="someSelected && !allSelected"
        :aria-label="S.applicantsColSelectAll"
        @update:model-value="(v) => emit('toggle-select-all', v)"
      />
      <label
        for="applicants-select-all"
        class="cursor-pointer font-dmSans text-sm font-medium text-black/60"
      >
        {{ S.applicantsColSelectAll }}
      </label>
    </div>

    <template v-if="loading">
      <div class="flex flex-col gap-4">
        <div
          v-for="i in 5"
          :key="`sk-${i}`"
          class="animate-pulse rounded-[20px] border border-black/[0.06] bg-white p-5 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]"
        >
          <div class="h-6 w-2/5 rounded bg-black/10" />
          <div class="mt-4 h-4 w-full rounded bg-black/10" />
          <div class="mt-4 flex gap-2">
            <div class="h-9 w-24 rounded-full bg-black/10" />
            <div class="h-9 w-24 rounded-full bg-black/10" />
          </div>
        </div>
      </div>
    </template>

    <div
      v-else-if="rows.length === 0"
      class="rounded-[20px] border border-black/[0.06] bg-white px-6 py-12 text-center shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)]"
    >
      <p class="m-0 font-dmSans text-base text-marketing-muted">{{ emptyMessage }}</p>
    </div>

    <div v-else class="flex flex-col gap-4">
      <ApplicantCard
        v-for="row in rows"
        :key="row.application_id"
        :row="row"
        :selected="selectedIds.has(row.application_id)"
        :status-updating="statusUpdatingIds.has(row.application_id)"
        @toggle-select="emit('toggle-select', row.application_id)"
        @open-profile="emit('open-profile', row)"
        @open-note="emit('open-note', row.application_id)"
        @invite="emit('invite', row)"
        @status-change="(s) => emit('status-change', row, s)"
        @download-error="(msg) => emit('download-error', msg)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { EmployerApplicantRow } from '~/types/employer-applicants'
import type { ApplicationStatus } from '~/utils/applicant-status'
import ApplicantCard from '~/components/applicants/ApplicantCard.vue'

const props = defineProps<{
  rows: EmployerApplicantRow[]
  loading: boolean
  selectedIds: Set<string>
  statusUpdatingIds: Set<string>
  emptyMessage: string
}>()

const emit = defineEmits<{
  'toggle-select': [id: string]
  'toggle-select-all': [checked: boolean]
  'open-profile': [row: EmployerApplicantRow]
  'open-note': [id: string]
  invite: [row: EmployerApplicantRow]
  'status-change': [row: EmployerApplicantRow, status: ApplicationStatus]
  'download-error': [message: string]
}>()

const allSelected = computed(
  () => props.rows.length > 0 && props.rows.every((r) => props.selectedIds.has(r.application_id)),
)
const someSelected = computed(() => props.rows.some((r) => props.selectedIds.has(r.application_id)))
</script>
