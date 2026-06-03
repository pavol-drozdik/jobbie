<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="applicant-note-title"
      @click.self="close"
    >
      <div
        class="flex max-h-[min(85dvh,520px)] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-black/[0.08] px-5 py-4">
          <h2 id="applicant-note-title" class="m-0 truncate text-lg font-extrabold text-black">
            {{ applicantName || S.applicantsNote }}
          </h2>
          <button
            type="button"
            class="inline-flex size-10 items-center justify-center rounded-full text-black/60 hover:bg-black/5"
            :aria-label="S.chatAttachmentCloseModal"
            @click="close"
          >
            <AppIcon name="x" :size="22" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="loading" class="py-12 text-center text-sm text-black/45">{{ S.loading }}</div>
          <template v-else>
            <label class="block text-sm font-bold text-black" for="applicant-internal-note">
              {{ S.applicantsNote }}
            </label>
            <textarea
              id="applicant-internal-note"
              v-model="noteDraft"
              rows="6"
              class="mt-2 w-full resize-y rounded-2xl border border-black/10 bg-marketing-soft/40 px-4 py-3 font-dmSans text-sm text-black outline-none ring-marketing-green focus-visible:ring-2"
              :disabled="saving"
            />
            <p v-if="saveError" class="mt-2 text-sm text-red-700">{{ saveError }}</p>
          </template>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2 border-t border-black/[0.08] px-5 py-4">
          <AppButton variant="outline" size="md" :disabled="saving" @click="close">
            {{ S.cancel }}
          </AppButton>
          <AppButton size="md" :disabled="loading || saving" @click="save">
            {{ saving ? S.cvSaving : S.save }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'

const props = defineProps<{
  open: boolean
  applicationId: string | null
}>()

const emit = defineEmits<{
  close: []
  saved: [{ applicationId: string; note: string }]
}>()

const {
  fetchApplicantDetail,
  saveNote: persistNote,
  error: applicantsError,
} = useEmployerApplicants()

const applicantName = ref('')
const noteDraft = ref('')
const loading = ref(false)
const saving = ref(false)
const saveError = ref('')

function close(): void {
  emit('close')
}

async function load(): Promise<void> {
  if (!props.applicationId) return
  loading.value = true
  saveError.value = ''
  const detail = await fetchApplicantDetail(props.applicationId)
  applicantName.value = detail?.full_name ?? ''
  noteDraft.value = detail?.note ?? ''
  loading.value = false
}

async function save(): Promise<void> {
  if (!props.applicationId || saving.value) return
  saving.value = true
  saveError.value = ''
  const ok = await persistNote(props.applicationId, noteDraft.value)
  saving.value = false
  if (!ok) {
    saveError.value = applicantsError.value || S.saveFailed
    return
  }
  const trimmed = noteDraft.value.trim()
  emit('saved', { applicationId: props.applicationId, note: trimmed })
  emit('close')
}

watch(
  () => [props.open, props.applicationId] as const,
  ([open]) => {
    if (open) void load()
    else {
      saveError.value = ''
    }
  },
)
</script>
