<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import type { AdminJobDetail } from '../types/support'
import { fmtNum } from '../utils/analytics-format'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const loading = ref(true)
const error = ref<string | null>(null)
const job = ref<AdminJobDetail | null>(null)
const message = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminJobDetail>(`/admin/jobs/${id.value}`)
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    job.value = null
    return
  }
  job.value = res.data ?? null
}

async function unpublish() {
  const ok = await confirm({
    title: 'Stiahnuť ponuku',
    message: 'Ponuka bude označená ako neaktívna / koncept. Pokračovať?',
    confirmLabel: 'Stiahnuť',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/jobs/${id.value}/unpublish`, { method: 'POST' })
  message.value = res.ok ? 'Ponuka bola stiahnutá.' : res.body.slice(0, 120)
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

    <AdminPageHeader title="Ponuka" :subtitle="id" />

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-else-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else-if="job" class="admin-section-card">
      <h2 class="m-0 mb-4 text-lg font-semibold text-slate-900">{{ job.title || 'Bez názvu' }}</h2>
      <dl class="grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt class="text-slate-500">Stav</dt>
        <dd class="m-0">{{ job.status_label }}</dd>
        <dt class="text-slate-500">Vlastník</dt>
        <dd class="m-0">
          <RouterLink
            v-if="job.owner_id"
            :to="{ name: 'support-user', params: { id: job.owner_id } }"
            class="text-primary-600 hover:underline"
          >
            {{ job.owner_id }}
          </RouterLink>
          <span v-else>—</span>
        </dd>
        <dt class="text-slate-500">Kredity (publish)</dt>
        <dd class="m-0">{{ fmtNum(job.credits_spent) }}</dd>
        <dt class="text-slate-500">Vytvorené</dt>
        <dd class="m-0">{{ job.created_at }}</dd>
        <dt class="text-slate-500">Publikované</dt>
        <dd class="m-0">{{ job.published_at ?? '—' }}</dd>
      </dl>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button
          v-if="job.public_url"
          label="Verejná URL"
          severity="secondary"
          as="a"
          :href="job.public_url"
          target="_blank"
          rel="noopener noreferrer"
        />
        <Button label="Stiahnuť" @click="unpublish" />
      </div>
      <p v-if="message" class="m-0 mt-3 text-sm text-slate-500">{{ message }}</p>
    </section>
  </div>
</template>
