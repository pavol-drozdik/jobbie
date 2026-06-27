<template>
  <article
    class="flex flex-col gap-3 rounded-[20px] border border-black/[0.06] bg-white p-4 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.1)] marketing:gap-4 marketing:p-5"
    :class="
      selected
        ? 'ring-2 ring-marketing-green/40 bg-marketing-mint/20'
        : ''
    "
  >
    <div class="flex min-w-0 items-start gap-3">
      <AppCheckbox
        class="mt-2"
        :model-value="selected"
        :aria-label="`${S.applicantsColSelectAll}: ${row.full_name}`"
        @update:model-value="emit('toggle-select')"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <button
            type="button"
            class="flex min-w-0 items-center gap-2.5 border-none bg-transparent p-0 text-left font-inherit"
            @click="emit('open-profile')"
          >
            <div
              class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-marketing-panel text-sm font-bold text-marketing-green"
            >
              <img
                v-if="row.photo_url"
                :src="row.photo_url"
                alt=""
                class="size-full object-cover"
                loading="lazy"
              >
              <span v-else>{{ initials(row.full_name) }}</span>
            </div>
            <span class="truncate font-dmSans text-lg font-extrabold text-black">{{ row.full_name }}</span>
          </button>
          <span
            :class="[
              'inline-flex shrink-0 rounded-full px-2.5 py-1 font-dmSans text-xs font-semibold whitespace-nowrap',
              statusBadgeClass(row.status),
            ]"
          >
            {{ statusLabel(row.status) }}
          </span>
        </div>

        <div class="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 font-dmSans text-[13px] text-black/55 marketing:text-sm">
          <span>
            <span class="font-semibold text-black/45">{{ S.applicantsColApplied }}:</span>
            {{ formatAppliedAt(row.applied_at) }}
          </span>
          <span class="text-black/25" aria-hidden="true">·</span>
          <span>
            <span class="font-semibold text-black/45">{{ S.applicantsColExperience }}:</span>
            {{ experienceLabel(row) }}
          </span>
          <span class="text-black/25" aria-hidden="true">·</span>
          <span>
            <span class="font-semibold text-black/45">{{ S.applicantsColAvailability }}:</span>
            {{ row.availability || '—' }}
          </span>
          <span class="text-black/25" aria-hidden="true">·</span>
          <span>
            <span class="font-semibold text-black/45">{{ S.applicantsColSalary }}:</span>
            {{ row.salary_display || '—' }}
          </span>
        </div>

        <div v-if="row.top_skills.length" class="mt-2 flex flex-wrap gap-1.5">
          <span
            v-for="skill in row.top_skills.slice(0, 5)"
            :key="skill"
            class="rounded-full bg-marketing-soft px-2.5 py-0.5 font-dmSans text-xs font-semibold text-black/70"
          >
            {{ skill }}
          </span>
          <span
            v-if="row.top_skills.length > 5"
            class="rounded-full bg-black/[0.06] px-2.5 py-0.5 font-dmSans text-xs font-semibold text-black/50"
          >
            +{{ row.top_skills.length - 5 }}
          </span>
        </div>

        <p
          v-if="row.message_preview?.trim()"
          class="mt-2 line-clamp-2 font-dmSans text-[13px] italic text-black/55"
        >
          „{{ row.message_preview.trim() }}”
        </p>
        <p
          v-if="row.has_note"
          class="mt-2 font-dmSans text-[13px] font-medium text-marketing-green"
        >
          {{ noteLabel(row) }}
        </p>
      </div>
    </div>

    <div
      class="flex flex-col gap-2 border-t border-black/[0.06] pt-3 marketing:flex-row marketing:flex-wrap marketing:items-center"
    >
      <div class="flex w-full gap-2 marketing:w-auto marketing:min-w-0">
        <NuxtLink
          v-if="row.chat_room_id"
          :to="ROUTES.chatRoom(row.chat_room_id)"
          :class="[APPLICANT_CARD_ACTION_ACCENT, 'min-w-0 flex-1 marketing:flex-initial']"
        >
          {{ S.applicantsMessage }}
        </NuxtLink>
        <button
          type="button"
          :class="[APPLICANT_CARD_ACTION_NEUTRAL, row.chat_room_id ? 'min-w-0 flex-1 marketing:flex-initial' : 'w-full marketing:w-auto']"
          @click="emit('open-note')"
        >
          {{ S.applicantsNote }}
        </button>
      </div>
      <div
        v-if="row.has_cv"
        class="flex w-full gap-2 marketing:w-auto marketing:flex-wrap"
      >
        <button
          v-if="row.has_cv"
          type="button"
          :class="[APPLICANT_CARD_ACTION_ACCENT, 'min-w-0 flex-1 marketing:flex-initial']"
          @click="emit('open-profile')"
        >
          {{ S.applicantsViewCv }}
        </button>
        <button
          v-if="row.has_cv"
          type="button"
          :class="[APPLICANT_CARD_ACTION_NEUTRAL, 'min-w-0 flex-1 marketing:flex-initial']"
          :disabled="pdfLoading"
          @click="onDownloadCv"
        >
          {{ pdfLoading ? S.cvDownloadPdfLoading : S.cvDownloadPdf }}
        </button>
      </div>
      <div
        class="flex w-full min-w-0 flex-col gap-2 marketing:ml-auto marketing:w-auto marketing:flex-row marketing:flex-wrap marketing:items-center"
      >
        <button
          v-if="showInvite"
          type="button"
          :class="[APPLICANT_CARD_ACTION_NEUTRAL, 'w-full marketing:w-auto']"
          @click="emit('invite')"
        >
          {{ S.applicantsInvite }}
        </button>
        <StatusDropdown
          :model-value="row.status"
          :exclude-status="row.status"
          :disabled="statusUpdating"
          @change="(s) => emit('status-change', s)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ROUTES } from '~/utils/app-routes'
import {
  APPLICANT_CARD_ACTION_ACCENT,
  APPLICANT_CARD_ACTION_NEUTRAL,
} from '~/utils/applicants-card-styles'
import { S } from '~/utils/strings'
import { STATUS_SK_LABELS, statusBadgeClass } from '~/utils/applicant-status'
import type { EmployerApplicantRow } from '~/types/employer-applicants'
import type { ApplicationStatus } from '~/utils/applicant-status'
import StatusDropdown from '~/components/applicants/StatusDropdown.vue'

const props = defineProps<{
  row: EmployerApplicantRow
  selected: boolean
  statusUpdating?: boolean
}>()

const emit = defineEmits<{
  'toggle-select': []
  'open-profile': []
  'open-note': []
  invite: []
  'status-change': [status: ApplicationStatus]
  'download-error': [message: string]
}>()

const { downloadApplicantCvPdf } = useEmployerApplicants()
const pdfLoading = ref(false)

async function onDownloadCv(): Promise<void> {
  if (pdfLoading.value) return
  pdfLoading.value = true
  const res = await downloadApplicantCvPdf(props.row.application_id)
  pdfLoading.value = false
  if (!res.ok) {
    emit('download-error', res.error ?? S.saveFailed)
  }
}

const showInvite = computed(() =>
  ['pending', 'reviewing'].includes(props.row.status),
)

function statusLabel(s: string): string {
  return STATUS_SK_LABELS[s as keyof typeof STATUS_SK_LABELS] ?? s
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]?.toUpperCase()).join('').slice(0, 2) || '?'
}

function formatAppliedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function experienceLabel(row: EmployerApplicantRow): string {
  if (row.experience_years == null) return '—'
  return `${row.experience_years} r.`
}

function noteLabel(row: EmployerApplicantRow): string {
  const preview = row.note_preview?.trim()
  if (preview) return preview.length > 80 ? `${preview.slice(0, 77)}…` : preview
  return S.applicantsNoteAdded
}
</script>
