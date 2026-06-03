<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useAdminAuth } from '../composables/adminAuth'
import { useConfirm } from '../composables/useConfirm'
import type { AdminUserDetail } from '../types/users'
import type { ApplicationListItem, ChatRoomListItem, UserBillingSnapshot } from '../types/support'
import { fmtNum } from '../utils/analytics-format'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()
const { getAccessToken } = useAdminAuth()

const id = computed(() => String(route.params.id ?? ''))
const tab = ref<'profile' | 'billing' | 'applications' | 'chat'>('profile')
const loading = ref(true)
const error = ref<string | null>(null)
const detail = ref<AdminUserDetail | null>(null)
const billing = ref<UserBillingSnapshot | null>(null)
const applications = ref<ApplicationListItem[]>([])
const chatRooms = ref<ChatRoomListItem[]>([])
const message = ref<string | null>(null)
const grantAmount = ref(10)
const grantReason = ref('')
const closePhrase = ref('')

async function loadProfile() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminUserDetail>(`/admin/users/${id.value}`)
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    detail.value = null
    return
  }
  detail.value = res.data ?? null
}

async function loadBilling() {
  const res = await adminApi<UserBillingSnapshot>(`/admin/users/${id.value}/billing`)
  billing.value = res.ok ? (res.data ?? null) : null
}

async function loadApplications() {
  const res = await adminApi<{ items: ApplicationListItem[] }>('/admin/applications', {
    query: { user_id: id.value, limit: '50' },
  })
  applications.value = res.ok ? (res.data?.items ?? []) : []
}

async function loadChat() {
  const res = await adminApi<{ items: ChatRoomListItem[] }>('/admin/chat/rooms', {
    query: { user_id: id.value, limit: '50' },
  })
  chatRooms.value = res.ok ? (res.data?.items ?? []) : []
}

async function switchTab(next: typeof tab.value) {
  tab.value = next
  if (next === 'billing' && !billing.value) await loadBilling()
  if (next === 'applications' && applications.value.length === 0) await loadApplications()
  if (next === 'chat' && chatRooms.value.length === 0) await loadChat()
}

async function grantCredits() {
  const ok = await confirm({
    title: 'Pridať kredity',
    message: `Pridať ${grantAmount.value} kreditov?`,
    confirmLabel: 'Pridať',
  })
  if (!ok) return
  const res = await adminApi(`/admin/users/${id.value}/grant-credits`, {
    method: 'POST',
    body: { amount: grantAmount.value, reason: grantReason.value.trim() || 'Admin grant' },
  })
  message.value = res.ok
    ? `Kredity pridané. Zostatok: ${(res.data as { balance_after?: number })?.balance_after ?? '?'}.`
    : res.body.slice(0, 120)
  if (res.ok) {
    await loadProfile()
    billing.value = null
    if (tab.value === 'billing') await loadBilling()
  }
}

async function exportData() {
  const ok = await confirm({
    title: 'Export údajov',
    message: 'Stiahnuť ZIP export osobných údajov tohto účtu?',
    confirmLabel: 'Exportovať',
  })
  if (!ok) return
  const token = getAccessToken()
  const base =
    import.meta.env.VITE_ADMIN_API_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3099'
  const res = await fetch(`${base}/api/admin/users/${id.value}/export-data`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    message.value = `Export zlyhal: ${res.status}`
    return
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jobbie-export-${id.value}.zip`
  a.click()
  URL.revokeObjectURL(url)
  message.value = 'Export bol stiahnutý.'
}

async function closeAccount() {
  const ok = await confirm({
    title: 'Zavrieť účet',
    message: 'Trvalé zmazanie a anonymizácia účtu. Túto akciu nie je možné vrátiť.',
    confirmLabel: 'Zavrieť účet',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/users/${id.value}/close-account`, {
    method: 'POST',
    body: { confirm_phrase: closePhrase.value.trim() },
  })
  message.value = res.ok ? 'Účet bol zatvorený.' : res.body.slice(0, 200)
}

onMounted(() => void loadProfile())
</script>

<template>
  <div class="support-user">
    <header>
      <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/support')">
        ← Podpora
      </button>
      <h1 class="page-title">Používateľ</h1>
      <p class="page-subtitle mono">{{ id }}</p>
    </header>

    <nav class="tab-bar">
      <button
        type="button"
        class="tab"
        :class="{ 'tab--active': tab === 'profile' }"
        @click="switchTab('profile')"
      >
        Profil
      </button>
      <button
        type="button"
        class="tab"
        :class="{ 'tab--active': tab === 'billing' }"
        @click="switchTab('billing')"
      >
        Billing
      </button>
      <button
        type="button"
        class="tab"
        :class="{ 'tab--active': tab === 'applications' }"
        @click="switchTab('applications')"
      >
        Prihlášky
      </button>
      <button
        type="button"
        class="tab"
        :class="{ 'tab--active': tab === 'chat' }"
        @click="switchTab('chat')"
      >
        Chat
      </button>
    </nav>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <section v-else-if="tab === 'profile' && detail" class="section-card">
      <dl class="detail-dl">
        <dt>E-mail</dt>
        <dd>{{ detail.email ?? '—' }}</dd>
        <dt>Meno</dt>
        <dd>{{ detail.display_name ?? detail.company_name ?? '—' }}</dd>
        <dt>Stav</dt>
        <dd>{{ detail.account_status ?? '—' }}</dd>
        <dt>Kredity</dt>
        <dd>{{ fmtNum(detail.credits) }}</dd>
      </dl>
      <div class="grant-row">
        <input v-model.number="grantAmount" type="number" min="1" max="500" class="field-input" />
        <input v-model="grantReason" class="field-input" placeholder="Dôvod grantu" />
        <button type="button" class="btn btn-primary" @click="grantCredits">Grant kreditov</button>
      </div>
      <div class="danger-zone">
        <button type="button" class="btn btn-ghost" @click="exportData">Export GDPR (ZIP)</button>
        <input v-model="closePhrase" class="field-input" placeholder='Fráza "ZMAZAT UCET"' />
        <button type="button" class="btn btn-primary" @click="closeAccount">Zavrieť účet</button>
      </div>
      <p v-if="message" class="muted">{{ message }}</p>
    </section>

    <section v-else-if="tab === 'billing'" class="section-card">
      <p v-if="!billing" class="muted">Načítavam billing…</p>
      <template v-else>
        <p class="muted">
          Zlyhané webhooky (7 dní): {{ billing.stripe.failed_webhooks_7d }} · Chýbajúce fulfillmenty:
          {{ billing.stripe.missing_fulfillments.length }}
        </p>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Delta</th>
                <th>Dôvod</th>
                <th>Typ</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in billing.ledger.items" :key="String(row.id)">
                <td>{{ String(row.created_at ?? '') }}</td>
                <td>{{ row.delta }}</td>
                <td>{{ row.reason }}</td>
                <td>{{ row.transaction_type ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <section v-else-if="tab === 'applications'" class="section-card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Stav</th>
              <th>Vytvorené</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in applications" :key="a.id">
              <td>
                <RouterLink :to="{ name: 'support-job', params: { id: a.job_id } }">
                  {{ a.job_id }}
                </RouterLink>
              </td>
              <td>{{ a.status }}</td>
              <td>{{ a.created_at }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="applications.length === 0" class="muted">Žiadne prihlášky.</p>
    </section>

    <section v-else-if="tab === 'chat'" class="section-card">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Miestnosť</th>
              <th>Posledná správa</th>
              <th>Typ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in chatRooms" :key="r.id">
              <td class="mono">{{ r.id }}</td>
              <td>{{ r.last_message_at ?? '—' }}</td>
              <td>{{ r.last_message_type ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="chatRooms.length === 0" class="muted">Žiadne chat miestnosti.</p>
    </section>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  gap: 0.35rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.tab {
  border: 1px solid var(--g200);
  background: #fff;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
}

.tab--active {
  background: var(--g100);
  font-weight: 600;
}

.detail-dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.875rem;
}

.grant-row,
.danger-zone {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.danger-zone {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--g200);
}
</style>
