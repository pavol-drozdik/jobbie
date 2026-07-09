<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import ToggleButton from 'primevue/togglebutton'
import { adminApi } from '../composables/adminApi'
import type { AdminInfrastructure } from '../types/infrastructure'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import VpsEnvironmentCard from '../components/infrastructure/VpsEnvironmentCard.vue'

const AUTO_REFRESH_MS = 60_000

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<AdminInfrastructure | null>(null)
const lastUpdated = ref<string | null>(null)
const autoRefresh = ref(true)

let refreshTimer: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminInfrastructure>('/admin/infrastructure')
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 400) || `HTTP ${res.status}`
    return
  }
  data.value = res.data ?? null
  lastUpdated.value = new Date().toLocaleString('sk-SK')
}

function startAutoRefresh() {
  stopAutoRefresh()
  if (!autoRefresh.value) return
  refreshTimer = setInterval(() => {
    void load()
  }, AUTO_REFRESH_MS)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function onAutoRefreshChange(value: boolean) {
  autoRefresh.value = value
  if (value) startAutoRefresh()
  else stopAutoRefresh()
}

onMounted(() => {
  void load()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader title="Infra" subtitle="Prevádzka VPS — staging a production">
      <template #actions>
        <ToggleButton
          :model-value="autoRefresh"
          on-label="Auto 60s"
          off-label="Auto 60s"
          on-icon="pi pi-check"
          off-icon="pi pi-times"
          size="small"
          @update:model-value="onAutoRefreshChange"
        />
        <Button
          label="Obnoviť"
          :loading="loading"
          size="small"
          @click="load()"
        />
      </template>
    </AdminPageHeader>

    <p v-if="lastUpdated" class="m-0 text-sm text-slate-500">
      Posledná aktualizácia: {{ lastUpdated }}
    </p>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-else-if="loading && !data" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <div v-if="data" class="grid gap-5 lg:grid-cols-2">
      <VpsEnvironmentCard
        v-for="env in data.environments"
        :key="env.id"
        :env="env"
        @changed="load"
      />
    </div>
  </div>
</template>
