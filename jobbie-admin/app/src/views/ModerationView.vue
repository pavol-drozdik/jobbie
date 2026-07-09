<script setup lang="ts">
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type ApiResult } from '../composables/adminApi'
import { useAdminAuth } from '../composables/adminAuth'
import { useConfirm } from '../composables/useConfirm'
import { useModerationCount } from '../composables/useModerationCount'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import type { ContentReportItem } from '../types/moderation'
import { REPORT_RESOLUTION_CODES } from '../types/moderation'
import { formatAdminApiError } from '../utils/format-admin-api-error'

const router = useRouter()
const { confirm } = useConfirm()
const { signOut } = useAdminAuth()
const { refresh: refreshBadge } = useModerationCount()

const loading = ref(true)
const loadError = ref<string | null>(null)
const reports = ref<ContentReportItem[]>([])
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const needsReLogin = ref(false)
const actionLoading = ref<string | null>(null)
const resolutionCode = ref<string>('other')
const suspendReason = ref('')

const resolutionOptions = REPORT_RESOLUTION_CODES.map((code) => ({
  label: code,
  value: code,
}))

function applyApiError(status: number, body: string): void {
  const { message, hints } = formatAdminApiError(status, body)
  actionError.value = message
  needsReLogin.value = hints.needsReLogin
}

async function goReLogin() {
  await signOut()
  await router.push({ name: 'login', query: { redirect: '/moderation' } })
}

async function load() {
  loading.value = true
  loadError.value = null
  needsReLogin.value = false
  try {
    const res = await adminApi<{ items: ContentReportItem[] }>(
      '/admin/moderation/reports/open',
    )
    if (!res.ok) {
      const { message, hints } = formatAdminApiError(res.status, res.body)
      loadError.value = message
      needsReLogin.value = hints.needsReLogin
      reports.value = []
      return
    }
    reports.value = res.data?.items ?? []
    await refreshBadge()
  } finally {
    loading.value = false
  }
}

function reportBody() {
  return {
    resolution_code: resolutionCode.value,
  }
}

async function runAction(
  key: string,
  request: () => Promise<ApiResult<unknown>>,
  successMessage: string,
): Promise<boolean> {
  actionError.value = null
  actionSuccess.value = null
  needsReLogin.value = false
  actionLoading.value = key
  try {
    const res = await request()
    if (!res.ok) {
      applyApiError(res.status, res.body)
      return false
    }
    actionSuccess.value = successMessage
    await load()
    return true
  } finally {
    actionLoading.value = null
  }
}

async function claim(id: string) {
  await runAction(
    `claim-${id}`,
    () => adminApi(`/admin/moderation/reports/${id}/claim`, { method: 'POST' }),
    'Nahlásenie bolo prevzaté (claim).',
  )
}

async function dismiss(id: string) {
  const ok = await confirm({
    title: 'Zamietnuť nahlásenie',
    message: 'Označiť nahlásenie ako zamietnuté bez skrytia obsahu?',
    confirmLabel: 'Zamietnuť',
  })
  if (!ok) return
  await runAction(
    `dismiss-${id}`,
    () =>
      adminApi(`/admin/moderation/reports/${id}/dismiss`, {
        method: 'POST',
        body: reportBody(),
      }),
    'Nahlásenie bolo zamietnuté.',
  )
}

function hideConfirmMessage(targetType: string): string {
  if (targetType === 'company_profile') {
    return (
      'Skryje verejný profil firmy (public_profile_enabled = false). ' +
      'Nezabanuje prihlásenie — na pozastavenie účtu použite „Pozastaviť účet“.'
    )
  }
  return `Skryť / stiahnuť obsah (${targetType})? Táto akcia ovplyvní verejnú viditeľnosť.`
}

async function hideContent(id: string, targetType: string) {
  const ok = await confirm({
    title: 'Skryť obsah',
    message: hideConfirmMessage(targetType),
    confirmLabel: 'Skryť',
    danger: true,
  })
  if (!ok) return
  await runAction(
    `hide-${id}`,
    () =>
      adminApi(`/admin/moderation/reports/${id}/hide`, {
        method: 'POST',
        body: reportBody(),
      }),
    'Obsah bol skrytý a nahlásenie uzavreté.',
  )
}

async function suspendAccount(userId: string) {
  const ok = await confirm({
    title: 'Pozastaviť účet',
    message:
      `Naozaj pozastaviť účet ${userId}? Zablokuje prihlásenie v aplikácii ` +
      '(account_status = suspended).',
    confirmLabel: 'Pozastaviť',
    danger: true,
  })
  if (!ok) return
  const reason = suspendReason.value.trim()
  await runAction(
    `suspend-${userId}`,
    () =>
      adminApi(`/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: reason ? { reason } : {},
      }),
    'Účet bol pozastavený.',
  )
}

function canHide(targetType: string): boolean {
  return ['job_offer', 'company_profile', 'company_ad', 'banner_ad'].includes(targetType)
}

function openSupportTarget(r: ContentReportItem) {
  if (r.target_type === 'job_offer') {
    void router.push({ name: 'support-job', params: { id: r.target_id } })
    return
  }
  if (r.target_type === 'company_profile') {
    void router.push({ name: 'support-user', params: { id: r.target_id } })
    return
  }
  if (r.target_type === 'company_ad') {
    void router.push({ name: 'support-company-ad', params: { id: r.target_id } })
  }
}

async function copyUuid(id: string) {
  try {
    await navigator.clipboard.writeText(id)
    actionSuccess.value = 'UUID skopírované do schránky.'
  } catch {
    /* ignore */
  }
}

function openPublic(url: string | null) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => void load())
</script>

<template>
  <div class="admin-page max-w-4xl">
    <AdminPageHeader
      title="Moderácia"
      subtitle="Otvorené nahlásenia — najstaršie prvé. Skryť obsah ≠ pozastavenie účtu (pozri Účty)."
    />

    <section class="admin-section-card space-y-3">
      <div class="flex flex-col gap-2">
        <label for="resolution" class="text-sm font-medium text-slate-700">Kód riešenia</label>
        <Select
          id="resolution"
          v-model="resolutionCode"
          :options="resolutionOptions"
          option-label="label"
          option-value="value"
          class="w-full max-w-xs"
        />
      </div>
      <div
        v-if="reports.some((r) => r.target_type === 'company_profile')"
        class="flex flex-col gap-2"
      >
        <label for="suspend-reason" class="text-sm font-medium text-slate-700">
          Dôvod pozastavenia (voliteľné, profil firmy)
        </label>
        <InputText
          id="suspend-reason"
          v-model="suspendReason"
          placeholder="Porušenie pravidiel…"
          class="w-full"
        />
      </div>
    </section>

    <Message v-if="needsReLogin" severity="warn" :closable="false">
      <div class="space-y-2">
        <p class="m-0">Citlivé akcie vyžadujú čerstvé prihlásenie.</p>
        <Button label="Odhlásiť a prihlásiť znova" size="small" @click="goReLogin" />
      </div>
    </Message>

    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>
    <Message v-if="actionError" severity="error" :closable="false">{{ actionError }}</Message>
    <Message v-if="actionSuccess" severity="success" :closable="false">{{ actionSuccess }}</Message>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="r in reports"
        :key="r.id"
        class="admin-section-card"
        :class="r.escalated ? 'border-red-300 ring-1 ring-red-200' : ''"
      >
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <Tag :value="r.target_type" severity="secondary" />
          <Tag v-if="r.escalated" value=">24h" severity="danger" />
          <Tag v-if="r.claimed_by" value="claim" severity="info" />
          <span class="mono text-slate-500">{{ r.target_id }}</span>
        </div>
        <h3 class="m-0 text-base font-semibold text-slate-900">
          {{ r.preview_title || 'Bez názvu' }}
        </h3>
        <p v-if="r.preview_subtitle" class="m-0 mt-1 text-sm text-slate-600">
          {{ r.preview_subtitle }}
        </p>
        <p class="m-0 mt-2 text-sm text-slate-800">{{ r.reason }}</p>
        <p class="m-0 mt-2 text-xs text-slate-500">
          {{ r.created_at }} · {{ r.age_hours }}h
          <span v-if="r.reporter_user_id">
            · reporter
            <RouterLink
              :to="{ name: 'support-user', params: { id: r.reporter_user_id } }"
              class="text-primary-600 hover:underline"
            >
              {{ r.reporter_user_id }}
            </RouterLink>
          </span>
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button
            label="Claim"
            size="small"
            severity="secondary"
            :loading="actionLoading === `claim-${r.id}`"
            :disabled="!!actionLoading"
            @click="claim(r.id)"
          />
          <Button
            label="Zamietnuť"
            size="small"
            severity="secondary"
            :loading="actionLoading === `dismiss-${r.id}`"
            :disabled="!!actionLoading"
            @click="dismiss(r.id)"
          />
          <Button
            v-if="canHide(r.target_type)"
            label="Skryť obsah"
            size="small"
            severity="secondary"
            :loading="actionLoading === `hide-${r.id}`"
            :disabled="!!actionLoading"
            :title="
              r.target_type === 'company_profile'
                ? 'Skryje verejný profil, nezabanuje prihlásenie'
                : undefined
            "
            @click="hideContent(r.id, r.target_type)"
          />
          <Button
            v-if="r.target_type === 'company_profile'"
            label="Pozastaviť účet"
            size="small"
            severity="danger"
            outlined
            :loading="actionLoading === `suspend-${r.target_id}`"
            :disabled="!!actionLoading"
            @click="suspendAccount(r.target_id)"
          />
          <Button
            v-if="
              r.target_type === 'job_offer' ||
              r.target_type === 'company_profile' ||
              r.target_type === 'company_ad'
            "
            label="Podpora"
            size="small"
            severity="secondary"
            @click="openSupportTarget(r)"
          />
          <Button
            label="Kopírovať UUID"
            size="small"
            severity="secondary"
            text
            @click="copyUuid(r.target_id)"
          />
          <Button
            v-if="r.public_url"
            label="Otvoriť"
            size="small"
            @click="openPublic(r.public_url)"
          />
        </div>
      </article>
      <p v-if="reports.length === 0" class="text-sm text-slate-500">Žiadne otvorené nahlásenia.</p>
    </div>
  </div>
</template>
