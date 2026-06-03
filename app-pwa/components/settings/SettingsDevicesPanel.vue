<template>
  <div>
    <button
      type="button"
      class="mb-3 w-full rounded-lg border px-3 py-2 text-sm font-semibold"
      style="border-color: var(--sand3)"
      :disabled="sessionBusy"
      @click="handleRevokeOtherSessions"
    >
      {{ S.settingsRevokeOthers }}
    </button>
    <p v-if="sessionsLoading" class="text-xs" style="color: var(--ink3)">{{ S.loading }}</p>
    <ul v-else-if="deviceRows.length" class="space-y-2 text-sm">
      <li
        v-for="d in deviceRows"
        :key="d.id"
        class="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
        style="border-color: var(--sand3)"
      >
        <div class="min-w-0">
          <p class="font-semibold" style="color: var(--ink)">
            {{ parseUserAgentLabel(d.user_agent) }}
            <span
              v-if="isCurrentDevice(d)"
              class="ml-1.5 rounded-full bg-marketing-mint px-2 py-0.5 text-[11px] font-bold text-marketing-green"
            >
              {{ S.settingsCurrentDevice }}
            </span>
          </p>
          <p class="mt-0.5 text-xs" style="color: var(--ink3)">
            {{ d.last_seen ? formatSeen(d.last_seen) : '' }}
          </p>
        </div>
        <button
          v-if="!isCurrentDevice(d)"
          type="button"
          class="shrink-0 text-xs font-semibold text-red-700 underline"
          @click="forgetDeviceRow(d.id)"
        >
          {{ S.settingsRevokeSession }}
        </button>
      </li>
    </ul>
    <p v-else class="text-xs" style="color: var(--ink3)">Žiadne záznamy zariadení.</p>
    <p v-if="revokeOthersOk" class="mt-2 text-xs text-marketing-green">{{ S.settingsOtherSessionsRevoked }}</p>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { parseUserAgentLabel } from '~/utils/parse-user-agent'
import { getOrCreateDeviceId } from '~/utils/device-id'

const { session } = useAuth()
const { api } = useApi()

type DeviceRow = {
  id: string
  device_id: string
  user_agent: string | null
  last_ip: string | null
  last_seen: string
  created_at: string
}

const sessionsLoading = ref(false)
const sessionBusy = ref(false)
const deviceRows = ref<DeviceRow[]>([])
const revokeOthersOk = ref(false)

const currentDeviceId = import.meta.client ? getOrCreateDeviceId() : ''

function isCurrentDevice(d: DeviceRow): boolean {
  return Boolean(currentDeviceId && d.device_id === currentDeviceId)
}

function formatSeen(iso: string): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

async function loadDeviceRows(): Promise<void> {
  if (!session.value?.access_token) {
    return
  }
  sessionsLoading.value = true
  try {
    const res = await api<{ items: DeviceRow[] }>('/api/auth/sessions')
    deviceRows.value = res.data?.items ?? []
  } finally {
    sessionsLoading.value = false
  }
}

async function handleRevokeOtherSessions(): Promise<void> {
  sessionBusy.value = true
  revokeOthersOk.value = false
  try {
    await api('/api/auth/sessions/revoke-others', { method: 'POST' })
    revokeOthersOk.value = true
    await loadDeviceRows()
  } finally {
    sessionBusy.value = false
  }
}

async function forgetDeviceRow(id: string): Promise<void> {
  await api(`/api/auth/sessions/${id}`, { method: 'DELETE' })
  await loadDeviceRows()
}

onMounted(() => {
  void loadDeviceRows()
})
</script>
