<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, type ApiResult } from '../composables/adminApi'
import { useAdminAuth } from '../composables/adminAuth'
import { useConfirm } from '../composables/useConfirm'
import { useModerationCount } from '../composables/useModerationCount'
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
  <div class="moderation-page">
    <header>
      <h1 class="page-title">Moderácia</h1>
      <p class="page-subtitle">
        Otvorené nahlásenia — najstaršie prvé. Skryť obsah ≠ pozastavenie účtu (pozri Účty).
      </p>
    </header>

    <section class="section-card moderation-toolbar">
      <label class="field-label" for="resolution">Kód riešenia</label>
      <select id="resolution" v-model="resolutionCode" class="field-input">
        <option v-for="code in REPORT_RESOLUTION_CODES" :key="code" :value="code">
          {{ code }}
        </option>
      </select>
      <label
        v-if="reports.some((r) => r.target_type === 'company_profile')"
        class="field-label"
        for="suspend-reason"
        style="margin-top: 0.75rem"
      >
        Dôvod pozastavenia (voliteľné, profil firmy)
      </label>
      <input
        v-if="reports.some((r) => r.target_type === 'company_profile')"
        id="suspend-reason"
        v-model="suspendReason"
        class="field-input"
        placeholder="Porušenie pravidiel…"
      />
    </section>

    <div v-if="needsReLogin" class="section-card moderation-relogin">
      <p>Citlivé akcie vyžadujú čerstvé prihlásenie s MFA.</p>
      <button type="button" class="btn btn-primary btn-sm" @click="goReLogin">
        Odhlásiť a prihlásiť znova
      </button>
    </div>

    <p v-if="loadError" class="error card">{{ loadError }}</p>
    <p v-if="actionError" class="error card">{{ actionError }}</p>
    <p v-if="actionSuccess" class="success card">{{ actionSuccess }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <div v-else class="moderation-list">
      <article
        v-for="r in reports"
        :key="r.id"
        class="section-card moderation-card"
        :class="{ 'moderation-card--escalated': r.escalated }"
      >
        <div class="moderation-card-head">
          <span class="badge">{{ r.target_type }}</span>
          <span v-if="r.escalated" class="sla-badge" title="Viac ako 24 hodín"> &gt;24h </span>
          <span v-if="r.claimed_by" class="badge badge-muted">claim</span>
          <span class="mono moderation-id">{{ r.target_id }}</span>
        </div>
        <h3 class="moderation-preview-title">
          {{ r.preview_title || 'Bez názvu' }}
        </h3>
        <p v-if="r.preview_subtitle" class="moderation-preview-sub">
          {{ r.preview_subtitle }}
        </p>
        <p class="moderation-reason">{{ r.reason }}</p>
        <p class="muted moderation-meta">
          {{ r.created_at }} · {{ r.age_hours }}h
          <span v-if="r.reporter_user_id">
            · reporter
            <RouterLink :to="{ name: 'support-user', params: { id: r.reporter_user_id } }">
              {{ r.reporter_user_id }}
            </RouterLink>
          </span>
        </p>
        <div class="moderation-actions">
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!!actionLoading"
            @click="claim(r.id)"
          >
            {{ actionLoading === `claim-${r.id}` ? '…' : 'Claim' }}
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!!actionLoading"
            @click="dismiss(r.id)"
          >
            {{ actionLoading === `dismiss-${r.id}` ? '…' : 'Zamietnuť' }}
          </button>
          <button
            v-if="canHide(r.target_type)"
            type="button"
            class="btn btn-ghost btn-sm"
            :disabled="!!actionLoading"
            :title="
              r.target_type === 'company_profile'
                ? 'Skryje verejný profil, nezabanuje prihlásenie'
                : undefined
            "
            @click="hideContent(r.id, r.target_type)"
          >
            {{ actionLoading === `hide-${r.id}` ? '…' : 'Skryť obsah' }}
          </button>
          <button
            v-if="r.target_type === 'company_profile'"
            type="button"
            class="btn btn-ghost btn-sm btn-danger-outline"
            :disabled="!!actionLoading"
            @click="suspendAccount(r.target_id)"
          >
            {{ actionLoading === `suspend-${r.target_id}` ? '…' : 'Pozastaviť účet' }}
          </button>
          <button
            v-if="
              r.target_type === 'job_offer' ||
              r.target_type === 'company_profile' ||
              r.target_type === 'company_ad'
            "
            type="button"
            class="btn btn-ghost btn-sm"
            @click="openSupportTarget(r)"
          >
            Podpora
          </button>
          <button type="button" class="btn btn-ghost btn-sm" @click="copyUuid(r.target_id)">
            Kopírovať UUID
          </button>
          <button
            v-if="r.public_url"
            type="button"
            class="btn btn-primary btn-sm"
            @click="openPublic(r.public_url)"
          >
            Otvoriť
          </button>
        </div>
      </article>
      <p v-if="reports.length === 0" class="muted">Žiadne otvorené nahlásenia.</p>
    </div>
  </div>
</template>

<style scoped>
.moderation-page {
  max-width: 900px;
}

.moderation-toolbar {
  margin-bottom: 1rem;
}

.moderation-relogin {
  margin-bottom: 1rem;
  background: #fef3c7;
  border-color: #f59e0b;
}

.moderation-relogin p {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
}

.success.card {
  background: #ecfdf5;
  border-color: #10b981;
  color: #065f46;
}

.moderation-list {
  display: grid;
  gap: 1rem;
}

.moderation-card--escalated {
  border-color: var(--danger);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--danger) 35%, transparent);
}

.sla-badge {
  background: var(--danger);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.badge-muted {
  background: var(--g200);
  color: var(--g700);
}

.moderation-card-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  flex-wrap: wrap;
}

.moderation-id {
  font-size: 0.75rem;
  color: var(--ink3);
}

.moderation-preview-title {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.moderation-preview-sub {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--ink2);
}

.moderation-reason {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}

.moderation-meta {
  font-size: 0.75rem;
}

.moderation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.75rem;
}

.btn-danger-outline {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 40%, transparent);
}
</style>
