<script setup lang="ts">
import type { ContentReportTargetType } from '~/composables/useContentReport'
import {
  buildContentReportReason,
  CONTENT_REPORT_REASON_IDS,
  contentReportReasonLabel,
  type ContentReportReasonId,
} from '~/utils/content-report-reasons'

const props = defineProps<{
  targetType: ContentReportTargetType
  targetId: string
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { submitReport, reporting, error } = useContentReport()
const selectedReasonId = ref<ContentReportReasonId | ''>('')
const otherText = ref('')
const done = ref(false)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      done.value = false
      selectedReasonId.value = ''
      otherText.value = ''
      error.value = null
    }
  },
)

function closeDialog(): void {
  emit('update:open', false)
}

async function onSubmit(): Promise<void> {
  const reason = buildContentReportReason(selectedReasonId.value, otherText.value)
  if (!reason) {
    error.value =
      selectedReasonId.value === 'other'
        ? S.contentReportOtherMinLength
        : S.contentReportReasonRequired
    return
  }
  const sent = await submitReport({
    target_type: props.targetType,
    target_id: props.targetId,
    reason,
  })
  if (sent) {
    done.value = true
    selectedReasonId.value = ''
    otherText.value = ''
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4 font-dmSans antialiased"
      role="dialog"
      aria-modal="true"
      aria-labelledby="content-report-dialog-title"
      @click.self="closeDialog"
    >
      <div
        class="w-full max-w-md rounded-2xl border border-black/10 bg-white px-6 py-7 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:px-8"
        @click.stop
      >
        <h2
          id="content-report-dialog-title"
          class="m-0 text-center text-xl font-extrabold text-black"
        >
          {{ S.contentReportDialogTitle }}
        </h2>
        <p v-if="done" class="mt-4 text-center text-sm text-green-700">
          {{ S.contentReportSuccess }}
        </p>
        <template v-else>
          <p class="mt-3 text-center text-sm text-black/60">
            {{ S.contentReportDialogIntro }}
          </p>
          <fieldset class="mt-4 space-y-2">
            <legend class="sr-only">{{ S.contentReportDialogIntro }}</legend>
            <label
              v-for="reasonId in CONTENT_REPORT_REASON_IDS"
              :key="reasonId"
              class="flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors"
              :class="
                selectedReasonId === reasonId
                  ? 'border-marketing-green bg-marketing-green/5'
                  : 'border-black/10 hover:bg-black/[0.02]'
              "
            >
              <input
                v-model="selectedReasonId"
                type="radio"
                name="content-report-reason"
                class="mt-1 shrink-0"
                :value="reasonId"
              />
              <span class="text-sm font-medium text-black/85">
                {{ contentReportReasonLabel(reasonId) }}
              </span>
            </label>
          </fieldset>
          <textarea
            v-if="selectedReasonId === 'other'"
            v-model="otherText"
            rows="3"
            class="mt-3 w-full rounded-xl border border-gray-200 p-3 text-sm"
            :placeholder="S.contentReportOtherPlaceholder"
          />
          <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
          <div class="mt-5 flex justify-center gap-2">
            <AppButton variant="ghost" size="sm" @click="closeDialog">
              {{ S.cancel }}
            </AppButton>
            <AppButton variant="primary" size="sm" :disabled="reporting" @click="onSubmit">
              {{ S.contentReportSubmit }}
            </AppButton>
          </div>
        </template>
        <AppButton
          v-if="done"
          class="mt-5"
          variant="primary"
          size="sm"
          block
          @click="closeDialog"
        >
          {{ S.contentReportClose }}
        </AppButton>
      </div>
    </div>
  </Teleport>
</template>
