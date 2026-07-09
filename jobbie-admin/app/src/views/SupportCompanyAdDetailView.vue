<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import type { AdminCompanyAdDetail } from '../types/support'
import { fmtNum } from '../utils/analytics-format'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const loading = ref(true)
const error = ref<string | null>(null)
const ad = ref<AdminCompanyAdDetail | null>(null)
const message = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminCompanyAdDetail>(`/admin/company-ads/${id.value}`)
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    ad.value = null
    return
  }
  ad.value = res.data ?? null
}

async function unpublish() {
  const ok = await confirm({
    title: 'Skryť inzerát',
    message: 'Inzerát bude označený ako skrytý. Pokračovať?',
    confirmLabel: 'Skryť',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/company-ads/${id.value}/unpublish`, { method: 'POST' })
  message.value = res.ok ? 'Inzerát bol skrytý.' : res.body.slice(0, 120)
  if (res.ok) await load()
}

onMounted(() => void load())
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

    <AdminPageHeader title="Firemný inzerát" :subtitle="id" />

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-else-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else-if="ad" class="admin-section-card">
      <h2 class="m-0 mb-4 text-lg font-semibold text-slate-900">{{ ad.title || 'Bez názvu' }}</h2>
      <dl class="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt class="text-slate-500">Stav</dt>
        <dd class="m-0">{{ ad.status ?? '—' }}</dd>
        <dt class="text-slate-500">Vlastník</dt>
        <dd class="m-0">
          <RouterLink
            v-if="ad.owner_id"
            :to="{ name: 'support-user', params: { id: ad.owner_id } }"
            class="text-primary-600 hover:underline"
          >
            {{ ad.owner_id }}
          </RouterLink>
          <span v-else>—</span>
        </dd>
        <dt class="text-slate-500">Lokalita</dt>
        <dd class="m-0">{{ [ad.city, ad.region].filter(Boolean).join(', ') || '—' }}</dd>
        <dt class="text-slate-500">Kredity</dt>
        <dd class="m-0">{{ fmtNum(ad.credits_spent) }}</dd>
        <dt class="text-slate-500">Vytvorené</dt>
        <dd class="m-0">{{ ad.created_at }}</dd>
      </dl>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button
          v-if="ad.public_url"
          label="Verejná URL"
          severity="secondary"
          as="a"
          :href="ad.public_url"
          target="_blank"
          rel="noopener noreferrer"
        />
        <Button label="Skryť" @click="unpublish" />
      </div>
      <p v-if="message" class="m-0 mt-3 text-sm text-slate-500">{{ message }}</p>
    </section>
  </div>
</template>
