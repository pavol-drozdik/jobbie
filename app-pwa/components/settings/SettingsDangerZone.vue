<template>
  <div class="space-y-8 font-dmSans">
    <section>
      <h2 class="form-label mb-2">{{ S.settingsDangerExportSectionTitle }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-black/55">
        {{ S.settingsDangerExportHint }}
      </p>
      <AppButton to="/nastavenia/export-udajov" variant="outline" size="md" class="w-full sm:w-auto">
        {{ S.settingsDangerExportLink }}
      </AppButton>
    </section>

    <section
      class="rounded-[14px] border border-red-200 bg-red-50/50 p-4 sm:p-5"
      aria-labelledby="danger-delete-heading"
    >
      <div class="flex gap-3 sm:gap-4">
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"
          aria-hidden="true"
        >
          <AppIcon name="triangle-alert" :size="20" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="danger-delete-heading" class="form-label m-0 text-red-900">
            {{ S.settingsDangerDeleteSectionTitle }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-red-900/80">
            {{ S.settingsDangerWarning }}
          </p>
          <ul class="mt-3 space-y-1.5 text-sm leading-snug text-red-900/75">
            <li v-for="item in consequenceItems" :key="item" class="flex gap-2">
              <span class="shrink-0 text-red-400" aria-hidden="true">•</span>
              <span>{{ item }}</span>
            </li>
          </ul>
          <AppButton
            type="button"
            variant="danger"
            block
            class="mt-5 sm:w-auto sm:min-w-[12rem]"
            @click="openDeleteModal"
          >
            {{ S.settingsDeleteAccount }}
          </AppButton>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-0 font-dmSans antialiased sm:items-center sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-modal-title"
        @click.self="closeDeleteModal"
      >
        <div
          class="w-full max-w-md rounded-t-2xl border border-black/10 bg-white px-6 py-8 shadow-[0px_3px_6px_1px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:px-8 sm:py-7"
          @click.stop
        >
          <h2
            id="delete-account-modal-title"
            class="m-0 text-center text-xl font-extrabold leading-snug text-black"
          >
            {{ S.settingsDeleteModalTitle }}
          </h2>
          <p class="m-0 mt-4 text-center text-[15px] leading-relaxed text-black/55">
            {{ S.settingsDeleteModalDetail }}
          </p>
          <label
            :class="[labelClass, 'mt-6 block text-left']"
            for="delete-account-confirm-input"
          >
            {{ S.settingsDeleteConfirmLabel }}
          </label>
          <input
            id="delete-account-confirm-input"
            v-model="deleteConfirm"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :class="[dangerInputClass, 'mt-2']"
            :disabled="deleting"
            @keydown.enter.prevent="canConfirmDelete && confirmDelete()"
          >
          <p
            v-if="deleteErr"
            class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {{ deleteErr }}
          </p>
          <div class="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white px-5 text-[15px] font-semibold text-black/75 hover:bg-neutral-50 disabled:opacity-50 sm:flex-initial sm:min-w-[7.5rem]"
              :disabled="deleting"
              @click="closeDeleteModal"
            >
              {{ S.cancel }}
            </button>
            <button
              type="button"
              class="inline-flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-red-600 px-5 text-[15px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial sm:min-w-[7.5rem]"
              :disabled="!canConfirmDelete || deleting"
              @click="confirmDelete"
            >
              {{ deleting ? S.loading : S.settingsDeleteConfirmButton }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
// GDPR delete: typed phrase modal, step-up auth, POST /api/profiles/me/delete + signOut.
import { parseApiErrorMessage } from '~/utils/api-errors'
import { S } from '~/utils/strings'

const { signOut } = useAuth()
const { api } = useApi()
const { labelClass, dangerInputClass } = useSettingsFormStyles()
const {
  ensureRecentLoginForBilling,
  billingStepUpUserMessage,
  isStepUpRequiredResponse,
  tryRecoverFromStepUpRequired,
} = useBillingStepUp()

const consequenceItems = [
  S.settingsDangerConsequenceProfile,
  S.settingsDangerConsequenceCvs,
  S.settingsDangerConsequenceJobs,
  S.settingsDangerConsequenceSubscription,
  S.settingsDangerConsequenceLegal,
]

const showDeleteModal = ref(false)
const deleteConfirm = ref('')
const deleteErr = ref('')
const deleting = ref(false)

const canConfirmDelete = computed(
  () => deleteConfirm.value.trim() === S.settingsDeletePhrase,
)

function openDeleteModal(): void {
  deleteConfirm.value = ''
  deleteErr.value = ''
  showDeleteModal.value = true
}

function closeDeleteModal(): void {
  if (deleting.value) return
  showDeleteModal.value = false
  deleteConfirm.value = ''
  deleteErr.value = ''
}

async function confirmDelete(): Promise<void> {
  deleteErr.value = ''
  if (!canConfirmDelete.value) {
    deleteErr.value = S.settingsDeleteConfirmLabel
    return
  }

  const gate = await ensureRecentLoginForBilling()
  if (!gate.ok) {
    deleteErr.value = gate.message
    return
  }

  deleting.value = true
  try {
    let res = await api<{ message?: string | string[] }>('/api/profiles/me/delete', {
      method: 'POST',
    })
    if (!res.ok && isStepUpRequiredResponse(res) && (await tryRecoverFromStepUpRequired())) {
      res = await api<{ message?: string | string[] }>('/api/profiles/me/delete', {
        method: 'POST',
      })
    }
    if (!res.ok) {
      const stepUpMsg = await billingStepUpUserMessage(res)
      deleteErr.value = stepUpMsg || parseApiErrorMessage(res, S.settingsDeleteFailed)
      return
    }
    showDeleteModal.value = false
    deleteConfirm.value = ''
    await signOut()
    await navigateTo('/auth/login', { replace: true })
  } finally {
    deleting.value = false
  }
}
</script>
