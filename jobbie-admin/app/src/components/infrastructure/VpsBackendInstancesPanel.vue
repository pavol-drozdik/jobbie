<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { adminApi } from '../../composables/adminApi'
import { useConfirm } from '../../composables/useConfirm'
import type { VpsBackendsSummary } from '../../types/infrastructure'
import { formatAdminApiError } from '../../utils/format-admin-api-error'

const props = defineProps<{
  envId: 'staging' | 'production'
  enabled: boolean
  refreshAt?: string | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const { confirm } = useConfirm()
const loading = ref(false)
const acting = ref(false)
const error = ref<string | null>(null)
const summary = ref<VpsBackendsSummary | null>(null)

const canAdd = computed(() => {
  const s = summary.value
  if (!s?.mutations_allowed || s.deploy_lock) return false
  if (s.scale >= s.max_replicas) return false
  if (s.scale >= 1 && !s.redis_configured) return false
  return true
})

const canRemove = computed(
  () =>
    summary.value?.mutations_allowed === true &&
    !summary.value?.deploy_lock &&
    (summary.value?.scale ?? 1) > 1,
)

const addDisabledReason = computed(() => {
  if (!summary.value?.mutations_allowed) return null
  if (summary.value.deploy_lock) return 'Prebieha deploy na VPS.'
  if ((summary.value.scale ?? 0) >= (summary.value.max_replicas ?? 1)) {
    return 'Dosiahnutý maximálny počet inštancií pre tento VPS.'
  }
  if ((summary.value.scale ?? 0) >= 1 && !summary.value.redis_configured) {
    return 'Pred pridaním druhej inštancie nastavte REDIS_URL v .env.backend na VPS.'
  }
  return null
})

function barColorClass(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 75) return 'bg-amber-500'
  return 'bg-primary-500'
}

function barWidthStyle(percent: number | null): { width: string } {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0))
  return { width: `${clamped}%` }
}

async function loadSummary() {
  if (!props.enabled) {
    summary.value = null
    return
  }
  loading.value = true
  error.value = null
  const res = await adminApi<VpsBackendsSummary>(
    `/admin/infrastructure/${props.envId}/backends`,
  )
  loading.value = false
  if (!res.ok) {
    error.value = formatAdminApiError(res.status, res.body).message
    summary.value = null
    return
  }
  summary.value = res.data ?? null
}

async function runMutation(path: string, message: string) {
  const ok = await confirm({
    title: 'Potvrdiť zmenu',
    message,
    confirmLabel: 'Potvrdiť',
    cancelLabel: 'Zrušiť',
  })
  if (!ok) return

  acting.value = true
  error.value = null
  const res = await adminApi<VpsBackendsSummary>(path, { method: 'POST' })
  acting.value = false
  if (!res.ok) {
    error.value = formatAdminApiError(res.status, res.body).message
    return
  }
  summary.value = res.data ?? summary.value
  emit('changed')
}

async function scaleUp() {
  await runMutation(
    `/admin/infrastructure/${props.envId}/backends/scale-up`,
    `Pridať jednu Nest inštanciu na ${props.envId}?`,
  )
}

async function scaleDown() {
  await runMutation(
    `/admin/infrastructure/${props.envId}/backends/scale-down`,
    `Odstrániť jednu Nest inštanciu na ${props.envId}?`,
  )
}

async function restartInstance(name: string) {
  await runMutation(
    `/admin/infrastructure/${props.envId}/backends/${encodeURIComponent(name)}/restart`,
    `Reštartovať inštanciu ${name}?`,
  )
}

onMounted(() => {
  void loadSummary()
})

watch([() => props.enabled, () => props.refreshAt], () => {
  void loadSummary()
})
</script>

<template>
  <div class="mt-4">
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 class="m-0 text-sm font-semibold text-slate-600">Nest inštancie</h3>
      <div v-if="summary" class="flex flex-wrap items-center gap-1.5">
        <Tag
          :value="`Scale ${summary.scale} / max ${summary.max_replicas}`"
          severity="secondary"
        />
        <Tag
          v-if="summary.autoscale_enabled"
          value="Autoscale zapnutý"
          severity="warn"
        />
        <Tag
          v-if="summary.deploy_lock"
          value="Deploy lock"
          severity="danger"
        />
      </div>
    </div>

    <p v-if="!enabled" class="m-0 text-sm text-slate-500">
      Zoznam inštancií vyžaduje SSH na VPS.
    </p>
    <p v-else-if="loading && !summary" class="m-0 text-sm text-slate-500">
      Načítavam inštancie…
    </p>
    <Message v-else-if="error" severity="error" :closable="false" class="mb-2">
      {{ error }}
    </Message>

    <template v-else-if="summary">
      <Message
        v-if="summary.autoscale_enabled"
        severity="warn"
        :closable="false"
        class="mb-2"
      >
        Autoscale môže manuálnu zmenu prepísať do 5 minút.
      </Message>
      <Message
        v-if="addDisabledReason"
        severity="info"
        :closable="false"
        class="mb-2"
      >
        {{ addDisabledReason }}
      </Message>
      <Message
        v-if="!summary.mutations_allowed"
        severity="info"
        :closable="false"
        class="mb-2"
      >
        Pridávanie, odstraňovanie a reštart sú dostupné len pre super_admin.
      </Message>

      <DataTable
        :value="summary.instances"
        size="small"
        striped-rows
        class="text-sm"
      >
        <Column header="Inštancia">
          <template #body="{ data: row }">{{ row.name }}</template>
        </Column>
        <Column header="Stav">
          <template #body="{ data: row }">{{ row.status || '—' }}</template>
        </Column>
        <Column header="Health">
          <template #body="{ data: row }">{{ row.health || '—' }}</template>
        </Column>
        <Column header="CPU">
          <template #body="{ data: row }">
            {{ row.cpu_percent != null ? `${row.cpu_percent} %` : '—' }}
          </template>
        </Column>
        <Column header="RAM">
          <template #body="{ data: row }">
            <div class="flex min-w-[8rem] flex-col gap-1">
              <div class="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full transition-all duration-200"
                  :class="barColorClass(row.mem_percent ?? 0)"
                  :style="barWidthStyle(row.mem_percent)"
                />
              </div>
              <span class="text-xs text-slate-600">
                {{ row.mem_usage || '—' }}
              </span>
            </div>
          </template>
        </Column>
        <Column v-if="summary.mutations_allowed" header="Akcia">
          <template #body="{ data: row }">
            <Button
              label="Reštart"
              size="small"
              severity="secondary"
              outlined
              :disabled="acting || summary.deploy_lock"
              @click="restartInstance(row.name)"
            />
          </template>
        </Column>
      </DataTable>

      <div
        v-if="summary.mutations_allowed"
        class="mt-3 flex flex-wrap gap-2"
      >
        <Button
          label="+ Pridať inštanciu"
          size="small"
          :disabled="acting || !canAdd"
          @click="scaleUp"
        />
        <Button
          label="− Odstrániť inštanciu"
          size="small"
          severity="secondary"
          outlined
          :disabled="acting || !canRemove"
          @click="scaleDown"
        />
      </div>
    </template>
  </div>
</template>
