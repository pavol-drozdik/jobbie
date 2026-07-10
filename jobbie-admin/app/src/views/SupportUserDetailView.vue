<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { adminApi } from '../composables/adminApi'
import { useAdminAuth } from '../composables/adminAuth'
import { ADMIN_API_BASE_URL } from '../config/admin-api-url'
import { useConfirm } from '../composables/useConfirm'
import type { CookieConsentLogItem, CookieConsentLogResponse } from '../types/cookie-consent-log'
import type { AdminUserDetail } from '../types/users'
import type { ApplicationListItem, ChatRoomListItem, UserBillingSnapshot } from '../types/support'
import { fmtNum } from '../utils/analytics-format'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

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
const cookieConsentLog = ref<CookieConsentLogItem[]>([])
const cookieConsentLoading = ref(false)
const message = ref<string | null>(null)
const grantAmount = ref(10)
const grantReason = ref('')
const closePhrase = ref('')

async function loadCookieConsentLog() {
  cookieConsentLoading.value = true
  const res = await adminApi<CookieConsentLogResponse>('/admin/consent/cookie-log', {
    query: { user_id: id.value, limit: '20' },
  })
  cookieConsentLoading.value = false
  cookieConsentLog.value = res.ok ? (res.data?.items ?? []) : []
}

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
  void loadCookieConsentLog()
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

async function switchTab(next: string | number) {
  const key = String(next) as typeof tab.value
  tab.value = key
  if (key === 'billing' && !billing.value) await loadBilling()
  if (key === 'applications' && applications.value.length === 0) await loadApplications()
  if (key === 'chat' && chatRooms.value.length === 0) await loadChat()
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
  const base = ADMIN_API_BASE_URL
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
  <div class="admin-page">
    <Button
      label="← Podpora"
      severity="secondary"
      text
      size="small"
      class="mb-2"
      @click="router.push('/support')"
    />

    <AdminPageHeader title="Používateľ" :subtitle="id" />

    <Tabs :value="tab" @update:value="switchTab">
      <TabList>
        <Tab value="profile">Profil</Tab>
        <Tab value="billing">Billing</Tab>
        <Tab value="applications">Prihlášky</Tab>
        <Tab value="chat">Chat</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="profile">
          <Message v-if="error" severity="error" :closable="false" class="mt-4">{{ error }}</Message>

          <div v-else-if="loading" class="flex justify-center py-12">
            <ProgressSpinner />
          </div>

          <section v-else-if="detail" class="admin-section-card mt-4">
            <dl class="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt class="text-slate-500">E-mail</dt>
              <dd class="m-0">{{ detail.email ?? '—' }}</dd>
              <dt class="text-slate-500">Meno</dt>
              <dd class="m-0">{{ detail.display_name ?? detail.company_name ?? '—' }}</dd>
              <dt class="text-slate-500">Stav</dt>
              <dd class="m-0">{{ detail.account_status ?? '—' }}</dd>
              <dt class="text-slate-500">Kredity</dt>
              <dd class="m-0">{{ fmtNum(detail.credits) }}</dd>
            </dl>
            <div class="mt-4 flex flex-wrap items-center gap-2">
              <InputText
                :model-value="String(grantAmount)"
                type="number"
                class="w-24"
                @update:model-value="grantAmount = Number($event) || 0"
              />
              <InputText v-model="grantReason" class="min-w-48 flex-1" placeholder="Dôvod grantu" />
              <Button label="Grant kreditov" @click="grantCredits" />
            </div>
            <div class="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
              <Button label="Export GDPR (ZIP)" severity="secondary" @click="exportData" />
              <InputText v-model="closePhrase" class="min-w-48 flex-1" placeholder='Fráza "ZMAZAT UCET"' />
              <Button label="Zavrieť účet" severity="danger" @click="closeAccount" />
            </div>
            <p v-if="message" class="m-0 mt-3 text-sm text-slate-500">{{ message }}</p>

            <div class="mt-6 border-t border-slate-200 pt-4">
              <h2 class="admin-section-title">Cookie súhlas</h2>
              <div v-if="cookieConsentLoading" class="flex justify-center py-6">
                <ProgressSpinner />
              </div>
              <p v-else-if="cookieConsentLog.length === 0" class="m-0 text-sm text-slate-500">
                Žiadne záznamy cookie súhlasu.
              </p>
              <DataTable
                v-else
                :value="cookieConsentLog"
                size="small"
                striped-rows
                class="text-sm"
              >
                <Column field="recorded_at" header="Čas">
                  <template #body="{ data: row }">
                    <span class="mono">{{ row.recorded_at }}</span>
                  </template>
                </Column>
                <Column field="action" header="Akcia" />
                <Column header="Analytika">
                  <template #body="{ data: row }">{{ row.analytics ? 'áno' : 'nie' }}</template>
                </Column>
                <Column header="Marketing">
                  <template #body="{ data: row }">{{ row.marketing ? 'áno' : 'nie' }}</template>
                </Column>
                <Column header="Personalizácia">
                  <template #body="{ data: row }">{{ row.personalization ? 'áno' : 'nie' }}</template>
                </Column>
                <Column field="source" header="Zdroj" />
              </DataTable>
              <Button
                label="Otvoriť celý audit cookie súhlasu"
                severity="secondary"
                text
                size="small"
                class="mt-3"
                @click="router.push({ path: '/consent-log', query: { user_id: id } })"
              />
            </div>
          </section>
        </TabPanel>

        <TabPanel value="billing">
          <section class="admin-section-card mt-4">
            <p v-if="!billing" class="m-0 text-sm text-slate-500">Načítavam billing…</p>
            <template v-else>
              <p class="m-0 mb-4 text-sm text-slate-500">
                Zlyhané webhooky (7 dní): {{ billing.stripe.failed_webhooks_7d }} · Chýbajúce fulfillmenty:
                {{ billing.stripe.missing_fulfillments.length }}
              </p>
              <DataTable :value="billing.ledger.items" size="small" striped-rows class="text-sm">
                <Column header="Dátum">
                  <template #body="{ data: row }">{{ String(row.created_at ?? '') }}</template>
                </Column>
                <Column field="delta" header="Delta" />
                <Column field="reason" header="Dôvod" />
                <Column header="Typ">
                  <template #body="{ data: row }">{{ row.transaction_type ?? '—' }}</template>
                </Column>
              </DataTable>
            </template>
          </section>
        </TabPanel>

        <TabPanel value="applications">
          <section class="admin-section-card mt-4">
            <DataTable
              v-if="applications.length"
              :value="applications"
              size="small"
              striped-rows
              class="text-sm"
            >
              <Column header="Job">
                <template #body="{ data: row }">
                  <RouterLink
                    :to="{ name: 'support-job', params: { id: row.job_id } }"
                    class="text-primary-600 hover:underline"
                  >
                    {{ row.job_id }}
                  </RouterLink>
                </template>
              </Column>
              <Column field="status" header="Stav" />
              <Column field="created_at" header="Vytvorené" />
            </DataTable>
            <p v-else class="m-0 text-sm text-slate-500">Žiadne prihlášky.</p>
          </section>
        </TabPanel>

        <TabPanel value="chat">
          <section class="admin-section-card mt-4">
            <DataTable
              v-if="chatRooms.length"
              :value="chatRooms"
              size="small"
              striped-rows
              class="text-sm"
            >
              <Column header="Miestnosť">
                <template #body="{ data: row }">
                  <span class="mono">{{ row.id }}</span>
                </template>
              </Column>
              <Column header="Posledná správa">
                <template #body="{ data: row }">{{ row.last_message_at ?? '—' }}</template>
              </Column>
              <Column header="Typ">
                <template #body="{ data: row }">{{ row.last_message_type ?? '—' }}</template>
              </Column>
            </DataTable>
            <p v-else class="m-0 text-sm text-slate-500">Žiadne chat miestnosti.</p>
          </section>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
