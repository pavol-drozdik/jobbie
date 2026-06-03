<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="'Detail životopisu'"
      @click.self="close"
    >
      <div
        class="flex max-h-[min(92dvh,900px)] w-full max-w-[720px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]"
      >
        <div class="flex shrink-0 items-center justify-between border-b border-black/[0.08] px-5 py-4">
          <h2 class="m-0 truncate text-lg font-extrabold text-black">{{ headerTitle }}</h2>
          <button
            type="button"
            class="inline-flex size-10 items-center justify-center rounded-full text-black/60 hover:bg-black/5"
            aria-label="Zavrieť"
            @click="close"
          >
            <AppIcon name="x" :size="22" />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="loading" class="flex flex-col items-center gap-3 py-16">
            <span
              class="size-9 animate-spin rounded-full border-2 border-marketing-green border-t-transparent"
              aria-hidden="true"
            />
            <p class="m-0 text-sm text-black/45">Načítavam životopis…</p>
          </div>
          <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
          <template v-else-if="detail">
            <div v-if="detail.cv.photo_url" class="mb-4 flex justify-center">
              <img
                :src="String(detail.cv.photo_url)"
                alt=""
                class="max-h-40 rounded-2xl object-contain"
                width="200"
                height="200"
                loading="lazy"
              >
            </div>
            <section class="mb-6">
              <h3 class="mt-0 text-base font-bold text-black/80">{{ S.cvDbContactSectionTitle }}</h3>
              <template v-if="contactsVisible">
                <ul class="m-0 list-none space-y-2 p-0 text-sm text-black/75">
                  <li v-if="contactEmail">
                    <span class="font-semibold text-black">E-mail:</span>
                    <a :href="`mailto:${contactEmail}`" class="text-marketing-green hover:underline">{{ contactEmail }}</a>
                  </li>
                  <li v-if="contactPhone">
                    <span class="font-semibold text-black">Telefón:</span>
                    <a :href="`tel:${contactPhone}`" class="text-marketing-green hover:underline">{{ contactPhone }}</a>
                  </li>
                  <li v-if="contactLinkedinHref">
                    <span class="font-semibold text-black">LinkedIn:</span>
                    <a
                      :href="contactLinkedinHref"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-marketing-green hover:underline break-all"
                    >{{ contactLinkedinDisplay }}</a>
                  </li>
                </ul>
                <p
                  v-if="!contactEmail && !contactPhone && !contactLinkedinHref"
                  class="m-0 text-sm text-black/55"
                >
                  {{ S.cvDbContactNoneAfterUnlock }}
                </p>
              </template>
              <template v-else>
                <p class="m-0 mb-3 text-sm leading-relaxed text-black/55">
                  {{ S.cvDbContactLockedHint }}
                </p>
                <AppButton
                  variant="outline"
                  size="md"
                  class="min-h-11"
                  :disabled="unlockLoading || chatLoading || pdfLoading"
                  @click="onUnlockContact"
                >
                  {{ unlockLoading ? S.cvUnlockLoading : S.cvUnlockLabel }}
                </AppButton>
              </template>
            </section>
            <section v-if="aboutText" class="mb-6">
              <h3 class="mt-0 text-base font-bold text-black/80">O mne</h3>
              <p class="whitespace-pre-wrap text-[15px] leading-relaxed text-black/70">{{ aboutText }}</p>
            </section>
            <section v-if="detail.experience?.length" class="mb-6">
              <h3 class="text-base font-bold text-black/80">Prax</h3>
              <ul class="m-0 list-none space-y-3 p-0">
                <li
                  v-for="e in detail.experience"
                  :key="e.id"
                  class="rounded-xl border border-black/[0.06] bg-marketing-soft/40 px-3 py-2.5"
                >
                  <div class="font-bold text-black">{{ e.position }}</div>
                  <div class="text-sm text-black/60">{{ e.company }}</div>
                  <div class="mt-1 text-xs text-black/45">{{ formatRange(e.start_date, e.end_date, e.current) }}</div>
                  <p v-if="e.description" class="mt-2 whitespace-pre-wrap text-sm text-black/65">{{ e.description }}</p>
                </li>
              </ul>
            </section>
            <section v-if="detail.education?.length" class="mb-6">
              <h3 class="text-base font-bold text-black/80">Vzdelanie</h3>
              <ul class="m-0 list-none space-y-2 p-0">
                <li v-for="ed in detail.education" :key="ed.id" class="text-sm text-black/75">
                  <span class="font-semibold text-black">{{ ed.school }}</span>
                  <span v-if="ed.degree || ed.field"> — {{ [ed.degree, ed.field].filter(Boolean).join(', ') }}</span>
                </li>
              </ul>
            </section>
            <section v-if="detail.skills?.length" class="mb-6">
              <h3 class="text-base font-bold text-black/80">Zručnosti</h3>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="s in detail.skills"
                  :key="s.id"
                  class="inline-flex rounded-full bg-marketing-soft px-3 py-1 text-sm font-medium text-black/80"
                >{{ s.skill_name }}</span>
              </div>
            </section>
            <section v-if="detail.languages?.length" class="mb-6">
              <h3 class="text-base font-bold text-black/80">Jazyky</h3>
              <ul class="m-0 list-none p-0">
                <li v-for="l in detail.languages" :key="l.id" class="text-sm text-black/75">
                  {{ l.language }}<span v-if="l.level" class="text-black/50"> — {{ l.level }}</span>
                </li>
              </ul>
            </section>
            <section v-if="detail.certifications?.length" class="mb-6">
              <h3 class="text-base font-bold text-black/80">Certifikáty</h3>
              <ul class="m-0 list-none space-y-1 p-0 text-sm text-black/75">
                <li v-for="c in detail.certifications" :key="c.id">{{ c.name }}</li>
              </ul>
            </section>
            <div v-if="chatPickerApps.length" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
              <p class="m-0 mb-2 text-sm font-semibold text-amber-950">Vyberte prihlášku na chat:</p>
              <div class="flex flex-col gap-2">
                <button
                  v-for="a in chatPickerApps"
                  :key="a.id"
                  type="button"
                  class="rounded-lg border border-amber-200 bg-white px-3 py-2 text-left text-sm font-medium text-black hover:bg-amber-100/80"
                  @click="selectApplicationAndOpenChat(a.id)"
                >
                  {{ a.job_title || 'Ponuka' }} <span class="text-black/45">({{ a.status }})</span>
                </button>
              </div>
            </div>
            <p v-if="chatError" class="text-sm text-red-600">{{ chatError }}</p>
          </template>
        </div>
        <div
          class="flex shrink-0 flex-wrap gap-2 border-t border-black/[0.08] bg-marketing-soft/30 px-5 py-4"
        >
          <AppButton
            variant="primary"
            size="md"
            class="min-h-11 flex-1 min-[480px]:flex-none"
            :disabled="chatLoading || pdfLoading || unlockLoading"
            @click="onContact"
          >
            {{ chatLoading ? '…' : 'Kontaktovať kandidáta' }}
          </AppButton>
          <AppButton
            variant="outline"
            size="md"
            class="min-h-11 flex-1 min-[480px]:flex-none"
            :disabled="pdfLoading || chatLoading || unlockLoading || !cvId"
            @click="onDownloadPdf"
          >
            {{ pdfLoading ? S.cvDownloadPdfLoading : S.cvDownloadPdf }}
          </AppButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Contact fields shown only when API includes them (unlock or show_contact_details); UI mirrors GDPR redaction.
import type { CvEmployerAggregate, CvEmployerOpenChatApplication } from '~/types/employer-cv-database'
import { ROUTES } from '~/utils/app-routes'
import { S } from '~/utils/strings'
import { sanitizeExternalHref } from '~/utils/safe-navigation'
import { insufficientCreditsUserMessage } from '~/utils/api-errors'
import { CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE } from '~/utils/billing-errors'

const props = withDefaults(
  defineProps<{
    open: boolean
    cvId: string | null
    /** When opening from list "Kontaktovať" after open-chat returned multiple applications. */
    initialChatApplications?: CvEmployerOpenChatApplication[] | null
  }>(),
  { initialChatApplications: null },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { fetchDetail, postUnlockContact, postOpenChat, downloadCvPdf } =
  useEmployerCvDatabase()
const router = useRouter()

const loading = ref(false)
const loadError = ref<string | null>(null)
const detail = ref<CvEmployerAggregate | null>(null)
const chatLoading = ref(false)
const chatError = ref<string | null>(null)
const pdfLoading = ref(false)
const unlockLoading = ref(false)
const chatPickerApps = ref<CvEmployerOpenChatApplication[]>([])

const headerTitle = computed(() => {
  const c = detail.value?.cv
  if (!c) return 'Životopis'
  const t = (c.display_title as string | undefined) ?? (c.cv_title as string | undefined) ?? ''
  return t.trim() || 'Životopis'
})

const aboutText = computed(() => {
  const raw = detail.value?.cv?.about_me
  return typeof raw === 'string' && raw.trim() ? raw.trim() : ''
})

const contactsVisible = computed(() => detail.value?.cv?.show_contact_details === true)

const contactEmail = computed(() => {
  const v = detail.value?.cv?.email
  return typeof v === 'string' && v.trim() ? v.trim() : ''
})

const contactPhone = computed(() => {
  const v = detail.value?.cv?.phone
  return typeof v === 'string' && v.trim() ? v.trim() : ''
})

const contactLinkedinRaw = computed(() => {
  const v = detail.value?.cv?.linkedin_url
  return typeof v === 'string' && v.trim() ? v.trim() : ''
})
const contactLinkedinHref = computed(() =>
  contactLinkedinRaw.value ? sanitizeExternalHref(contactLinkedinRaw.value) : null,
)
const contactLinkedinDisplay = computed(() => contactLinkedinRaw.value)

async function reloadDetail(): Promise<boolean> {
  if (!props.cvId) return false
  const res = await fetchDetail(props.cvId)
  if (!res.ok || !res.data) {
    loadError.value = res.error ?? 'Nepodarilo sa načítať detail'
    detail.value = null
    return false
  }
  detail.value = res.data
  return true
}

function resolveActionError(
  res: { error?: string; insufficientCredits?: boolean; quotaExceeded?: boolean },
  fallback: string,
): string {
  if (res.insufficientCredits) return insufficientCreditsUserMessage()
  if (res.quotaExceeded) return CV_MONTHLY_QUOTA_EXCEEDED_MESSAGE
  return res.error ?? fallback
}

watch(
  () => [props.open, props.cvId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || !id) {
      detail.value = null
      loadError.value = null
      chatPickerApps.value = []
      chatError.value = null
      return
    }
    const prefetched = props.initialChatApplications?.length
      ? [...props.initialChatApplications]
      : []
    chatPickerApps.value = prefetched
    chatError.value = null
    loading.value = true
    loadError.value = null
    const res = await fetchDetail(id)
    loading.value = false
    if (!res.ok || !res.data) {
      loadError.value = res.error ?? 'Nepodarilo sa načítať detail'
      detail.value = null
      return
    }
    detail.value = res.data
  },
  { immediate: true },
)

function close(): void {
  emit('update:open', false)
}

function formatRange(
  start: string | null,
  end: string | null,
  current: boolean,
): string {
  if (current) {
    return `${formatDate(start)} — súčasnosť`
  }
  return `${formatDate(start)} — ${formatDate(end)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

async function onUnlockContact(): Promise<void> {
  if (!props.cvId) return
  chatError.value = null
  unlockLoading.value = true
  const unlockRes = await postUnlockContact(props.cvId)
  unlockLoading.value = false
  if (!unlockRes.ok) {
    chatError.value = resolveActionError(unlockRes, 'Nepodarilo sa odomknúť kontakt')
    return
  }
  loading.value = true
  await reloadDetail()
  loading.value = false
}

async function onContact(): Promise<void> {
  if (!props.cvId) return
  chatError.value = null
  chatPickerApps.value = []
  chatLoading.value = true
  const res = await postOpenChat(props.cvId)
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = resolveActionError(res, 'Chyba')
    return
  }
  if (!res.data) {
    chatError.value = 'Prázdna odpoveď'
    return
  }
  if ('room_id' in res.data) {
    emit('update:open', false)
    await router.push(ROUTES.chatRoom(res.data.room_id))
    return
  }
  chatPickerApps.value = res.data.applications ?? []
}

async function onDownloadPdf(): Promise<void> {
  if (!props.cvId) return
  chatError.value = null
  pdfLoading.value = true
  const res = await downloadCvPdf(props.cvId)
  pdfLoading.value = false
  if (!res.ok) {
    chatError.value = resolveActionError(res, 'Nepodarilo sa stiahnuť PDF')
  }
}

async function selectApplicationAndOpenChat(applicationId: string): Promise<void> {
  if (!props.cvId) return
  chatError.value = null
  chatLoading.value = true
  const res = await postOpenChat(props.cvId, { application_id: applicationId })
  chatLoading.value = false
  if (!res.ok) {
    chatError.value = resolveActionError(res, 'Chyba')
    return
  }
  if (res.data && 'room_id' in res.data) {
    chatPickerApps.value = []
    emit('update:open', false)
    await router.push(ROUTES.chatRoom(res.data.room_id))
  }
}
</script>
